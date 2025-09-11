// src/favorites/favorites.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import pLimit from 'p-limit';
import { Favorite } from '@/favorites/entities/favorite.entity';
import { FavoritesService } from './favorite.service';
import { MarketService } from '@/markets/market.service';
import { AuctionService } from '@/auctions/auction.service';

type Snapshot = {
  currentPrice: number;
  previousPrice?: number | null;
  raw: any;
};

@Injectable()
export class FavoritesScheduler {
  private readonly logger = new Logger(FavoritesScheduler.name);

  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly marketService: MarketService,
    private readonly auctionService: AuctionService,
  ) {}

  @Cron('*/1 * * * *')
  async handleCron(): Promise<void> {
    const runId = Date.now().toString(36);
    this.logger.log(`🔔 [${runId}] FavoritesScheduler 실행`);

    const activeFavorites: Favorite[] = await this.favoritesService.findActive();

    // ✅ bigint(string) → number 파싱
    const valid = activeFavorites.filter((f) => this.parseItemId(f.itemId) !== null);

    // (디버그) 어떤 타입으로 들어오는지 확인
    const missing = activeFavorites.filter((f) => this.parseItemId(f.itemId) === null);
    if (missing.length) {
      this.logger.warn(
        `⚠️ [${runId}] favorites missing/invalid itemId: ${missing.length} (sample: ` +
        missing.slice(0,3).map(m => `${m.name}/${m.source}:${String(m.itemId)}[${typeof m.itemId}]`).join(', ') +
        `${missing.length>3?'...':''})`,
      );
    }

    const groups = this.groupByItem(valid);
    this.logger.debug(
      `📊 [${runId}] favorites=${activeFavorites.length}, valid=${valid.length}, groups=${Object.keys(groups).length}`,
    );

    if (Object.keys(groups).length === 0) {
      this.logger.debug(`ℹ️ [${runId}] 처리할 그룹이 없습니다. 종료`);
      this.logger.log(`✅ [${runId}] FavoritesScheduler 완료`);
      return;
    }

    const limit = pLimit(5);
    const cache = new Map<string, Snapshot>();

    const tasks = Object.entries(groups).map(([key, favs]) =>
      limit(async () => {
        const [source, itemIdStr] = key.split(':');
        const itemId = Number(itemIdStr);
        const name = favs[0]?.name ?? '(unknown)';
        const groupSize = favs.length;

        try {
          this.logger.debug(`➡️  [${runId}] fetch ${source}:${itemId} name="${name}" (group=${groupSize})`);

          let snapshot = cache.get(key);
          if (!snapshot) {
            const t0 = Date.now();

            if (source === 'market') {
              const res = await this.marketService.search({ query: name });
              const ms = Date.now() - t0;
              this.logger.debug(`🛰️  [${runId}] market.search("${name}") -> items=${res.items?.length ?? 0} (${ms}ms)`);

              const item = res.items?.find((i: any) => i.id === itemId);
              if (!item) {
                this.logger.warn(`⚠️  [${runId}] market itemId=${itemId} not found for "${name}"`);
                return;
              }
              // ✅ MarketService 매핑 키로 보정
              snapshot = {
                currentPrice: item.marketInfo?.currentMinPrice ?? item.marketInfo?.recentPrice ?? 0,
                previousPrice: item.marketInfo?.yDayAvgPrice ?? null,
                raw: item,
              };
            } else if (source === 'auction') {
              const res = await this.auctionService.search({ query: name });
              const ms = Date.now() - t0;
              this.logger.debug(`🛰️  [${runId}] auction.search("${name}") -> items=${res.items?.length ?? 0} (${ms}ms)`);

              const item = res.items?.find((i: any) => i.id === itemId);
              if (!item) {
                this.logger.warn(`⚠️  [${runId}] auction itemId=${itemId} not found for "${name}"`);
                return;
              }
              snapshot = {
                currentPrice: item.currentPrice,
                previousPrice: item.previousPrice ?? null,
                raw: item,
              };
            } else {
              this.logger.warn(`⚠️  [${runId}] unknown source="${source}" for key=${key}`);
              return;
            }

            cache.set(key, snapshot);
            this.logger.debug(
              `✅ [${runId}] snapshot for ${key}: current=${snapshot.currentPrice}, prev=${snapshot.previousPrice ?? 'null'}`,
            );
          } else {
            this.logger.debug(`📦 [${runId}] cache hit for ${key}`);
          }

          const t1 = Date.now();
          await this.favoritesService.updateSnapshotsAndEvaluateAll(favs, {
            currentPrice: snapshot.currentPrice,
            previousPrice: snapshot.previousPrice ?? undefined,
            info: snapshot.raw,
            lastCheckedAt: new Date(),
          });
          const msUpdate = Date.now() - t1;
          this.logger.debug(`💾 [${runId}] updated & evaluated favorites=${groupSize} for ${key} (${msUpdate}ms)`);
        } catch (e: any) {
          const status = e?.response?.status;
          const body = e?.response?.data;
          this.logger.error(`❌ [${runId}] item=${key} 처리 실패: ${e?.message ?? e}`);
          if (status) this.logger.error(`   ↳ status=${status}`);
          if (body) this.logger.error(`   ↳ body=${JSON.stringify(body)}`);
          if (e?.stack) this.logger.error(e.stack);
        }
      }),
    );

    await Promise.allSettled(tasks);
    this.logger.log(`✅ [${runId}] FavoritesScheduler 완료`);
  }

  // ✅ bigint/string → number 파서
  private parseItemId(raw: unknown): number | null {
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private groupByItem(favorites: Favorite[]): Record<string, Favorite[]> {
    return favorites.reduce((acc, f) => {
      const idNum = this.parseItemId(f.itemId);
      if (idNum === null) return acc;
      const key = `${f.source}:${idNum}`;
      (acc[key] ||= []).push(f);
      return acc;
    }, {} as Record<string, Favorite[]>);
  }
}
