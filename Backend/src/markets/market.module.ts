import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { AppCacheModule } from '@/cache/cache.module';
import { LostArkApiModule } from '@/lostark/lostark-api.module';

@Module({
  imports: [ConfigModule, forwardRef(() => AppCacheModule), LostArkApiModule],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}
