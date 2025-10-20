// src/favorites/favorites-collector.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import pLimit from 'p-limit';
import { FavoritesService } from '@/favorites/favorite.service';
import { Favorite } from '@/favorites/entities/favorite.entity';
import { PriceSnapshotService } from '@/prices/price-snapshot.service';
import { isAuctionMatchKey } from '@shared/matchAuctionKey';

@Injectable()
export class FavoritesCollectorScheduler {
  private readonly log = new Logger(FavoritesCollectorScheduler.name);

  constructor(
    private readonly favs: FavoritesService,
    private readonly snapshot: PriceSnapshotService,
  ) {}

  @Cron('0 */10 * * * *') // 10분마다
  async collect(): Promise<void> {
    const runId = Date.now().toString(36);
    this.log.log(`🔔 [${runId}] FavoritesCollector 시작`);

    const active: Favorite[] = await this.favs.findActive();
    const valid = active.filter((f) => this.getGroupKey(f) !== null);
    const groups = this.groupByItem(valid);

    if (Object.keys(groups).length === 0) {
      this.log.debug(`ℹ️ [${runId}] 처리할 그룹 없음`);
      this.log.log(`✅ [${runId}] FavoritesCollector 종료`);
      return;
    }

    // 동시 실행 제한
    const limit = pLimit(5);
    const tasks = Object.entries(groups).map(([key, favs]) =>
      limit(async () => {
        const name = favs[0]?.name ?? '(unknown)';
        try {
          const snap = await this.snapshot.buildSnapshotForGroup(key, name, favs[0]);
          if (!snap) {
            this.log.warn(`⚠️ [${runId}] snapshot miss key=${key} name="${name}"`);
            return;
          }
          await this.snapshot.saveSnapshot(key, snap);
          this.log.debug(
            `💾 [${runId}] saved snapshot key=${key} current=${snap.currentPrice} prev=${snap.previousPrice ?? 'null'}`,
          );
        } catch (e: any) {
          this.log.error(`❌ [${runId}] snapshot fail key=${key}: ${e?.message ?? e}`);
          if (e?.stack) this.log.error(e.stack);
        }
      }),
    );

    await Promise.allSettled(tasks);
    this.log.log(`✅ [${runId}] FavoritesCollector 종료`);
  }

  // === helpers ===
  private getGroupKey(f: Favorite): string | null {
    if (!f?.source) return null;

    if (f.source === 'market') {
      const n = Number(f.itemId);
      return Number.isFinite(n) ? `market:${n}` : null;
    }
    if (f.source === 'auction') {
      return isAuctionMatchKey(f.matchKey) ? `auction:${String(f.matchKey)}` : null;
    }
    return null;
  }

  private groupByItem(list: Favorite[]): Record<string, Favorite[]> {
    return list.reduce(
      (acc, f) => {
        const k = this.getGroupKey(f);
        if (!k) return acc;
        (acc[k] ||= []).push(f);
        return acc;
      },
      {} as Record<string, Favorite[]>,
    );
  }
}
