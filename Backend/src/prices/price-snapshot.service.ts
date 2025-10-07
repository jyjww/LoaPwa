import { Injectable, Logger } from '@nestjs/common';
import { MarketService } from '@/markets/market.service';
import { AuctionService } from '@/auctions/auction.service';
import { PriceService } from '@/prices/price.service';
import { AppCache } from '@/cache/app-cache.service';
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

type Snapshot = {
  currentPrice: number;
  previousPrice?: number | null;
  info: any;
};

@Injectable()
export class PriceSnapshotService {
  private readonly log = new Logger(PriceSnapshotService.name);

  constructor(
    private readonly market: MarketService,
    private readonly auction: AuctionService,
    private readonly priceSvc: PriceService,
    private readonly cache: AppCache,
  ) {}

  /**
   * 그룹 키( market:123 | auction:auc:... ) 기반으로 스냅샷 생성
   * @param key         "market:123" | "auction:auc:xxxx"
   * @param displayName 즐겨찾기 표시명(검색어로 사용)
   * @param sample      동일 그룹의 임의 1개(등급/티어/옵션 참고용)
   */
  async buildSnapshotForGroup(
    key: string,
    displayName: string,
    sample: any,
  ): Promise<Snapshot | null> {
    const colon = key.indexOf(':');
    if (colon < 0) return null;
    const source = key.slice(0, colon) as 'market' | 'auction';
    const payload = key.slice(colon + 1);

    if (source === 'market') {
      const itemId = Number(payload);
      if (!Number.isFinite(itemId)) return null;

      const res = await this.market.search({ query: displayName });
      const item = res.items?.find((i: any) => i.id === itemId);
      if (!item) return null;

      const info = item.marketInfo ?? {};
      return {
        currentPrice: info.currentMinPrice ?? info.recentPrice ?? 0,
        previousPrice: info.yDayAvgPrice ?? null,
        info,
      };
    }

    if (source === 'auction') {
      const matchKey = payload;
      if (!isAuctionMatchKey(matchKey)) return null;

      const cat = guessCategory(sample);
      const categoryCode =
        cat === 'stone' ? 30000 : cat === 'gem' ? 210000 : cat === 'accessory' ? 200000 : 10000;

      const allowedFirsts = allowedFirstOptionsForCategory(categoryCode);
      const etcOptions = buildEtcOptionDtos(
        (sample?.options ?? []).map(({ name, value }) => ({ name, value })),
        allowedFirsts,
        { looseValues: categoryCode === 30000 }, // 스톤: 값 느슨 허용
      );

      // 페이지네이션 전수 탐색(완화 없이 엄격)
      let page = 1;
      const maxPages = 30;
      while (page <= maxPages) {
        const res = await this.auction.search({
          query: displayName,
          category: categoryCode,
          pageNo: page,
          grade: sample?.grade ?? undefined,
          tier: typeof sample?.tier === 'number' ? sample.tier : undefined,
          etcOptions,
        });

        const items = res.items ?? [];
        const pageSize = res.pageSize || (items.length > 0 ? items.length : 10);
        const total = res.totalCount ?? 0;

        const hit = items.find(
          (i: any) =>
            normalizeAuctionKey(makeAuctionKey(i, guessCategory(i))) ===
            normalizeAuctionKey(matchKey),
        );
        if (hit) {
          const buy = hit.currentPrice ?? 0;
          const start = hit.previousPrice ?? 0;
          return {
            currentPrice: buy > 0 ? buy : start,
            previousPrice: buy > 0 ? start : null,
            info: hit,
          };
        }

        if (items.length < pageSize || pageSize <= 0 || page * pageSize >= total) break;
        page += 1;
      }
      return null;
    }

    return null;
  }

  /**
   * 스냅샷을 price_history에 저장 + metrics 캐시 무효화
   */
  async saveSnapshot(key: string, snap: Snapshot) {
    const colon = key.indexOf(':');
    const source = key.slice(0, colon);
    const payload = key.slice(colon + 1);

    // market은 숫자 id, auction은 matchKey 전체를 item_id로 저장
    const itemId = source === 'market' ? payload : key;

    await this.priceSvc.saveSnapshot(itemId, snap.currentPrice, source, {
      previousPrice: snap.previousPrice ?? null,
      info: snap.info,
    });

    // metrics 캐시 무효화(있다면)
    await this.cache.del(`metrics:${itemId}`);
  }
}
