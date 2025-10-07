import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { AppCacheModule } from '@/cache/cache.module';

@Module({
  imports: [HttpModule, AppCacheModule], // 외부 API 호출용
  controllers: [AuctionController],
  providers: [AuctionService],
  exports: [AuctionService],
})
export class AuctionModule {}
