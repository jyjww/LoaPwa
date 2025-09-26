import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketSearchDto } from './dto/market-search.dto';

@Controller('markets')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);
  constructor(private readonly marketService: MarketService) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() dto: MarketSearchDto) {
    this.logger.debug(`🧾 MarketController dto=${JSON.stringify(dto)}`);
    return this.marketService.search(dto);
  }
}
