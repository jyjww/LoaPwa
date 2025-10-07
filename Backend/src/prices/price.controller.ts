// src/prices/price.controller.ts
import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service';
import { GetPriceHistoryDto } from './dto/get-price-history.dto';

@Controller('prices')
export class PriceHistoryController {
  constructor(private svc: PriceHistoryService) {}

  // 예: GET /api/prices/history/market:123?bucket=hour&days=7
  @Get('history/:itemKey')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async series(@Param('itemKey') itemKey: string, @Query() q: GetPriceHistoryDto) {
    return this.svc.getSeries(itemKey, {
      bucket: q.bucket,
      fromDays: q.days,
      minuteStep: q.minuteStep,
      hourStep: q.hourStep,
    });
  }
}
