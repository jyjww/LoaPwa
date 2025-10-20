// src/cache/redis.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * RedisService
 *
 * 목적: Cache Audit Kit을 위한 Redis 저수준 명령 실행
 *
 * 배경:
 * - cache-manager는 GET/SET/DEL만 지원 (SCAN, ZCARD, ZRANGE 등 불가)
 * - 7일 캐시 운영 상태 확인을 위해 ZSET 명령과 메트릭 키 접근 필요
 *
 * 전략:
 * - cache-manager와 별개로 독립적인 ioredis 클라이언트 생성
 * - 환경변수 REDIS_URL 사용 (cache.module.ts와 동일한 연결 정보)
 * - Upstash TLS 설정 적용
 *
 * 사용처:
 * - /health/cache: Redis ping, heartbeat 조회
 * - /api/debug/cache/keys: SCAN으로 키 목록
 * - /api/debug/cache/item/:key: ZCARD, ZRANGEBYSCORE로 히스토리 통계
 * - Scheduler: SET/INCRBY로 heartbeat/metrics 기록
 */
@Injectable()
export class RedisService implements OnModuleInit {
  private readonly log = new Logger(RedisService.name);
  private redisClient: Redis | null = null;

  constructor() {}

  /**
   * NestJS 라이프사이클: 모듈 초기화 완료 후 실행
   */
  onModuleInit() {
    this.initRedisClient();
  }

  /**
   * 독립적인 ioredis 클라이언트 생성
   *
   * cache-manager-redis-yet 내부 클라이언트 추출이 실패하므로,
   * 동일한 REDIS_URL로 새 클라이언트를 생성하는 방식으로 변경
   */
  private initRedisClient() {
    try {
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        this.log.warn('⚠️ REDIS_URL not set, Redis commands will not be available');
        return;
      }

      this.log.log('🔗 Creating Redis client...');

      // Upstash TLS 설정
      this.redisClient = new Redis(redisUrl, {
        tls: {
          rejectUnauthorized: false, // Upstash 인증서 검증 우회
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
      });

      // 연결 성공 이벤트
      this.redisClient.on('connect', () => {
        this.log.log('✅ Redis client connected successfully');
      });

      // 에러 이벤트
      this.redisClient.on('error', (err) => {
        this.log.error('❌ Redis client error:', err.message);
      });
    } catch (e) {
      this.log.error('❌ Failed to create Redis client:', (e as Error).message);
      if ((e as Error).stack) {
        this.log.error((e as Error).stack);
      }
    }
  }

  /**
   * PING - Redis 연결 상태 확인
   *
   * 용도: /health/cache 엔드포인트에서 Redis 가용성 체크
   * 반환: 'ok' (정상) | 'error' (연결 실패/클라이언트 없음)
   */
  async ping(): Promise<'ok' | 'error'> {
    if (!this.redisClient) return 'error';
    try {
      const res = await this.redisClient.ping();
      return res === 'PONG' ? 'ok' : 'error';
    } catch (e) {
      this.log.warn('Redis ping failed:', (e as Error).message);
      return 'error';
    }
  }

  /**
   * SCAN - 패턴 매칭 키 목록 조회
   *
   * 용도: /api/debug/cache/keys?pattern=price:* 엔드포인트
   * 특징:
   * - KEYS 명령 대신 SCAN 사용 (운영 안전성)
   * - cursor 기반 반복으로 블로킹 없이 대량 키 조회
   * - limit까지만 수집 후 중단 (메모리/시간 제한)
   *
   * @param pattern - Redis MATCH 패턴 (예: "price:current:*")
   * @param limit   - 최대 반환 키 수
   */
  async scan(pattern: string, limit: number): Promise<string[]> {
    if (!this.redisClient) return [];
    try {
      const keys: string[] = [];
      let cursor = '0';

      // SCAN은 cursor='0'일 때 종료
      do {
        const [next, batch] = await this.redisClient.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          Math.min(limit, 100), // 한 번에 최대 100개씩 스캔
        );
        cursor = next;
        keys.push(...batch);
        if (keys.length >= limit) break;
      } while (cursor !== '0');

      return keys.slice(0, limit);
    } catch (e) {
      this.log.warn('Redis SCAN failed:', (e as Error).message);
      return [];
    }
  }

  /**
   * GET - 단일 키 값 조회
   *
   * 용도:
   * - cache:heartbeat (마지막 스케줄러 실행 시각)
   * - cache:metrics:* (카운터 값)
   * - price:current:{itemKey} (현재가 JSON)
   */
  async get(key: string): Promise<string | null> {
    if (!this.redisClient) return null;
    try {
      return await this.redisClient.get(key);
    } catch (e) {
      this.log.warn(`Redis GET ${key} failed:`, (e as Error).message);
      return null;
    }
  }

  /**
   * SET - 단일 키 설정 (TTL 옵션)
   *
   * 용도:
   * - Scheduler에서 cache:heartbeat 갱신 (EX 86400)
   * - 테스트 시드 데이터
   *
   * @param ttlSec - 만료 시간(초). undefined면 영구 저장
   */
  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (!this.redisClient) return;
    try {
      if (ttlSec) {
        await this.redisClient.set(key, value, 'EX', ttlSec);
      } else {
        await this.redisClient.set(key, value);
      }
    } catch (e) {
      this.log.warn(`Redis SET ${key} failed:`, (e as Error).message);
    }
  }

  /**
   * INCRBY - 카운터 증가
   *
   * 용도: Scheduler에서 메트릭 누적
   * - cache:metrics:writes: 총 price:current:* 업데이트 횟수
   * - cache:metrics:changes: 가격 변동 이벤트 수
   *
   * @returns 증가 후 값 (실패 시 0)
   */
  async incrby(key: string, increment: number): Promise<number> {
    if (!this.redisClient) return 0;
    try {
      return await this.redisClient.incrby(key, increment);
    } catch (e) {
      this.log.warn(`Redis INCRBY ${key} failed:`, (e as Error).message);
      return 0;
    }
  }

  /**
   * ZCARD - ZSET 멤버 총 개수
   *
   * 용도: price:hist:{itemKey}의 전체 포인트 수 확인
   * (단, 실제로는 ZCOUNT로 시간 범위 필터링하여 사용)
   */
  async zcard(key: string): Promise<number> {
    if (!this.redisClient) return 0;
    try {
      return await this.redisClient.zcard(key);
    } catch (e) {
      this.log.warn(`Redis ZCARD ${key} failed:`, (e as Error).message);
      return 0;
    }
  }

  /**
   * ZCOUNT - 스코어 범위 내 멤버 수
   *
   * 용도: /api/debug/cache/item/:key에서 24h/7d 포인트 수 계산
   * - min/max는 epoch ms (score)
   * - 예: 24시간 = now - 86400000 ~ now
   */
  async zcount(key: string, min: number | string, max: number | string): Promise<number> {
    if (!this.redisClient) return 0;
    try {
      return await this.redisClient.zcount(key, min, max);
    } catch (e) {
      this.log.warn(`Redis ZCOUNT ${key} failed:`, (e as Error).message);
      return 0;
    }
  }

  /**
   * ZRANGEBYSCORE - 스코어 범위로 ZSET 멤버 조회 (오름차순)
   *
   * 용도: 히스토리에서 가장 오래된(첫) 포인트 조회
   * - withscores=true: [member, score, member, score, ...] 형태 반환
   * - limit: { offset: 0, count: 1 } → 첫 1개만
   */
  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    withscores: boolean = false,
    limit?: { offset: number; count: number },
  ): Promise<string[]> {
    if (!this.redisClient) return [];
    try {
      const args: (string | number)[] = [key, min, max];
      if (withscores) args.push('WITHSCORES');
      if (limit) {
        args.push('LIMIT', limit.offset, limit.count);
      }
      // TypeScript spread 제약으로 인해 타입 단언 필요
      return await (this.redisClient.zrangebyscore as any)(...args);
    } catch (e) {
      this.log.warn(`Redis ZRANGEBYSCORE ${key} failed:`, (e as Error).message);
      return [];
    }
  }

  /**
   * ZREVRANGEBYSCORE - 스코어 범위로 ZSET 멤버 조회 (내림차순)
   *
   * 용도: 히스토리에서 가장 최근(마지막) 포인트 조회
   * - max/min 순서가 ZRANGEBYSCORE와 반대임 주의
   */
  async zrevrangebyscore(
    key: string,
    max: number | string,
    min: number | string,
    withscores: boolean = false,
    limit?: { offset: number; count: number },
  ): Promise<string[]> {
    if (!this.redisClient) return [];
    try {
      const args: (string | number)[] = [key, max, min];
      if (withscores) args.push('WITHSCORES');
      if (limit) {
        args.push('LIMIT', limit.offset, limit.count);
      }
      // TypeScript spread 제약으로 인해 타입 단언 필요
      return await (this.redisClient.zrevrangebyscore as any)(...args);
    } catch (e) {
      this.log.warn(`Redis ZREVRANGEBYSCORE ${key} failed:`, (e as Error).message);
      return [];
    }
  }

  /**
   * ZADD - ZSET에 멤버 추가
   *
   * 용도: 테스트에서 시드 데이터 생성
   * - score: epoch ms (타임스탬프)
   * - member: 가격 또는 JSON
   *
   * @returns 추가된 멤버 수 (이미 있으면 0)
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.redisClient) return 0;
    try {
      return await this.redisClient.zadd(key, score, member);
    } catch (e) {
      this.log.warn(`Redis ZADD ${key} failed:`, (e as Error).message);
      return 0;
    }
  }

  /**
   * ZREMRANGEBYSCORE - 스코어 범위로 ZSET 멤버 삭제
   *
   * 용도: 오래된 히스토리 데이터 정리 (7일 이상)
   * - min/max: 삭제할 스코어 범위 (예: -inf ~ 7일전_timestamp)
   *
   * @returns 삭제된 멤버 수
   */
  async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    if (!this.redisClient) return 0;
    try {
      return await this.redisClient.zremrangebyscore(key, min, max);
    } catch (e) {
      this.log.warn(`Redis ZREMRANGEBYSCORE ${key} failed:`, (e as Error).message);
      return 0;
    }
  }
}
