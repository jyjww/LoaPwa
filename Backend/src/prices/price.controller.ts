import { Controller, Get, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service';
import { PriceService } from './price.service';
import { PopularItemsScheduler } from './popular-items.scheduler';
import { GetPriceHistoryDto } from './dto/get-price-history.dto';
import { TRACKED_ITEMS } from './tracked-items.config';

@Controller('prices')
export class PriceHistoryController {
  constructor(
    private svc: PriceHistoryService,
    private priceService: PriceService,
    private popularScheduler: PopularItemsScheduler,
  ) {}

  /**
   * GET /api/prices/history/:itemKey?range=24h|7d
   * 개별 아이템 가격 히스토리 (즐겨찾기 차트용)
   */
  @Get('history/:itemKey')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async series(@Param('itemKey') itemKey: string, @Query() q: GetPriceHistoryDto) {
    let bucket = q.bucket;
    let days = q.days;

    if (q.range === '24h') {
      bucket = 'hour';
      days = 1;
    } else if (q.range === '7d') {
      bucket = 'hour';
      days = 7;
    }

    return this.svc.getSeries(itemKey, {
      bucket,
      fromDays: days,
      minuteStep: q.minuteStep,
      hourStep: q.hourStep,
    });
  }

  /**
   * POST /api/prices/popular/refresh  (개발용 수동 트리거)
   * 스케줄러를 즉시 실행해 시세 데이터 수집
   */
  @Post('popular/refresh')
  async refreshPopular() {
    await this.popularScheduler.handleCron();
    return { ok: true };
  }

  /**
   * GET /api/prices/popular
   * 공개 엔드포인트 — 주요 재료 7일 시세 목록 (로그인 불필요)
   */
  @Get('popular')
  async popular() {
    const results = await Promise.all(
      TRACKED_ITEMS.map(async (item) => {
        const [history, latest] = await Promise.all([
          this.svc.getSeries(item.key, { bucket: 'day', fromDays: 7 }),
          this.priceService.getLatest(item.key, { source: 'popular' }),
        ]);

        const prices = history.map((p: any) => p.price).filter((p: any) => p != null && p > 0);
        const firstPrice = prices[0] ?? 0;
        const lastPrice = prices[prices.length - 1] ?? 0;
        const changePct =
          firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : null;

        return {
          key: item.key,
          label: item.label,
          group: item.group,
          iconUrl: latest?.meta?.iconUrl ?? null,
          currentPrice: latest?.price ?? lastPrice ?? null,
          changePct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
          history,
        };
      }),
    );

    return results;
  }
}
