// src/cache/item-price.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ValidationPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ItemPriceCacheService } from './item-price-cache.service';
import { SearchCacheService, SearchRequest } from './search-cache.service';

export class SearchCacheDto {
  source: 'auction' | 'market';
  query?: string;
  grade?: string;
  tier?: number | string;
  className?: string;
  category?: number | string;
  subCategory?: number | string;
  etcOptions?: Array<{ type: string; value: number | null }>;
  onlyBuyNow?: boolean;
  maxPages?: number;
}

export class SearchSortDto {
  source: 'auction' | 'market';
  query?: string;
  grade?: string;
  tier?: number | string;
  className?: string;
  category?: number | string;
  subCategory?: number | string;
  etcOptions?: Array<{ type: string; value: number | null }>;
  onlyBuyNow?: boolean;
  sort: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * 검색 기반 가격 정렬 API 컨트롤러
 *
 * 제공 기능:
 * - 검색 결과 수집 및 캐싱
 * - 캐시된 검색 결과의 가격 정렬 조회
 * - 캐시 상태 조회
 */
@Controller('search-cache')
export class ItemPriceController {
  private readonly log = new Logger(ItemPriceController.name);

  constructor(
    private readonly priceCache: ItemPriceCacheService,
    private readonly searchCache: SearchCacheService,
  ) {}

  /**
   * 검색 결과 수집 및 캐싱
   *
   * POST /search-cache/collect
   */
  @Post('collect')
  async collectSearchResults(@Body(new ValidationPipe({ transform: true })) dto: SearchCacheDto) {
    try {
      const searchRequest: SearchRequest = {
        query: dto.query,
        grade: dto.grade,
        tier: dto.tier,
        className: dto.className,
        category: dto.category,
        subCategory: dto.subCategory,
        etcOptions: dto.etcOptions,
        onlyBuyNow: dto.onlyBuyNow,
      };

      let result;
      if (dto.source === 'auction') {
        result = await this.searchCache.collectAndCacheAuctionSearch({
          source: 'auction',
          searchRequest,
          maxPages: dto.maxPages || 10,
          delayMs: 2000,
        });
      } else {
        result = await this.searchCache.collectAndCacheMarketSearch({
          source: 'market',
          searchRequest,
          maxPages: dto.maxPages || 10,
          delayMs: 1500,
        });
      }

      return {
        success: true,
        data: {
          searchHash: result.searchHash,
          totalItems: result.totalItems,
          cachedItems: result.cachedItems,
          source: dto.source,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COLLECTION_FAILED',
          message: '검색 결과 수집에 실패했습니다.',
        },
      };
    }
  }

  /**
   * 캐시된 검색 결과의 가격 정렬 조회
   *
   * POST /search-cache/sort
   */
  @Post('sort')
  async getSortedSearchResults(@Body(new ValidationPipe({ transform: true })) dto: SearchSortDto) {
    try {
      const searchRequest: SearchRequest = {
        query: dto.query,
        grade: dto.grade,
        tier: dto.tier,
        className: dto.className,
        category: dto.category,
        subCategory: dto.subCategory,
        etcOptions: dto.etcOptions,
        onlyBuyNow: dto.onlyBuyNow,
      };

      const result = await this.searchCache.getSortedSearchResults(dto.source, searchRequest, {
        sort: dto.sort,
        limit: Math.min(dto.limit || 50, 100), // 최대 100개로 제한
        offset: dto.offset || 0,
      });

      return {
        success: true,
        data: {
          items: result.items,
          total: result.total,
          searchHash: result.searchHash,
          cachedAt: result.cachedAt,
          page: Math.floor((dto.offset || 0) / (dto.limit || 50)) + 1,
          limit: dto.limit || 50,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SORT_FAILED',
          message: '가격 정렬 조회에 실패했습니다.',
        },
      };
    }
  }

  /**
   * 해시로 직접 캐시된 검색 결과의 가격 정렬 조회
   *
   * POST /search-cache/sort-by-hash
   */
  @Post('sort-by-hash')
  async getSortedSearchResultsByHash(
    @Body()
    dto: {
      source: 'auction' | 'market';
      searchHash: string;
      sort: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    },
  ) {
    try {
      const result = await this.priceCache.getSortedSearchResults({
        source: dto.source,
        searchHash: dto.searchHash,
        sort: dto.sort,
        limit: Math.min(dto.limit || 50, 100), // 최대 100개로 제한
        offset: dto.offset || 0,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.log.error('❌ Failed to get sorted search results by hash:', error);
      return {
        success: false,
        error: {
          code: 'SORT_FAILED',
          message: '정렬된 검색 결과를 가져오는데 실패했습니다.',
        },
      };
    }
  }

  /**
   * 검색 캐시 상태 조회
   *
   * GET /search-cache/stats
   */
  @Get('stats')
  async getCacheStats() {
    try {
      const stats = await this.priceCache.getCacheStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: '캐시 상태 조회에 실패했습니다.',
        },
      };
    }
  }

  /**
   * 특정 검색 캐시 삭제
   *
   * POST /search-cache/clear
   */
  @Post('clear')
  async clearSearchCache(
    @Body('source') source: 'auction' | 'market',
    @Body('searchHash') searchHash: string,
  ) {
    try {
      const success = await this.priceCache.clearSearchCache(source, searchHash);

      return {
        success,
        data: {
          source,
          searchHash,
          cleared: success,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLEAR_FAILED',
          message: '캐시 삭제에 실패했습니다.',
        },
      };
    }
  }
}
