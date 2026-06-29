// src/favorites/favorites.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorite.service';
import { FavoritesController } from './favorite.controller';
import { User } from '@/auth/entities/user.entity';
import { AnonUser } from '@/anon/anon-user.entity';
import { FavoritesListener } from './favorites.listener';
import { FcmModule } from '@/fcm/fcm.module';
import { AlertScheduler } from './alert.scheduler';
import { PriceRefreshScheduler } from './price-refresh.scheduler';
import { MarketModule } from '@/markets/market.module';
import { AuctionModule } from '@/auctions/auction.module';
import { PriceService } from '@/prices/price.service';
import { AppCacheModule } from '@/cache/cache.module';
import { AnonModule } from '@/anon/anon.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite, User, AnonUser]),
    FcmModule,
    AnonModule,
    MarketModule,
    AuctionModule,
    AppCacheModule,
  ],
  controllers: [FavoritesController],
  providers: [
    FavoritesService,
    FavoritesListener,
    AlertScheduler,        // DB/Redis only — no external API calls
    PriceRefreshScheduler, // stale-only refresh, 30 min interval, cache-first
    PriceService,
  ],
  exports: [FavoritesService],
})
export class FavoritesModule {}
