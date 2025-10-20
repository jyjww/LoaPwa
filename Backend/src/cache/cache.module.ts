import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheController } from './cache.controller';
import { AppCache } from './app-cache.service';
import { RedisService } from './redis.service';
import { ItemPriceCacheService } from './item-price-cache.service';
import { SearchCacheService } from './search-cache.service';
import { ItemPriceController } from './item-price.controller';
import { forwardRef } from '@nestjs/common';
import { AuctionModule } from '../auctions/auction.module';
import { MarketModule } from '../markets/market.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        // Redis URL 없으면 인메모리 fallback
        if (!process.env.REDIS_URL) {
          console.log('[AppCacheModule] ⚠️ REDIS_URL not set, using in-memory cache');
          return { ttl: 60 };
        }

        try {
          console.log('[AppCacheModule] 🔗 Connecting to Redis...');
          const store = await redisStore({
            url: process.env.REDIS_URL,
            // Upstash TLS 설정 (ioredis 규격)
            socket: {
              tls: true,
              rejectUnauthorized: false, // Upstash 인증서 검증 우회
            },
          });
          console.log('[AppCacheModule] ✅ Redis store created successfully');
          return {
            store,
            ttl: 60,
          };
        } catch (error) {
          console.error('[AppCacheModule] ❌ Redis connection failed:', error);
          console.log('[AppCacheModule] ⚠️ Falling back to in-memory cache');
          return { ttl: 60 }; // 실패 시 인메모리 fallback
        }
      },
    }),
    forwardRef(() => AuctionModule),
    forwardRef(() => MarketModule),
  ],
  controllers: [CacheController, ItemPriceController],
  providers: [AppCache, RedisService, ItemPriceCacheService, SearchCacheService],
  exports: [AppCache, RedisService, ItemPriceCacheService, SearchCacheService],
})
export class AppCacheModule {}
