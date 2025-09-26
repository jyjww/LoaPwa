import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { AuctionSearchDto } from './dto/auction-search.dto';

@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() dto: AuctionSearchDto) {
    return this.auctionService.search(dto);
  }
}
