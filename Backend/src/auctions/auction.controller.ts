import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { AuctionSearchDto } from './dto/auction-search.dto';
import { AppCache } from '@/cache/app-cache.service';

@Controller('auctions')
export class AuctionController {
  constructor(
    private readonly auctionService: AuctionService,
    private readonly cache: AppCache,
  ) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() dto: AuctionSearchDto) {
    const key = `search:v1:auction:${stableKey(dto)}`;
    return this.cache.getOrSet(key, 60, () => this.auctionService.search(dto));
  }
}

function stableKey(obj: any) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
