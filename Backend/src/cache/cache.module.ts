import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheController } from './cache.controller';
import { AppCache } from './app-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        if (!process.env.REDIS_URL) return { ttl: 60 };

        if (process.env.REDIS_URL) {
          return {
            store: await redisStore({
              url: process.env.REDIS_URL, // rediss://default:...
              socket: { tls: true }, // Upstash는 TLS
            }),
            ttl: 60,
          };
        }
        // Redis 미설정 시 인메모리 fallback
        return {
          store: await redisStore({
            url: process.env.REDIS_URL,
            tls: {}, // Upstash는 TLS 필요
            // 아래 옵션들은 ioredis 규격 (cache-manager-redis-yet 내부가 ioredis)
            retryStrategy: (times: number) => Math.min(times * 200, 2000),
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            reconnectOnError: () => true,
          } as any),
          ttl: 60, // 기본 TTL
        };
      },
    }),
  ],
  controllers: [CacheController],
  providers: [AppCache],
  exports: [AppCache],
})
export class AppCacheModule {}
