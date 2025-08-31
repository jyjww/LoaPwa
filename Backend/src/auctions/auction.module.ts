import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';

@Module({
  imports: [HttpModule], // 외부 API 호출용
  controllers: [AuctionController],
  providers: [AuctionService],
})
export class AuctionModule {}
