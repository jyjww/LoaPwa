// src/watch/watch.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoWatch } from './entities/auto-watch.entity';
import { AutoWatchService } from './auto-watch.service';
import { AutoWatchController } from './auto-watch.controller';
import { AutoWatchScheduler } from './auto-watch.scheduler'; // 있다면
import { PriceSnapshotService } from '@/prices/price-snapshot.service';
import { PriceService } from '@/prices/price.service';
import { MarketModule } from '@/markets/market.module';
import { AuctionModule } from '@/auctions/auction.module';
import { AppCacheModule } from '@/cache/cache.module';
import { AnonModule } from '@/anon/anon.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutoWatch]),
    MarketModule,
    AuctionModule,
    AppCacheModule,
    AnonModule,
  ],
  controllers: [AutoWatchController],
  providers: [AutoWatchService, AutoWatchScheduler, PriceSnapshotService, PriceService],
  exports: [AutoWatchService],
})
export class WatchModule {}
