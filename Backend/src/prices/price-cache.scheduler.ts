// src/prices/price-cache.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { RedisService } from '@/cache/redis.service';

@Injectable()
export class PriceCacheScheduler {
  private readonly log = new Logger(PriceCacheScheduler.name);
  private static readonly TTL_7D = 7 * 24 * 60 * 60;
  private static readonly TTL_1D = 24 * 60 * 60;

  constructor(
    private readonly ds: DataSource,
    private readonly redis: RedisService,
  ) {}

  @Cron('0 */5 * * * *') // 매 5분마다 실행 (정각)
  async syncPriceCache(): Promise<void> {
    const runId = Date.now().toString(36);
    this.log.log(`🔄 [${runId}] PriceCacheScheduler start`);

    try {
      const snapshots = await this.fetchRecentSnapshots();

      if (snapshots.length === 0) {
        this.log.debug(`ℹ️ [${runId}] No snapshots to sync`);
        await this.updateHeartbeat();
        await this.cleanupOldData();
        return;
      }

      this.log.debug(`📊 [${runId}] Syncing ${snapshots.length} snapshots`);

      let writeCount = 0;
      let changeCount = 0;

      for (const snap of snapshots) {
        const changed = await this.syncToRedis(snap);
        writeCount++;
        if (changed) changeCount++;
      }

      await this.updateMetrics(writeCount, changeCount);
      await this.updateHeartbeat();
      await this.cleanupOldData();

      this.log.log(`✅ [${runId}] Done: batch=${writeCount} changes=${changeCount} window=7d`);
    } catch (error) {
      this.log.error(`❌ [${runId}] Sync failed: ${(error as Error).message}`);
      if ((error as Error).stack) {
        this.log.error((error as Error).stack);
      }
    }
  }

  private async fetchRecentSnapshots(): Promise<
    Array<{ item_id: string; price: string; captured_at: Date }>
  > {
    const rows = await this.ds.query(
      `
      SELECT DISTINCT ON (item_id)
        item_id,
        price,
        captured_at
      FROM price_history
      WHERE captured_at >= now() - interval '10 minutes'
      ORDER BY item_id, captured_at DESC
      `,
    );
    return rows;
  }

  private async syncToRedis(snap: {
    item_id: string;
    price: string;
    captured_at: Date;
  }): Promise<boolean> {
    const { item_id, price, captured_at } = snap;
    const priceNum = parseFloat(price);
    const ts = new Date(captured_at).getTime();

    const currentKey = `price:current:${item_id}`;
    const histKey = `price:hist:${item_id}`;

    try {
      const prevRaw = await this.redis.get(currentKey);
      const prev = prevRaw ? JSON.parse(prevRaw) : null;

      const changed = !prev || prev.price !== priceNum;

      const currentValue = JSON.stringify({ price: priceNum, ts });
      await this.redis.set(currentKey, currentValue, PriceCacheScheduler.TTL_7D);

      await this.redis.zadd(histKey, ts, priceNum.toString());

      return changed;
    } catch (error) {
      this.log.warn(`⚠️ Sync failed for item_id=${item_id}: ${(error as Error).message}`);
      return false;
    }
  }

  private async updateHeartbeat(): Promise<void> {
    const now = Date.now();
    await this.redis.set('cache:heartbeat', now.toString(), PriceCacheScheduler.TTL_1D);
  }

  private async updateMetrics(writeCount: number, changeCount: number): Promise<void> {
    if (writeCount > 0) {
      await this.redis.incrby('cache:metrics:writes', writeCount);
    }
    if (changeCount > 0) {
      await this.redis.incrby('cache:metrics:changes', changeCount);
    }
  }

  /**
   * 오래된 데이터 정리 (7일 이상)
   *
   * DB와 Redis 모두에서 7일 이상 된 데이터를 삭제하여
   * 저장공간을 효율적으로 관리
   */
  private async cleanupOldData(): Promise<void> {
    try {
      // 1) DB: 7일 이상 된 price_history 삭제
      const result = await this.ds.query(
        `
        DELETE FROM price_history
        WHERE captured_at < now() - interval '7 days'
        `,
      );

      const deletedRows = result[1] || 0; // DELETE 결과의 affected rows
      if (deletedRows > 0) {
        this.log.log(`🗑️  Cleaned up ${deletedRows} old price_history rows (>7 days)`);
      }

      // 2) Redis: 7일 이상 된 ZSET 멤버 삭제
      // ZSET은 TTL이 적용되지 않으므로 수동으로 오래된 멤버 정리 필요
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // price:hist:* 키 목록을 가져와서 오래된 멤버 삭제
      const histKeys = await this.redis.scan('price:hist:*', 100);

      let totalRemoved = 0;
      for (const key of histKeys) {
        try {
          // ZREMRANGEBYSCORE: -inf ~ 7일전까지 삭제
          const removed = await this.redis.zremrangebyscore(key, '-inf', sevenDaysAgo);
          totalRemoved += removed;
        } catch (e) {
          // 개별 키 정리 실패는 무시
        }
      }

      if (totalRemoved > 0) {
        this.log.log(`🗑️  Cleaned up ${totalRemoved} old Redis ZSET members (>7 days)`);
      }
    } catch (error) {
      this.log.warn(`⚠️ Cleanup failed: ${(error as Error).message}`);
    }
  }
}
