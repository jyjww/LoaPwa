// src/debug/debug.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { RedisService } from '@/cache/redis.service';

/**
 * DebugController
 *
 * 목적: Cache Audit Kit - Redis 캐시 내부 상태 검사 엔드포인트
 *
 * 엔드포인트:
 * - GET /api/debug/cache/keys?pattern=price:*&limit=100
 * - GET /api/debug/cache/item/:itemKey
 *
 * 보안:
 * - keys 엔드포인트는 키 이름만 노출, 값(value)은 노출하지 않음
 * - item 엔드포인트는 특정 아이템의 통계만 반환 (개인정보 없음)
 *
 * 사용 시나리오:
 * - 7일 캐싱이 실제로 동작하는지 확인
 * - 특정 아이템의 히스토리 포인트 수 확인 (24h/7d)
 * - 캐시 키 네임스페이스 규칙 준수 여부 확인
 */
@Controller('debug/cache')
export class DebugController {
  constructor(private readonly redis: RedisService) {}

  /**
   * GET /api/debug/cache/keys?pattern=price:*&limit=100
   *
   * Redis SCAN으로 패턴 매칭 키 목록 조회
   *
   * 쿼리 파라미터:
   * - pattern: Redis MATCH 패턴 (기본: "price:current:*")
   * - limit: 최대 반환 키 수 (기본: 100, 최대: 1000)
   *
   * 주의:
   * - 값(value)은 노출하지 않음 (키 이름만)
   * - SCAN 사용으로 운영 안전성 확보 (KEYS 명령 대신)
   *
   * 응답:
   * {
   *   success: true,
   *   data: {
   *     pattern: "price:current:*",
   *     keys: ["price:current:market:123", ...],
   *     count: 42,
   *     limit: 100
   *   }
   * }
   */
  @Get('keys')
  async scanKeys(@Query('pattern') pattern?: string, @Query('limit') limitStr?: string) {
    try {
      const finalPattern = pattern || 'price:current:*';
      const limit = Math.min(parseInt(limitStr || '100', 10), 1000);

      const keys = await this.redis.scan(finalPattern, limit);

      return {
        success: true,
        data: {
          pattern: finalPattern,
          keys,
          count: keys.length,
          limit,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCAN_FAILED',
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * GET /api/debug/cache/item/:itemKey
   *
   * 특정 아이템의 캐시 상태 및 히스토리 통계 조회
   *
   * 파라미터:
   * - itemKey: 아이템 식별자 (예: "market:123" 또는 "auction:auc:xxxxx")
   *
   * 반환 데이터:
   * - current: price:current:{itemKey}의 현재가 JSON
   * - history24hCount: price:hist:{itemKey}의 최근 24시간 포인트 수
   * - history7dCount: price:hist:{itemKey}의 최근 7일 포인트 수
   * - firstTs: 7일 범위 내 가장 오래된 포인트의 타임스탬프 (epoch ms)
   * - lastTs: 7일 범위 내 가장 최근 포인트의 타임스탬프 (epoch ms)
   *
   * 용도:
   * - 7일 캐싱이 실제로 작동하는지 검증
   * - 스냅샷 스케줄러가 정상적으로 히스토리를 쌓는지 확인
   *
   * 응답:
   * {
   *   success: true,
   *   data: {
   *     itemKey: "market:123",
   *     current: { price: 1000, ts: 1234567890 },
   *     history24hCount: 144,
   *     history7dCount: 1008,
   *     firstTs: 1234560000,
   *     lastTs: 1234567890
   *   }
   * }
   */
  @Get('item/:itemKey')
  async inspectItem(@Param('itemKey') itemKey: string) {
    try {
      const now = Date.now();
      const ms24h = 24 * 60 * 60 * 1000;
      const ms7d = 7 * 24 * 60 * 60 * 1000;

      // 1) 현재가 조회 (price:current:{itemKey})
      const currentKey = `price:current:${itemKey}`;
      const currentRaw = await this.redis.get(currentKey);
      const current = currentRaw ? JSON.parse(currentRaw) : null;

      // 2) 히스토리 키 (price:hist:{itemKey})
      const histKey = `price:hist:${itemKey}`;

      // 3) 24시간/7일 범위 포인트 수 (ZCOUNT)
      const history24hCount = await this.redis.zcount(histKey, now - ms24h, now);
      const history7dCount = await this.redis.zcount(histKey, now - ms7d, now);

      // 4) 7일 범위 내 첫 포인트 타임스탬프 (ZRANGEBYSCORE ... LIMIT 1)
      const firstResult = await this.redis.zrangebyscore(
        histKey,
        now - ms7d,
        now,
        true, // WITHSCORES
        { offset: 0, count: 1 },
      );
      const firstTs = firstResult.length >= 2 ? parseInt(firstResult[1], 10) : null;

      // 5) 7일 범위 내 마지막 포인트 타임스탬프 (ZREVRANGEBYSCORE ... LIMIT 1)
      const lastResult = await this.redis.zrevrangebyscore(
        histKey,
        now,
        now - ms7d,
        true, // WITHSCORES
        { offset: 0, count: 1 },
      );
      const lastTs = lastResult.length >= 2 ? parseInt(lastResult[1], 10) : null;

      return {
        success: true,
        data: {
          itemKey,
          current,
          history24hCount,
          history7dCount,
          firstTs,
          lastTs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INSPECT_FAILED',
          message: (error as Error).message,
        },
      };
    }
  }
}
