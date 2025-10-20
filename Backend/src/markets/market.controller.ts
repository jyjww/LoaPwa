import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketSearchDto } from './dto/market-search.dto';
import { AppCache } from '@/cache/app-cache.service';

@Controller('markets')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);
  constructor(
    private readonly marketService: MarketService,
    private readonly cache: AppCache,
  ) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() dto: MarketSearchDto) {
    this.logger.debug(`🧾 MarketController dto=${JSON.stringify(dto)}`);
    const key = `search:v1:market:${stableKey(dto)}`;
    // TTL은 60초 정도로 시작
    return this.cache.getOrSet(key, 60, () => this.marketService.search(dto));
  }
}

// utils (같은 파일 하단 or 별도 util.ts)
function stableKey(obj: any) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
