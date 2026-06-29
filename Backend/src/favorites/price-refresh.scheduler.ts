import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import pLimit from 'p-limit';
import { Favorite } from '@/favorites/entities/favorite.entity';
import { FavoritesService } from './favorite.service';
import { MarketService } from '@/markets/market.service';
import { AuctionService } from '@/auctions/auction.service';
import { PriceService } from '@/prices/price.service';
import {
  isAuctionMatchKey,
  makeAuctionKey,
  normalizeAuctionKey,
  guessCategory,
} from '@shared/matchAuctionKey';
import {
  allowedFirstOptionsForCategory,
  buildEtcOptionDtos,
} from '@/auctions/utils/build-etc-option-filters';
import { LostArkCooldownError, LostArkRateLimitError } from '@/lostark/errors';

/** How old a lastCheckedAt must be before we refresh (25 min) */
const STALE_THRESHOLD_SEC = 25 * 60;
/** Max concurrent API calls per run */
const CONCURRENCY = 2;
/** Max auction pages to scan per item */
const MAX_AUCTION_PAGES = 5;

/**
 * PriceRefreshScheduler runs every 30 minutes.
 * Only refreshes favorites whose price data is stale (>25 min old).
 * Calls Market/AuctionService which are cache-first — no API call is made
 * if a fresh Redis cache entry already exists (e.g. from a recent user search).
 */
@Injectable()
export class PriceRefreshScheduler {
  private readonly logger = new Logger(PriceRefreshScheduler.name);

  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly marketService: MarketService,
    private readonly auctionService: AuctionService,
    private readonly priceService: PriceService,
  ) {}

  @Cron('0 */30 * * * *')
  async handleCron(): Promise<void> {
    const runId = Date.now().toString(36);
    this.logger.log(`🔄 [${runId}] PriceRefreshScheduler start`);

    let staleFavorites: Favorite[];
    try {
      staleFavorites = await this.favoritesService.findStaleActive(STALE_THRESHOLD_SEC);
    } catch (err: any) {
      this.logger.error(`❌ [${runId}] Failed to load stale favorites: ${err?.message}`);
      return;
    }

    if (!staleFavorites.length) {
      this.logger.debug(`ℹ️ [${runId}] No stale favorites`);
      return;
    }

    // Group by unique item key to avoid duplicate API calls
    const groups = this.groupByItem(staleFavorites);
    this.logger.log(
      `📊 [${runId}] stale=${staleFavorites.length} groups=${Object.keys(groups).length}`,
    );

    const limit = pLimit(CONCURRENCY);

    const tasks = Object.entries(groups).map(([key, favs]) =>
      limit(() => this.refreshGroup(runId, key, favs)),
    );

    await Promise.allSettled(tasks);
    this.logger.log(`✅ [${runId}] PriceRefreshScheduler done`);
  }

  private async refreshGroup(runId: string, key: string, favs: Favorite[]): Promise<void> {
    const colon = key.indexOf(':');
    if (colon < 0) return;
    const source = key.slice(0, colon) as 'market' | 'auction';
    const payload = key.slice(colon + 1);
    const name = favs[0]?.name ?? '(unknown)';

    try {
      let currentPrice = 0;
      let previousPrice: number | null = null;
      let info: any = {};

      if (source === 'market') {
        const result = await this.fetchMarketPrice(name, favs[0], payload);
        if (!result) {
          this.logger.warn(`⚠️ [${runId}] market itemId=${payload} not found for "${name}"`);
          return;
        }
        currentPrice = result.currentPrice;
        previousPrice = result.previousPrice;
        info = result.info;
      } else if (source === 'auction') {
        const result = await this.fetchAuctionPrice(name, favs[0], payload);
        if (!result) {
          this.logger.warn(`⚠️ [${runId}] auction matchKey=${payload} not found for "${name}"`);
          return;
        }
        currentPrice = result.currentPrice;
        previousPrice = result.previousPrice;
        info = result.info;
      } else {
        return;
      }

      // Save to price_history
      const matchKey = favs[0]?.matchKey;
      if (matchKey) {
        await this.priceService.saveSnapshot(matchKey, currentPrice, source, {
          name,
          previousPrice,
          info,
        });
      }

      // Update snapshot for all favorites in this group
      await this.favoritesService.updateSnapshotsAndEvaluateAll(favs, {
        currentPrice,
        previousPrice: previousPrice ?? undefined,
        info,
        lastCheckedAt: new Date(),
      });

      this.logger.debug(
        `✅ [${runId}] Refreshed ${key}: current=${currentPrice} prev=${previousPrice ?? 'null'}`,
      );
    } catch (err: any) {
      if (err instanceof LostArkCooldownError || err instanceof LostArkRateLimitError) {
        this.logger.warn(`⏸ [${runId}] API key in cooldown/rate-limited, stopping refresh`);
        throw err; // propagate to stop remaining tasks if needed
      }
      this.logger.error(`❌ [${runId}] Failed to refresh ${key}: ${err?.message}`);
    }
  }

  private async fetchMarketPrice(
    name: string,
    fav: Favorite,
    itemIdStr: string,
  ): Promise<{ currentPrice: number; previousPrice: number | null; info: any } | null> {
    const itemId = Number(itemIdStr);
    if (!Number.isFinite(itemId)) return null;

    const categoryCode = fav?.marketInfo?.categoryCode || 0;
    const subCategoryCode = fav?.marketInfo?.subCategoryCode || 0;

    const res = await this.marketService.search({
      query: name,
      category: categoryCode > 0 ? categoryCode : undefined,
      subCategory: subCategoryCode > 0 ? subCategoryCode : undefined,
    });

    const item = res.items?.find((i: any) => i.id === itemId);
    if (!item) return null;

    const info = item.marketInfo ?? {};
    return {
      currentPrice: info.currentMinPrice ?? info.recentPrice ?? 0,
      previousPrice: info.yDayAvgPrice ?? null,
      info,
    };
  }

  private async fetchAuctionPrice(
    name: string,
    fav: Favorite,
    matchKey: string,
  ): Promise<{ currentPrice: number; previousPrice: number | null; info: any } | null> {
    const cat = guessCategory(fav);
    const categoryCode =
      cat === 'stone' ? 30000 : cat === 'gem' ? 210000 : cat === 'accessory' ? 200000 : 10000;

    const allowedFirsts = allowedFirstOptionsForCategory(categoryCode);
    const etcOptions = buildEtcOptionDtos(
      fav?.options?.map(({ name, value }) => ({ name, value })),
      allowedFirsts,
      { looseValues: categoryCode === 30000 },
    );

    let page = 1;
    while (page <= MAX_AUCTION_PAGES) {
      const res = await this.auctionService.search({
        query: name,
        category: categoryCode,
        pageNo: page,
        grade: fav?.grade ?? undefined,
        tier: typeof fav?.tier === 'number' ? fav.tier : undefined,
        etcOptions,
      });

      const items = res.items ?? [];
      const pageSize = res.pageSize || (items.length > 0 ? items.length : 10);
      const total = res.totalCount ?? 0;

      const hit = items.find((i: any) => {
        const k = makeAuctionKey(i, guessCategory(i));
        return normalizeAuctionKey(k) === normalizeAuctionKey(matchKey);
      });

      if (hit) {
        const buy = hit.currentPrice ?? 0;
        const start = hit.previousPrice ?? 0;
        const current = buy > 0 ? buy : start;
        return { currentPrice: current, previousPrice: buy > 0 ? start : null, info: hit };
      }

      if (items.length < pageSize || pageSize <= 0 || page * pageSize >= total) break;
      page++;
    }
    return null;
  }

  private groupByItem(favorites: Favorite[]): Record<string, Favorite[]> {
    return favorites.reduce(
      (acc, f) => {
        const key = this.getGroupKey(f);
        if (!key) return acc;
        (acc[key] ||= []).push(f);
        return acc;
      },
      {} as Record<string, Favorite[]>,
    );
  }

  private getGroupKey(f: Favorite): string | null {
    if (!f?.source) return null;
    if (f.source === 'market') {
      const n = Number(f.itemId);
      return Number.isFinite(n) ? `market:${n}` : null;
    }
    if (f.source === 'auction') {
      const raw: unknown = f.matchKey;
      return isAuctionMatchKey(raw) ? `auction:${String(raw)}` : null;
    }
    return null;
  }
}
