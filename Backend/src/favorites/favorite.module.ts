// src/favorites/favorites.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorite.service';
import { FavoritesController } from './favorite.controller';
import { FavoritesCollectorScheduler } from './favorites-collector.scheduler';
import { User } from '@/auth/entities/user.entity';
import { FavoritesListener } from './favorites.listener';
import { FcmModule } from '@/fcm/fcm.module';
import { FavoritesScheduler } from './favorites.scheduler';
import { MarketModule } from '@/markets/market.module';
import { AuctionModule } from '@/auctions/auction.module';
import { PriceService } from '@/prices/price.service';
import { PriceSnapshotService } from '@/prices/price-snapshot.service';
import { AppCacheModule } from '@/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite, User]),
    FcmModule,
    MarketModule,
    AuctionModule,
    AppCacheModule,
  ],
  controllers: [FavoritesController],
  providers: [
    FavoritesService,
    FavoritesListener,
    FavoritesScheduler, // 기존 스케줄러(알림/판정)
    FavoritesCollectorScheduler, // 신규 스냅샷 수집 스케줄러
    PriceService,
    PriceSnapshotService,
  ],
  exports: [FavoritesService],
})
export class FavoritesModule {}
