// src/favorites/favorites.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorite.service';
import { FavoritesController } from './favorite.controller';
import { User } from '@/auth/entities/user.entity';
import { FavoritesListener } from './favorites.listener';
import { FcmModule } from '@/fcm/fcm.module';
import { FavoritesScheduler } from './favorites.scheduler';
import { MarketModule } from '@/markets/market.module';
import { AuctionModule } from '@/auctions/auction.module';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, User]), FcmModule, MarketModule, AuctionModule],
  controllers: [FavoritesController],
  providers: [FavoritesService, FavoritesListener, FavoritesScheduler],
  exports: [FavoritesService],
})
export class FavoritesModule {}
