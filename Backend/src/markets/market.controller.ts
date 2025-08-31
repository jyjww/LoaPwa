import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketSearchDto } from './dto/market-search.dto';

@Controller('markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() dto: MarketSearchDto) {
    return this.marketService.search(dto);
  }
}
