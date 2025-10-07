import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { AppCacheModule } from '@/cache/cache.module';

@Module({
  imports: [HttpModule, ConfigModule, AppCacheModule],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}
