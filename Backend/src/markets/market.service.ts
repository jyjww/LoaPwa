import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisService } from '@/cache/redis.service';
import { LostArkApiClient } from '@/lostark/lostark-api.client';
import {
  LostArkApiKeyInvalidError,
  LostArkApiForbiddenError,
  LostArkRateLimitError,
  LostArkCooldownError,
} from '@/lostark/errors';
import { MarketSearchDto } from './dto/market-search.dto';

const SORT_ALLOWED = new Set([
  'GRADE',
  'RECENT_PRICE',
  'YDAY_AVG_PRICE',
  'CURRENT_MIN_PRICE',
  'TRADE_COUNT',
]);
const SORT_COND_ALLOWED = new Set(['ASC', 'DESC']);
const CATEGORY_FALLBACKS: number[] = [50000, 20000, 40000];

const SEARCH_TTL_SEC = 300;    // 5 minutes
const OPTIONS_TTL_SEC = 86400; // 24 hours (LostArk API guide: static data)

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly SEARCH_PATH = '/markets/items';
  private readonly OPTIONS_PATH = '/markets/options';

  constructor(
    private readonly api: LostArkApiClient,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  // ── Options: 24h cache (API guide: call once daily) ──────────────────────

  async getCategories(force = false): Promise<any> {
    const cacheKey = 'options:market';
    if (!force) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug('📦 Market options: cache hit');
        return JSON.parse(cached);
      }
    }
    this.logger.debug('📡 Market options: fetching from API');
    try {
      const data = await this.api.call({ method: 'GET', path: this.OPTIONS_PATH, timeout: 5000 });
      await this.redis.set(cacheKey, JSON.stringify(data), OPTIONS_TTL_SEC);
      this.logger.debug('✅ Market options cached (24h)');
      return data;
    } catch (err) {
      this.handleApiError(err, 'getCategories');
    }
  }

  // ── Search: cache-first, 5 min TTL ──────────────────────────────────────

  async search(dto: MarketSearchDto, userApiKey?: string): Promise<any> {
    const requestBody = this.buildRequestBody(dto);
    const cacheKey = `search:market:${this.hashParams(requestBody)}`;

    // 1. Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`📦 Market search: cache hit (${cacheKey})`);
      return JSON.parse(cached);
    }

    // 2. Cache miss → call API
    this.logger.debug(`📡 Market search: miss, calling API body=${JSON.stringify(requestBody)}`);
    try {
      const result = await this.callMarketApi(requestBody, userApiKey);
      await this.redis.set(cacheKey, JSON.stringify(result), SEARCH_TTL_SEC);
      return result;
    } catch (err: any) {
      // Retry with category fallbacks when CategoryCode=0 rejected (400)
      if (err?.response?.status === 400 && requestBody.CategoryCode === 0 && requestBody.ItemName) {
        this.logger.warn('⚠️ CategoryCode=0 rejected – retrying with fallbacks');
        for (const code of CATEGORY_FALLBACKS) {
          try {
            const fallbackBody = { ...requestBody, CategoryCode: code };
            const res = await this.callMarketApi(fallbackBody, userApiKey);
            if (res.totalCount > 0) {
              await this.redis.set(cacheKey, JSON.stringify(res), SEARCH_TTL_SEC);
              return res;
            }
          } catch (_) {}
        }
      }
      this.handleApiError(err, 'search');
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async callMarketApi(body: Record<string, any>, userApiKey?: string): Promise<any> {
    const raw = await this.api.call<any>({
      method: 'POST',
      path: this.SEARCH_PATH,
      body,
      userApiKey,
    });
    const items = (raw?.Items ?? []).map((item: any) => ({
      id: item.Id,
      name: item.Name,
      grade: item.Grade,
      icon: item.Icon,
      bundleCount: item.BundleCount,
      quality: item.Quality,
      marketInfo: {
        currentMinPrice: item.CurrentMinPrice,
        yDayAvgPrice: item.YDayAvgPrice,
        recentPrice: item.RecentPrice,
        tradeRemainCount: item.TradeRemainCount,
      },
    }));
    return {
      pageNo: raw?.PageNo ?? 1,
      pageSize: raw?.PageSize ?? items.length,
      totalCount: raw?.TotalCount ?? items.length,
      items,
    };
  }

  private buildRequestBody(dto: MarketSearchDto): Record<string, any> {
    const categoryCode =
      (typeof dto.subCategory === 'number' ? dto.subCategory : undefined) ??
      (typeof dto.category === 'number' ? dto.category : undefined) ??
      0;
    const raw: Record<string, any> = {
      ItemName: (dto.query ?? '').trim(),
      ItemGrade: dto.grade && dto.grade !== '전체' ? dto.grade : undefined,
      ItemTier: typeof dto.tier === 'number' ? dto.tier : undefined,
      CharacterClass: dto.className && dto.className !== '전체' ? dto.className : undefined,
      CategoryCode: categoryCode,
      Sort: SORT_ALLOWED.has(dto.sort as any) ? dto.sort : 'GRADE',
      SortCondition: SORT_COND_ALLOWED.has(dto.sortCondition as any) ? dto.sortCondition : 'ASC',
      PageNo: dto.pageNo && dto.pageNo > 0 ? dto.pageNo : 1,
    };
    const body: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined || v === null) continue;
      if (k === 'ItemName' && typeof v === 'string' && v.trim() === '') continue;
      body[k] = v;
    }
    return body;
  }

  private hashParams(params: Record<string, any>): string {
    return createHash('md5').update(JSON.stringify(params)).digest('hex').substring(0, 16);
  }

  private handleApiError(err: any, context: string): never {
    if (err instanceof LostArkApiKeyInvalidError) {
      this.logger.error(`❌ [${context}] API key invalid/expired`);
      throw new InternalServerErrorException('API key invalid or expired');
    }
    if (err instanceof LostArkApiForbiddenError) {
      this.logger.error(`❌ [${context}] Access forbidden (IP blocked?)`);
      throw new InternalServerErrorException('API access forbidden');
    }
    if (err instanceof LostArkRateLimitError) {
      this.logger.warn(`⏸ [${context}] Rate limit, retry after ${err.retryAfterSeconds}s`);
      throw new InternalServerErrorException('Rate limit exceeded, please try again later');
    }
    if (err instanceof LostArkCooldownError) {
      this.logger.warn(`⏸ [${context}] API key in cooldown`);
      throw new InternalServerErrorException('API temporarily unavailable');
    }
    const status = err?.response?.status;
    this.logger.error(`❌ [${context}] Market API failed status=${status ?? 'N/A'}: ${err?.message}`);
    throw new InternalServerErrorException('Market search failed');
  }
}
