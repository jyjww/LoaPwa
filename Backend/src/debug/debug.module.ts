// src/debug/debug.module.ts
import { Module } from '@nestjs/common';
import { AppCacheModule } from '@/cache/cache.module';
import { HealthController } from './health.controller';
import { DebugController } from './debug.controller';

/**
 * DebugModule
 *
 * 목적: Cache Audit Kit 엔드포인트 제공
 *
 * 포함 컨트롤러:
 * - HealthController: /health/cache (Redis 상태, heartbeat, metrics)
 * - DebugController: /api/debug/cache/* (키 목록, 아이템 상세)
 *
 * 의존성:
 * - AppCacheModule: RedisService 사용 (기존 Redis 클라이언트 재사용)
 *
 * 엔드포인트 목록:
 * - GET /health/cache
 * - GET /api/debug/cache/keys?pattern=price:*&limit=100
 * - GET /api/debug/cache/item/:itemKey
 *
 * 운영 고려사항:
 * - 프로덕션 환경에서는 이 모듈을 제거하거나 인증 가드 추가 권장
 * - 현재는 개발/디버깅 편의를 위해 공개 엔드포인트로 제공
 */
@Module({
  imports: [AppCacheModule], // RedisService 사용을 위해 import
  controllers: [HealthController, DebugController],
})
export class DebugModule {}
