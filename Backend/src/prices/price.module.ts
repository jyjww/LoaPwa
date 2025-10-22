// src/prices/price.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppCacheModule } from '@/cache/cache.module';
import { PriceHistoryController } from './price.controller';
import { PriceService } from './price.service';
import { PriceHistoryService } from './price-history.service';
import { PriceSnapshotService } from './price-snapshot.service';
import { PriceCacheScheduler } from './price-cache.scheduler';
import { MarketModule } from '@/markets/market.module';
import { AuctionModule } from '@/auctions/auction.module';

/**
 * PriceModule
 *
 * 목적: 가격 스냅샷 저장/조회 및 Redis 캐시 동기화
 *
 * 구성:
 * - PriceService: DB에 가격 스냅샷 저장 (price_history 테이블)
 * - PriceHistoryService: 시계열 집계 조회 (bucket 단위)
 * - PriceSnapshotService: 거래소/경매장 API 호출 및 스냅샷 생성
 * - PriceCacheScheduler: DB → Redis 동기화 (price:current:*, price:hist:*)
 *
 * 스케줄러:
 * - PriceCacheScheduler: 매 5분마다 최근 스냅샷을 Redis로 동기화
 *   - cache:heartbeat 갱신
 *   - cache:metrics:writes, cache:metrics:changes 증가
 *
 * 의존성:
 * - AppCacheModule: RedisService (Redis 직접 접근)
 * - MarketModule, AuctionModule: PriceSnapshotService에서 사용
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    AppCacheModule, // RedisService 사용
    MarketModule, // PriceSnapshotService에서 사용
    AuctionModule, // PriceSnapshotService에서 사용
  ],
  controllers: [PriceHistoryController],
  providers: [PriceService, PriceHistoryService, PriceSnapshotService, PriceCacheScheduler],
  exports: [PriceService, PriceHistoryService, PriceSnapshotService],
})
export class PriceModule {}
