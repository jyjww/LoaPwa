import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AuctionModule } from './auctions/auction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ✅ 전역 모듈로 등록
      envFilePath: '.env',
    }),
    TerminusModule,
    AuctionModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
