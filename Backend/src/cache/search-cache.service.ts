// src/cache/search-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AuctionService } from '../auctions/auction.service';
import { MarketService } from '../markets/market.service';
import { ItemPriceCacheService, PriceItem } from './item-price-cache.service';
import { createHash } from 'crypto';
import { makeAuctionKey } from '@shared/matchAuctionKey';

/**
 * 검색 기반 캐싱 서비스
 *
 * 목적: 사용자가 검색할 때 모든 페이지를 수집하여 캐싱하고,
 * 캐싱된 데이터로 가격 정렬을 제공
 *
 * 동작 방식:
 * 1. 사용자가 검색 요청
 * 2. 검색 조건의 해시값 생성
 * 3. 캐시에 해당 검색 결과가 있는지 확인
 * 4. 없으면 모든 페이지를 순차적으로 수집하여 캐싱
 * 5. 캐싱된 데이터로 정렬 결과 반환
 */

export interface SearchRequest {
  query?: string;
  grade?: string;
  tier?: number | string;
  className?: string;
  category?: number | string;
  subCategory?: number | string;
  etcOptions?: Array<{ type: string; value: number | null }>;
  onlyBuyNow?: boolean; // 경매장 전용
}

export interface SearchCacheOptions {
  source: 'auction' | 'market';
  searchRequest: SearchRequest;
  maxPages?: number;
  delayMs?: number;
}

@Injectable()
export class SearchCacheService {
  private readonly log = new Logger(SearchCacheService.name);

  constructor(
    private readonly auctionService: AuctionService,
    private readonly marketService: MarketService,
    private readonly priceCache: ItemPriceCacheService,
  ) {}

  /**
   * 검색 요청의 해시값 생성
   */
  generateSearchHash(
    source: 'auction' | 'market',
    request: SearchRequest,
    includeTimestamp = false,
  ): string {
    const searchData = {
      source,
      query: request.query || '',
      grade: request.grade || '전체',
      tier: request.tier || '전체',
      className: request.className || '전체',
      category: request.category || '전체',
      subCategory: request.subCategory || '전체',
      etcOptions: request.etcOptions || [],
      onlyBuyNow: request.onlyBuyNow || false,
      ...(includeTimestamp && { timestamp: Date.now() }), // 수집 시에만 타임스탬프 포함
    };

    const hash = createHash('md5').update(JSON.stringify(searchData)).digest('hex');
    return hash.substring(0, 16); // 16자리로 단축
  }

  /**
   * 경매장 검색 결과 수집 및 캐싱
   */
  async collectAndCacheAuctionSearch(options: SearchCacheOptions): Promise<{
    searchHash: string;
    totalItems: number;
    cachedItems: number;
  }> {
    const { searchRequest, maxPages = 10, delayMs = 2000 } = options;
    const searchHash = this.generateSearchHash('auction', searchRequest, true); // 수집 시 타임스탬프 포함

    // 이미 캐시되어 있는지 확인
    if (await this.priceCache.hasSearchCache('auction', searchHash)) {
      const count = await this.priceCache.getSearchCacheCount('auction', searchHash);
      this.log.debug(`✅ Using cached auction search: ${searchHash} (${count} items)`);
      return { searchHash, totalItems: count, cachedItems: count };
    }

    this.log.log(`🔍 Collecting auction search: ${searchRequest.query || 'all'} (${searchHash})`);

    const allItems: PriceItem[] = [];
    let totalCount = 0;
    let page = 1;

    try {
      while (page <= maxPages) {
        // 경매장 검색
        const searchResult = await this.auctionService.search({
          query: searchRequest.query || '',
          grade: searchRequest.grade || '전체',
          tier: typeof searchRequest.tier === 'number' ? searchRequest.tier : undefined,
          className: searchRequest.className || '전체',
          category: typeof searchRequest.category === 'number' ? searchRequest.category : 0,
          subCategory:
            typeof searchRequest.subCategory === 'number' ? searchRequest.subCategory : 0,
          pageNo: page,
          etcOptions: searchRequest.etcOptions || [],
        });

        if (!searchResult.items || searchResult.items.length === 0) {
          break;
        }

        totalCount = searchResult.totalCount;

        // 즉시구매가가 있는 아이템만 필터링
        const buyNowItems = searchRequest.onlyBuyNow
          ? searchResult.items.filter((item: any) => {
              const buyPrice = item.auctionInfo?.BuyPrice;
              // BuyPrice가 존재하고 0보다 큰 경우만 필터링
              return buyPrice != null && typeof buyPrice === 'number' && buyPrice > 0;
            })
          : searchResult.items;

        this.log.debug(
          `📄 Page ${page}: ${searchResult.items.length} total items, ${buyNowItems.length} buy-now items (onlyBuyNow: ${searchRequest.onlyBuyNow})`,
        );

        // PriceItem으로 변환
        for (const item of buyNowItems) {
          const buyPrice = item.auctionInfo?.BuyPrice;
          // BuyPrice가 null이거나 0인 경우 건너뛰기
          if (!buyPrice || buyPrice <= 0) continue;

          // 고유 ID 생성 (API에서 id가 없는 경우 matchKey 사용)
          const itemId =
            item.id ||
            makeAuctionKey({
              name: item.name,
              grade: item.grade,
              tier: item.tier,
              quality: item.quality,
              options: item.options || [],
            });

          this.log.debug(`📦 Adding item: id=${itemId}, name=${item.name}, buyPrice=${buyPrice}`);

          allItems.push({
            id: itemId,
            name: item.name,
            price: buyPrice,
            source: 'auction',
            timestamp: Date.now(),
            metadata: {
              name: item.name,
              grade: item.grade,
              tier: item.tier,
              quality: item.quality,
              icon: item.icon,
              auctionInfo: item.auctionInfo,
              options: item.options || [],
            },
          });
        }

        this.log.debug(`📄 Collected page ${page}: ${buyNowItems.length} items`);

        // 다음 페이지로
        page++;

        // API 호출 간격 대기
        if (page <= maxPages) {
          await this.sleep(delayMs);
        }
      }

      // 캐시에 저장
      if (allItems.length > 0) {
        await this.priceCache.setSearchResults(allItems, 'auction', searchHash);
      }

      this.log.log(`✅ Cached auction search: ${allItems.length} items (${searchHash})`);
      return { searchHash, totalItems: totalCount, cachedItems: allItems.length };
    } catch (e) {
      this.log.error(`❌ Failed to collect auction search:`, (e as Error).message);
      return { searchHash, totalItems: 0, cachedItems: 0 };
    }
  }

  /**
   * 거래소 검색 결과 수집 및 캐싱
   */
  async collectAndCacheMarketSearch(options: SearchCacheOptions): Promise<{
    searchHash: string;
    totalItems: number;
    cachedItems: number;
  }> {
    const { searchRequest, maxPages = 10, delayMs = 1500 } = options;
    const searchHash = this.generateSearchHash('market', searchRequest, true); // 수집 시 타임스탬프 포함

    // 이미 캐시되어 있는지 확인
    if (await this.priceCache.hasSearchCache('market', searchHash)) {
      const count = await this.priceCache.getSearchCacheCount('market', searchHash);
      this.log.debug(`✅ Using cached market search: ${searchHash} (${count} items)`);
      return { searchHash, totalItems: count, cachedItems: count };
    }

    this.log.log(`🔍 Collecting market search: ${searchRequest.query || 'all'} (${searchHash})`);

    const allItems: PriceItem[] = [];
    let totalCount = 0;
    let page = 1;

    try {
      while (page <= maxPages) {
        // 거래소 검색
        const searchResult = await this.marketService.search({
          query: searchRequest.query || '',
          grade: searchRequest.grade || '전체',
          tier: typeof searchRequest.tier === 'number' ? searchRequest.tier : undefined,
          className: searchRequest.className || '전체',
          category: typeof searchRequest.category === 'number' ? searchRequest.category : 0,
          subCategory:
            typeof searchRequest.subCategory === 'number' ? searchRequest.subCategory : 0,
          pageNo: page,
        });

        if (!searchResult.items || searchResult.items.length === 0) {
          break;
        }

        totalCount = searchResult.totalCount;

        // PriceItem으로 변환
        for (const item of searchResult.items) {
          const minPrice = item.marketInfo?.currentMinPrice || 0;

          // 고유 ID 생성 (API에서 id가 없는 경우 matchKey 사용)
          const itemId =
            item.id ||
            makeAuctionKey({
              name: item.name,
              grade: item.grade,
              tier: item.tier,
              quality: item.quality,
              options: item.options || [],
            });

          allItems.push({
            id: itemId,
            name: item.name,
            price: minPrice,
            source: 'market',
            timestamp: Date.now(),
            metadata: {
              grade: item.grade,
              quality: item.quality,
              icon: item.icon,
              bundleCount: item.bundleCount,
              marketInfo: item.marketInfo,
            },
          });
        }

        this.log.debug(`📄 Collected page ${page}: ${searchResult.items.length} items`);

        // 다음 페이지로
        page++;

        // API 호출 간격 대기
        if (page <= maxPages) {
          await this.sleep(delayMs);
        }
      }

      // 캐시에 저장
      if (allItems.length > 0) {
        await this.priceCache.setSearchResults(allItems, 'market', searchHash);
      }

      this.log.log(`✅ Cached market search: ${allItems.length} items (${searchHash})`);
      return { searchHash, totalItems: totalCount, cachedItems: allItems.length };
    } catch (e) {
      this.log.error(`❌ Failed to collect market search:`, (e as Error).message);
      return { searchHash, totalItems: 0, cachedItems: 0 };
    }
  }

  /**
   * 검색 결과의 가격 정렬 조회
   */
  async getSortedSearchResults(
    source: 'auction' | 'market',
    searchRequest: SearchRequest,
    sortOptions: {
      sort: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    items: Array<{ id: string; price: number; metadata: Record<string, any> }>;
    total: number;
    searchHash: string;
    cachedAt: number;
  }> {
    const searchHash = this.generateSearchHash(source, searchRequest);

    // 캐시된 결과 조회
    const result = await this.priceCache.getSortedSearchResults({
      source,
      searchHash,
      sort: sortOptions.sort,
      limit: sortOptions.limit || 50,
      offset: sortOptions.offset || 0,
      onlyBuyNow: searchRequest.onlyBuyNow,
    });

    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
