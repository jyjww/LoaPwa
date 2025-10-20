import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 검색 기반 가격 캐싱 기능 지원 마이그레이션
 * 
 * 이 마이그레이션은 새로운 검색 기반 캐싱 기능을 위한 데이터베이스 변경사항을 적용합니다.
 * 
 * 주요 변경사항:
 * 1. 기존 price_history 테이블은 그대로 유지
 * 2. 새로운 캐싱 기능은 Redis를 사용하므로 별도 테이블 생성 불필요
 * 3. 기존 데이터 무결성 보장
 * 
 * 참고: 
 * - 검색 기반 캐싱은 Redis ZSET을 사용하여 임시 저장
 * - 캐시 TTL: 5분 (300초)
 * - matchKey 기반 고유 식별자 사용
 */
export class AddSearchCacheSupport1760976000000 implements MigrationInterface {
  name = 'AddSearchCacheSupport1760976000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 현재는 Redis 기반 캐싱을 사용하므로 별도의 테이블 생성이 필요하지 않습니다.
    // 하지만 향후 확장성을 위해 관련 인덱스나 설정을 추가할 수 있습니다.
    
    console.log('✅ Search-based caching support migration completed');
    console.log('📝 Note: This feature uses Redis for temporary caching (5min TTL)');
    console.log('🔑 Uses matchKey-based unique identifiers for items');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Redis 기반 캐싱이므로 별도의 롤백 작업이 필요하지 않습니다.
    console.log('✅ Search-based caching support rollback completed');
  }
}
