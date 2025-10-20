// src/debug/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { RedisService } from '@/cache/redis.service';
import { ItemPriceCacheService } from '@/cache/item-price-cache.service';

/**
 * HealthController
 *
 * 목적: Cache Audit Kit - Redis 캐시 헬스체크 엔드포인트
 *
 * 엔드포인트:
 * - GET /health/cache
 *
 * 사용 시나리오:
 * - 운영 중 Redis 연결 상태 확인
 * - 스케줄러가 정상 동작하는지 heartbeat 확인
 * - 가격 스냅샷 writer가 실제로 동작하는지 metrics 확인
 *
 * 응답 형식 (표준 계약):
 * {
 *   success: true,
 *   data: {
 *     redis: "ok" | "error",
 *     lastSchedulerRunAt: epoch_ms | null,
 *     writerCounters: {
 *       writes: number,    // price:current:* 총 업데이트 횟수
 *       changes: number    // 가격 변동 이벤트 수
 *     }
 *   }
 * }
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly priceCache: ItemPriceCacheService,
  ) {}

  /**
   * GET /health/cache
   *
   * Redis 연결 상태와 캐시 writer 메트릭을 반환
   *
   * - redis: PING 결과 ('ok' | 'error')
   * - lastSchedulerRunAt: cache:heartbeat 키에서 읽은 마지막 실행 시각 (epoch ms)
   * - writerCounters: cache:metrics:writes / cache:metrics:changes 값
   */
  @Get('cache')
  async checkCache() {
    try {
      // 1) Redis PING
      const redisStatus = await this.redis.ping();

      // 2) 마지막 스케줄러 실행 시각 (cache:heartbeat)
      const heartbeatRaw = await this.redis.get('cache:heartbeat');
      const lastSchedulerRunAt = heartbeatRaw ? parseInt(heartbeatRaw, 10) : null;

      // 3) Writer 카운터 (cache:metrics:writes, cache:metrics:changes)
      const writesRaw = await this.redis.get('cache:metrics:writes');
      const changesRaw = await this.redis.get('cache:metrics:changes');

      const writes = writesRaw ? parseInt(writesRaw, 10) : 0;
      const changes = changesRaw ? parseInt(changesRaw, 10) : 0;

      // 4) 가격 캐시 통계
      const priceCacheStats = await this.priceCache.getCacheStats();

      // 5) 경매장/거래소 수집 heartbeat
      const auctionHeartbeat = await this.redis.get('cache:heartbeat:auction');
      const marketHeartbeat = await this.redis.get('cache:heartbeat:market');

      // 6) 수집 메트릭
      const auctionCollections = await this.redis.get('cache:metrics:auction_collections');
      const marketCollections = await this.redis.get('cache:metrics:market_collections');

      return {
        success: true,
        data: {
          redis: redisStatus,
          lastSchedulerRunAt,
          writerCounters: {
            writes,
            changes,
          },
          priceCache: priceCacheStats,
          collectionHeartbeats: {
            auction: auctionHeartbeat ? parseInt(auctionHeartbeat, 10) : null,
            market: marketHeartbeat ? parseInt(marketHeartbeat, 10) : null,
          },
          collectionMetrics: {
            auction: auctionCollections ? parseInt(auctionCollections, 10) : 0,
            market: marketCollections ? parseInt(marketCollections, 10) : 0,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: (error as Error).message,
        },
      };
    }
  }
}
