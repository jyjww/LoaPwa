import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppCacheModule } from '@/cache/cache.module';
import { PriceHistoryController } from './price.controller';
import { PriceService } from './price.service';
import { PriceHistoryService } from './price-history.service';
import { PriceSnapshotService } from './price-snapshot.service';
import { PriceRetentionScheduler } from './price-retention.scheduler';
import { PopularItemsScheduler } from './popular-items.scheduler';
import { DailyPriceSummary } from './entities/daily-price-summary.entity';
import { MarketModule } from '@/markets/market.module';
import { AuctionModule } from '@/auctions/auction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyPriceSummary]),
    AppCacheModule,
    MarketModule,
    AuctionModule,
  ],
  controllers: [PriceHistoryController],
  providers: [
    PriceService,
    PriceHistoryService,
    PriceSnapshotService,
    PriceRetentionScheduler,
    PopularItemsScheduler,
  ],
  exports: [PriceService, PriceHistoryService, PriceSnapshotService],
})
export class PriceModule {}
