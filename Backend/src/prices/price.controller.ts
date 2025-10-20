// src/prices/price.controller.ts
import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service';
import { GetPriceHistoryDto } from './dto/get-price-history.dto';

/**
 * PriceHistoryController
 *
 * 엔드포인트:
 * - GET /api/prices/history/:itemKey?bucket=hour&days=7
 * - GET /api/prices/history/:itemKey?range=24h|7d (Cache Audit Kit 간편 파라미터)
 *
 * range 매핑:
 * - '24h' → bucket=hour, days=1 (1시간 단위, 24시간)
 * - '7d'  → bucket=hour, days=7 (1시간 단위, 7일)
 */
@Controller('prices')
export class PriceHistoryController {
  constructor(private svc: PriceHistoryService) {}

  /**
   * GET /api/prices/history/:itemKey
   *
   * 쿼리 파라미터:
   * - range: '24h' | '7d' (간편 모드)
   * - bucket: 'minute' | 'hour' | 'day' (상세 모드)
   * - days: number (상세 모드)
   * - minuteStep, hourStep: 집계 간격 (옵션)
   *
   * range가 지정되면 bucket/days는 무시되고 자동 매핑됨.
   */
  @Get('history/:itemKey')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async series(@Param('itemKey') itemKey: string, @Query() q: GetPriceHistoryDto) {
    // range 파라미터가 있으면 자동 매핑
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
}
