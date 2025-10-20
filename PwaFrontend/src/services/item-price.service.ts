// src/services/item-price.service.ts
import api from '@/services/axiosInstance';

export interface SearchRequest {
  query?: string;
  grade?: string;
  tier?: number | string;
  className?: string;
  category?: number | string;
  subCategory?: number | string;
  etcOptions?: Array<{ type: string; value: number | null }>;
  onlyBuyNow?: boolean;
}

export interface SearchCacheOptions {
  source: 'auction' | 'market';
  searchRequest: SearchRequest;
  maxPages?: number;
}

export interface SearchSortOptions {
  source: 'auction' | 'market';
  searchRequest: SearchRequest;
  sort: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PriceItem {
  id: string;
  price: number;
  metadata: {
    name: string;
    grade?: string;
    tier?: number;
    quality?: number;
    icon?: string;
    [key: string]: any;
  };
}

export interface SearchCacheResult {
  items: PriceItem[];
  total: number;
  searchHash: string;
  cachedAt: number;
  page: number;
  limit: number;
}

export interface SearchCollectionResult {
  searchHash: string;
  totalItems: number;
  cachedItems: number;
  source: 'auction' | 'market';
}

export interface CacheStats {
  auctionCaches: number;
  marketCaches: number;
  auctionItems: number;
  marketItems: number;
  totalCaches: number;
  totalItems: number;
}

/**
 * 검색 기반 가격 캐싱 서비스
 *
 * 기능:
 * - 검색 결과 수집 및 캐싱
 * - 캐시된 검색 결과의 가격 정렬 조회
 * - 캐시 상태 조회
 */
export class ItemPriceService {
  /**
   * 검색 결과 수집 및 캐싱
   */
  static async collectSearchResults(options: SearchCacheOptions): Promise<SearchCollectionResult> {
    try {
      const response = await api.post('/search-cache/collect', {
        source: options.source,
        query: options.searchRequest.query,
        grade: options.searchRequest.grade,
        tier: options.searchRequest.tier,
        className: options.searchRequest.className,
        category: options.searchRequest.category,
        subCategory: options.searchRequest.subCategory,
        etcOptions: options.searchRequest.etcOptions,
        onlyBuyNow: options.searchRequest.onlyBuyNow,
        maxPages: options.maxPages || 10,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || '검색 결과 수집에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Failed to collect search results:', error);
      throw error;
    }
  }

  /**
   * 캐시된 검색 결과의 가격 정렬 조회
   */
  static async getSortedSearchResults(options: SearchSortOptions): Promise<SearchCacheResult> {
    try {
      const response = await api.post('/search-cache/sort', {
        source: options.source,
        query: options.searchRequest.query,
        grade: options.searchRequest.grade,
        tier: options.searchRequest.tier,
        className: options.searchRequest.className,
        category: options.searchRequest.category,
        subCategory: options.searchRequest.subCategory,
        etcOptions: options.searchRequest.etcOptions,
        onlyBuyNow: options.searchRequest.onlyBuyNow,
        sort: options.sort,
        limit: options.limit || 50,
        offset: options.offset || 0,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || '가격 정렬 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Failed to get sorted search results:', error);
      throw error;
    }
  }

  /**
   * 해시로 직접 정렬된 검색 결과 조회
   */
  static async getSortedSearchResultsByHash(options: {
    source: 'auction' | 'market';
    searchHash: string;
    sort: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<SearchCacheResult> {
    try {
      const response = await api.post('/search-cache/sort-by-hash', {
        source: options.source,
        searchHash: options.searchHash,
        sort: options.sort,
        limit: options.limit || 50,
        offset: options.offset || 0,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || '가격 정렬 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Failed to get sorted search results by hash:', error);
      throw error;
    }
  }

  /**
   * 캐시 상태 조회
   */
  static async getCacheStats(): Promise<CacheStats> {
    try {
      const response = await api.get('/search-cache/stats');

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || '캐시 상태 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      throw error;
    }
  }

  /**
   * 검색 캐시 삭제
   */
  static async clearSearchCache(
    source: 'auction' | 'market',
    searchHash: string,
  ): Promise<boolean> {
    try {
      const response = await api.post('/search-cache/clear', {
        source,
        searchHash,
      });

      if (response.data.success) {
        return response.data.data.cleared;
      } else {
        throw new Error(response.data.error?.message || '캐시 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Failed to clear search cache:', error);
      throw error;
    }
  }

  /**
   * 경매장 검색 결과 수집 및 가격 정렬 조회 헬퍼
   */
  static async collectAndSortAuctionResults(
    searchRequest: SearchRequest,
    sortOptions: { sort: 'asc' | 'desc'; limit?: number; offset?: number } = { sort: 'asc' },
  ): Promise<SearchCacheResult & { searchHash: string }> {
    // 먼저 검색 결과 수집
    const collectResult = await this.collectSearchResults({
      source: 'auction',
      searchRequest,
      maxPages: 10,
    });

    // 수집된 해시로 정렬된 결과 조회
    const sortedResult = await this.getSortedSearchResultsByHash({
      source: 'auction',
      searchHash: collectResult.searchHash,
      sort: sortOptions.sort,
      limit: sortOptions.limit || 50,
      offset: sortOptions.offset || 0,
    });

    return {
      ...sortedResult,
      searchHash: collectResult.searchHash,
    };
  }

  /**
   * 거래소 검색 결과 수집 및 가격 정렬 조회 헬퍼
   */
  static async collectAndSortMarketResults(
    searchRequest: SearchRequest,
    sortOptions: { sort: 'asc' | 'desc'; limit?: number; offset?: number } = { sort: 'asc' },
  ): Promise<SearchCacheResult & { searchHash: string }> {
    // 먼저 검색 결과 수집
    const collectResult = await this.collectSearchResults({
      source: 'market',
      searchRequest,
      maxPages: 10,
    });

    // 수집된 해시로 정렬된 결과 조회
    const sortedResult = await this.getSortedSearchResultsByHash({
      source: 'market',
      searchHash: collectResult.searchHash,
      sort: sortOptions.sort,
      limit: sortOptions.limit || 50,
      offset: sortOptions.offset || 0,
    });

    return {
      ...sortedResult,
      searchHash: collectResult.searchHash,
    };
  }
}

export default ItemPriceService;
