// src/cache/item-price-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { makeAuctionKey } from '@shared/matchAuctionKey';

export interface PriceItem {
  id: string | number;
  name: string;
  price: number;
  source: 'auction' | 'market';
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SearchCacheOptions {
  source: 'auction' | 'market';
  searchHash: string;
  sort: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  onlyBuyNow?: boolean; // 경매장 전용: 즉시구매가만
}

export interface SearchCacheResult {
  items: Array<{ id: string; price: number; metadata: Record<string, any> }>;
  total: number;
  searchHash: string;
  cachedAt: number;
}

/**
 * 검색 기반 임시 가격 캐싱 서비스
 *
 * 목적: 사용자 검색 시 모든 페이지를 수집하여 캐싱하고,
 * 캐싱된 데이터로 가격 정렬을 제공
 *
 * Redis 키 구조:
 * - search:{source}:{searchHash} (ZSET: score=price, member=itemId)
 * - search:meta:{source}:{itemId} (STRING: JSON 메타데이터, TTL 5분)
 *
 * 특징:
 * - 검색별로 임시 캐시 생성 (5분 TTL)
 * - 경매장: 즉시구매가(BuyPrice) 기준
 * - 거래소: 최소가격(CurrentMinPrice) 기준
 * - 사용자가 검색 페이지를 벗어나면 캐시 자동 만료
 */
@Injectable()
export class ItemPriceCacheService {
  private readonly log = new Logger(ItemPriceCacheService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * 검색 결과를 캐시에 저장
   *
   * @param items - 저장할 아이템 목록
   * @param source - 경매장/거래소 구분
   * @param searchHash - 검색 조건의 해시값
   */
  async setSearchResults(
    items: PriceItem[],
    source: 'auction' | 'market',
    searchHash: string,
  ): Promise<void> {
    try {
      const searchKey = `search:${source}:${searchHash}`;
      const now = Date.now();

      // ZSET에 가격-아이템ID 저장 (score=price, member=itemId)
      for (const item of items) {
        await this.redis.zadd(searchKey, item.price, String(item.id));

        // 메타데이터 저장 (JSON 문자열로, 5분 TTL)
        const metaKey = `search:meta:${source}:${item.id}`;
        const metadata = JSON.stringify({
          name: item.name,
          price: item.price,
          timestamp: item.timestamp,
          searchHash,
          ...(item.metadata || {}),
        });
        await this.redis.set(metaKey, metadata, 300); // 5분 TTL
      }

      // 검색 키에 TTL 설정 (5분)
      await this.redis.set(`${searchKey}:ttl`, String(now), 300);

      this.log.debug(`✅ Cached ${items.length} ${source} items for search: ${searchHash}`);
    } catch (e) {
      this.log.warn(`❌ Failed to cache ${source} search results:`, (e as Error).message);
    }
  }

  /**
   * 검색 결과가 캐시되어 있는지 확인
   *
   * @param source - 경매장/거래소 구분
   * @param searchHash - 검색 조건의 해시값
   */
  async hasSearchCache(source: 'auction' | 'market', searchHash: string): Promise<boolean> {
    try {
      const searchKey = `search:${source}:${searchHash}`;
      const ttlKey = `${searchKey}:ttl`;

      const exists = await this.redis.get(ttlKey);
      return exists !== null;
    } catch (e) {
      this.log.warn(`❌ Failed to check search cache:`, (e as Error).message);
      return false;
    }
  }

  /**
   * 캐시된 검색 결과에서 가격 정렬된 아이템 목록 조회
   *
   * @param options - 정렬 옵션
   * @returns 정렬된 아이템 목록과 메타데이터
   */
  async getSortedSearchResults(options: SearchCacheOptions): Promise<SearchCacheResult> {
    try {
      const { source, searchHash, sort, limit = 100, offset = 0, onlyBuyNow } = options;

      // 캐시 존재 여부 확인
      if (!(await this.hasSearchCache(source, searchHash))) {
        this.log.debug(`❌ No cache found for search: ${searchHash}`);
        return { items: [], total: 0, searchHash, cachedAt: 0 };
      }

      // Redis 키 생성
      const searchKey = `search:${source}:${searchHash}`;

      // ZSET에서 아이템 ID 조회 (가격 순으로 정렬)
      const itemIds =
        sort === 'asc'
          ? await this.redis.zrangebyscore(searchKey, '-inf', '+inf', true, {
              offset,
              count: limit,
            })
          : await this.redis.zrevrangebyscore(searchKey, '+inf', '-inf', true, {
              offset,
              count: limit,
            });

      // ZSET 카운트 조회 (전체 개수)
      const total = await this.redis.zcard(searchKey);

      this.log.debug(
        `🔍 Found ${itemIds.length} items in ZSET (total: ${total}), onlyBuyNow: ${onlyBuyNow}`,
      );

      // 아이템 ID와 가격을 파싱
      const items: Array<{ id: string; price: number; metadata: Record<string, any> }> = [];

      for (let i = 0; i < itemIds.length; i += 2) {
        const id = itemIds[i];
        const price = parseFloat(itemIds[i + 1]);

        // 메타데이터 조회
        const metadata = await this.getItemMetadata(source, id);

        // 경매장에서 즉시구매가만 필터링
        if (onlyBuyNow && source === 'auction') {
          const buyPrice = metadata?.auctionInfo?.BuyPrice;
          const hasBuyNow = buyPrice != null && typeof buyPrice === 'number' && buyPrice > 0;
          if (!hasBuyNow) {
            continue;
          }
        }

        items.push({ id, price, metadata });
      }

      // 정렬 적용 (Redis에서 이미 정렬되어 오지만 확실히 하기 위해)
      items.sort((a, b) => (sort === 'asc' ? a.price - b.price : b.price - a.price));

      // 캐시 생성 시간 조회
      const ttlKey = `${searchKey}:ttl`;
      const cachedAtRaw = await this.redis.get(ttlKey);
      const cachedAt = cachedAtRaw ? parseInt(cachedAtRaw, 10) : Date.now();

      this.log.debug(`📊 Retrieved ${items.length}/${total} ${source} items from cache (${sort})`);

      return { items, total, searchHash, cachedAt };
    } catch (e) {
      this.log.warn(`❌ Failed to get sorted search results:`, (e as Error).message);
      return { items: [], total: 0, searchHash: '', cachedAt: 0 };
    }
  }

  /**
   * 아이템 메타데이터 조회
   */
  private async getItemMetadata(source: string, itemId: string): Promise<Record<string, any>> {
    try {
      const metaKey = `search:meta:${source}:${itemId}`;

      const metadataJson = await this.redis.get(metaKey);
      if (metadataJson) {
        return JSON.parse(metadataJson);
      }

      return {};
    } catch (e) {
      this.log.warn(`❌ Failed to get metadata for ${source}:${itemId}:`, (e as Error).message);
      return {};
    }
  }

  /**
   * 검색 캐시의 아이템 개수 조회
   */
  async getSearchCacheCount(source: 'auction' | 'market', searchHash: string): Promise<number> {
    try {
      const searchKey = `search:${source}:${searchHash}`;
      return await this.redis.zcard(searchKey);
    } catch (e) {
      this.log.warn(`❌ Failed to get search cache count:`, (e as Error).message);
      return 0;
    }
  }

  /**
   * 검색 캐시 삭제
   *
   * @param source - 경매장/거래소 구분
   * @param searchHash - 검색 해시
   */
  async clearSearchCache(source: 'auction' | 'market', searchHash: string): Promise<boolean> {
    try {
      const searchKey = `search:${source}:${searchHash}`;
      const ttlKey = `${searchKey}:ttl`;

      // TTL 키 삭제 (캐시 만료)
      await this.redis.set(ttlKey, '', 1); // 1초 후 만료

      this.log.debug(`🧹 Cleared ${source} search cache: ${searchHash}`);
      return true;
    } catch (e) {
      this.log.warn(`❌ Failed to clear search cache:`, (e as Error).message);
      return false;
    }
  }

  /**
   * 캐시 상태 조회 (디버깅용)
   */
  async getCacheStats(): Promise<Record<string, any>> {
    try {
      // 검색 캐시 키 패턴 스캔
      const auctionKeys = await this.redis.scan('search:auction:*', 100);
      const marketKeys = await this.redis.scan('search:market:*', 100);

      let auctionCount = 0;
      let marketCount = 0;

      // 각 키의 아이템 수 집계 (TTL 키 제외)
      for (const key of auctionKeys) {
        if (!key.endsWith(':ttl')) {
          auctionCount += await this.redis.zcard(key);
        }
      }

      for (const key of marketKeys) {
        if (!key.endsWith(':ttl')) {
          marketCount += await this.redis.zcard(key);
        }
      }

      return {
        auctionCaches: auctionKeys.filter((k) => !k.endsWith(':ttl')).length,
        marketCaches: marketKeys.filter((k) => !k.endsWith(':ttl')).length,
        auctionItems: auctionCount,
        marketItems: marketCount,
        totalCaches:
          auctionKeys.filter((k) => !k.endsWith(':ttl')).length +
          marketKeys.filter((k) => !k.endsWith(':ttl')).length,
        totalItems: auctionCount + marketCount,
      };
    } catch (e) {
      this.log.warn(`❌ Failed to get cache stats:`, (e as Error).message);
      return {};
    }
  }
}
