// src/watch/auto-watch.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AutoWatchService } from './auto-watch.service';
import { PriceSnapshotService } from '@/prices/price-snapshot.service';

@Injectable()
export class AutoWatchScheduler {
  private readonly log = new Logger(AutoWatchScheduler.name);

  constructor(
    private readonly autos: AutoWatchService,
    private readonly snapshot: PriceSnapshotService,
  ) {}

  @Cron('0 0 9 * * *', { timeZone: 'Asia/Seoul' })
  async dailyCollect() {
    const list = await this.autos.listEnabled();
    for (const row of list) {
      // ✅ 중복 방지(당일 이미 찍었으면 스킵)
      const today = new Date().toISOString().slice(0, 10);
      if (row.last_snapshot_at && row.last_snapshot_at.toISOString().startsWith(today)) continue;

      const key = row.item_key;
      const built = await this.snapshot.buildSnapshotForGroup(key, key, {});
      if (!built) continue;
      await this.snapshot.saveSnapshot(key, built);
      await this.autos.markSnapshotted(row.id);
    }
  }

  // (선택) 최근 N일 즐겨찾기 無 → auto 해제
  @Cron('0 0 18 * * *', { timeZone: 'Asia/Seoul' })
  async evict() {
    const list = await this.autos.listEnabled();
    const N = Number(process.env.AUTO_WATCH_EVICT_DAYS || 3);
    for (const row of list) {
      const keep = await this.autos.hasRecentFavorite(row.item_key, N);
      if (!keep) await this.autos.disable(row.id);
    }
  }
}
