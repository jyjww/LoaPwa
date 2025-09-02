import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AuctionModule } from './auctions/auction.module';
import { MarketModule } from './markets/market.module';
import { AuthModule } from './auth/auth.module';
import { FavoritesModule } from './favorites/favorite.module';
import { FcmModule } from './fcm/fcm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ✅ 전역 모듈로 등록
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true, // 개발용, 운영에서는 false 권장
    }),

    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    TerminusModule,
    AuctionModule,
    MarketModule,
    AuthModule,
    FavoritesModule,
    FcmModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
