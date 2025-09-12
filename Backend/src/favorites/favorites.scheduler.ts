// src/favorites/favorites.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import pLimit from 'p-limit';
import { Favorite } from '@/favorites/entities/favorite.entity';
import { FavoritesService } from './favorite.service';
import { MarketService } from '@/markets/market.service';
import { AuctionService } from '@/auctions/auction.service';

type MarketInfoFlat = {
  currentMinPrice?: number;
  yDayAvgPrice?: number | null;
  recentPrice?: number;
  tradeRemainCount?: number | null;
};

type AuctionInfoFlat = any; // 필요하면 명세로 좁히세요

type Snapshot = {
  currentPrice: number;
  previousPrice?: number | null;
  info: MarketInfoFlat | AuctionInfoFlat; // ← 이걸 DB에 그대로 넣음
};

@Injectable()
export class FavoritesScheduler {
  private readonly logger = new Logger(FavoritesScheduler.name);

  // ✅ 클래스 레벨 캐시 (앱 살아 있는 동안 유지)
  // TODO : 서버 메모리 부족 시, LRU/TTL 방식 고려
  private cache = new Map<string, Snapshot>();

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

    const valid = activeFavorites.filter((f) => this.parseItemId(f.itemId) !== null);
    const missing = activeFavorites.filter((f) => this.parseItemId(f.itemId) === null);
    if (missing.length) {
      this.logger.warn(
        `⚠️ [${runId}] favorites missing/invalid itemId: ${missing.length} (sample: ` +
          missing
            .slice(0, 3)
            .map((m) => `${m.name}/${m.source}:${String(m.itemId)}[${typeof m.itemId}]`)
            .join(', ') +
          `${missing.length > 3 ? '...' : ''})`,
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

    const tasks = Object.entries(groups).map(([key, favs]) =>
      limit(async () => {
        const [source, itemIdStr] = key.split(':');
        const itemId = Number(itemIdStr);
        const name = favs[0]?.name ?? '(unknown)';
        const groupSize = favs.length;

        try {
          this.logger.debug(
            `➡️  [${runId}] fetch ${source}:${itemId} name="${name}" (group=${groupSize})`,
          );

          let snapshot = this.cache.get(key);
          if (!snapshot) {
            const t0 = Date.now();

            if (source === 'market') {
              const res = await this.marketService.search({ query: name });
              const ms = Date.now() - t0;
              this.logger.debug(
                `🛰️  [${runId}] market.search("${name}") -> items=${res.items?.length ?? 0} (${ms}ms)`,
              );

              const item = res.items?.find((i: any) => i.id === itemId);
              if (!item) {
                this.logger.warn(`⚠️  [${runId}] market itemId=${itemId} not found for "${name}"`);
                return;
              }

              // ✅ 평평한 marketInfo만 저장
              const info: MarketInfoFlat = item.marketInfo ?? {};
              snapshot = {
                currentPrice: info.currentMinPrice ?? info.recentPrice ?? 0,
                previousPrice: info.yDayAvgPrice ?? null,
                info, // ← flat
              };
            } else if (source === 'auction') {
              const res = await this.auctionService.search({ query: name });
              const ms = Date.now() - t0;
              this.logger.debug(
                `🛰️  [${runId}] auction.search("${name}") -> items=${res.items?.length ?? 0} (${ms}ms)`,
              );

              const item = res.items?.find((i: any) => i.id === itemId);
              if (!item) {
                this.logger.warn(`⚠️  [${runId}] auction itemId=${itemId} not found for "${name}"`);
                return;
              }

              // 필요 시 auction 원본에서 필요한 필드만 추려서 info 구성
              const info: AuctionInfoFlat = item; // 또는 { StartPrice: item.StartPrice, ... }
              snapshot = {
                currentPrice: item.currentPrice,
                previousPrice: item.previousPrice ?? null,
                info,
              };
            } else {
              this.logger.warn(`⚠️  [${runId}] unknown source="${source}" for key=${key}`);
              return;
            }

            this.cache.set(key, snapshot);
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
            info: snapshot.info, // ← raw 아님!
            lastCheckedAt: new Date(),
          });
          const msUpdate = Date.now() - t1;
          this.logger.debug(
            `💾 [${runId}] updated & evaluated favorites=${groupSize} for ${key} (${msUpdate}ms)`,
          );
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

  private parseItemId(raw: unknown): number | null {
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private groupByItem(favorites: Favorite[]): Record<string, Favorite[]> {
    return favorites.reduce(
      (acc, f) => {
        const idNum = this.parseItemId(f.itemId);
        if (idNum === null) return acc;
        const key = `${f.source}:${idNum}`;
        (acc[key] ||= []).push(f);
        return acc;
      },
      {} as Record<string, Favorite[]>,
    );
  }
}
