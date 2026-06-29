import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketService } from '@/markets/market.service';
import { PriceService } from './price.service';
import { TRACKED_ITEMS } from './tracked-items.config';

const SOURCE = 'popular';

@Injectable()
export class PopularItemsScheduler {
  private readonly logger = new Logger(PopularItemsScheduler.name);

  constructor(
    private readonly marketService: MarketService,
    private readonly priceService: PriceService,
  ) {}

  /** KST 09:00 (UTC 00:00) — 거래소 초기화 직후 시세 스냅샷 */
  @Cron('0 0 0 * * *')
  async handleCron(): Promise<void> {
    const runId = Date.now();
    this.logger.log(`[popular:${runId}] start — ${TRACKED_ITEMS.length} items`);

    let saved = 0;
    let failed = 0;

    for (const item of TRACKED_ITEMS) {
      try {
        const results = await this.marketService.search(
          {
            query: item.searchName,
            category: item.categoryCode,
            sort: 'CURRENT_MIN_PRICE',
            sortCondition: 'ASC',
            pageNo: 1,
          },
          undefined,
        );

        const itemList: any[] = results?.items ?? [];
        // 이름이 정확히 일치하는 첫 번째 결과 사용 (서비스 응답은 camelCase)
        const matched = itemList.find(
          (r: any) => r.name === item.searchName || r.name?.includes(item.searchName),
        );

        if (!matched) {
          this.logger.warn(`[popular:${runId}] no match for "${item.searchName}" (got ${itemList.length} results)`);
          failed++;
          continue;
        }

        const price: number =
          matched.marketInfo?.currentMinPrice ??
          matched.marketInfo?.recentPrice ??
          matched.currentMinPrice ??
          0;
        if (price <= 0) {
          this.logger.warn(`[popular:${runId}] invalid price for "${item.searchName}": ${price}`);
          failed++;
          continue;
        }

        await this.priceService.saveSnapshot(item.key, price, SOURCE, {
          originalName: matched.name,
          bundleCount: matched.bundleCount,
          iconUrl: matched.icon ?? null,
        });

        saved++;
        this.logger.debug(`[popular:${runId}] saved "${item.label}" = ${price}G`);
      } catch (err: any) {
        this.logger.error(`[popular:${runId}] error for "${item.searchName}": ${err.message}`);
        failed++;
      }
    }

    this.logger.log(`[popular:${runId}] done — saved=${saved} failed=${failed}`);
  }
}
