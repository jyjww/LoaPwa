import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AuctionModule } from './auctions/auction.module';
import { MarketModule } from './markets/market.module';
import { AuthModule } from './auth/auth.module';

import { User } from './auth/entities/user.entity';

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

    TerminusModule,
    AuctionModule,
    MarketModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
