import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '@/cache/redis.service';
import { LostArkApiClient } from '@/lostark/lostark-api.client';
import {
  LostArkApiKeyInvalidError,
  LostArkApiForbiddenError,
  LostArkRateLimitError,
  LostArkCooldownError,
} from '@/lostark/errors';
import { AuctionSearchDto } from './dto/auction-search.dto';
import { EtcOptions } from '../constants/etcOptions';

const SEARCH_TTL_SEC = 300;    // 5 minutes
const OPTIONS_TTL_SEC = 86400; // 24 hours

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);
  private readonly SEARCH_PATH = '/auctions/items';
  private readonly OPTIONS_PATH = '/auctions/options';

  constructor(
    private readonly api: LostArkApiClient,
    private readonly redis: RedisService,
  ) {}

  // ── Options: 24h cache ───────────────────────────────────────────────────

  async getOptions(force = false): Promise<any> {
    const cacheKey = 'options:auction';
    if (!force) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug('📦 Auction options: cache hit');
        return JSON.parse(cached);
      }
    }
    this.logger.debug('📡 Auction options: fetching from API');
    try {
      const data = await this.api.call({ method: 'GET', path: this.OPTIONS_PATH, timeout: 5000 });
      await this.redis.set(cacheKey, JSON.stringify(data), OPTIONS_TTL_SEC);
      this.logger.debug('✅ Auction options cached (24h)');
      return data;
    } catch (err) {
      this.handleApiError(err, 'getOptions');
    }
  }

  // ── Search: cache-first, 5 min TTL ──────────────────────────────────────

  async search(dto: AuctionSearchDto, userApiKey?: string): Promise<any> {
    const requestBody = this.buildRequestBody(dto);
    const cacheKey = `search:auction:${this.hashParams(requestBody)}`;

    // 1. Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`📦 Auction search: cache hit (${cacheKey})`);
      return JSON.parse(cached);
    }

    // 2. Cache miss → call API
    this.logger.debug(`📡 Auction search: miss, calling API`);
    try {
      const result = await this.callAuctionApi(requestBody, userApiKey);
      await this.redis.set(cacheKey, JSON.stringify(result), SEARCH_TTL_SEC);
      return result;
    } catch (err) {
      this.handleApiError(err, 'search');
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async callAuctionApi(body: Record<string, any>, userApiKey?: string): Promise<any> {
    const raw = await this.api.call<any>({
      method: 'POST',
      path: this.SEARCH_PATH,
      body,
      userApiKey,
      timeout: 7000,
    });

    const data = raw ?? {};
    const pageNo = data.PageNo ?? 1;
    const pageSize = data.PageSize ?? 0;
    const totalCount = data.TotalCount ?? 0;

    const items =
      pageNo && pageSize && totalCount && pageNo * pageSize > totalCount
        ? []
        : (data.Items ?? []).map((item: any) => ({
            id: item.Id,
            name: item?.Name ?? '-',
            grade: item?.Grade ?? 'Unknown',
            tier: item?.Tier ?? 0,
            icon: item?.Icon ?? null,
            quality: item?.GradeQuality ?? null,
            currentPrice: item.AuctionInfo?.BuyPrice ?? 0,
            previousPrice: item.AuctionInfo?.StartPrice ?? null,
            tradeCount: item.AuctionInfo?.TradeCount ?? null,
            auctionInfo: item.AuctionInfo,
            options: (item.Options ?? []).map((o: any) => {
              const etcSub = EtcOptions.flatMap((opt) => opt.EtcSubs).find(
                (sub) => sub.Text === o.OptionName,
              );
              let displayValue: string | number = o.Value;
              if (etcSub?.EtcValues) {
                const matched = etcSub.EtcValues.find((ev: any) => ev.Value === o.Value);
                if (matched) displayValue = matched.DisplayValue;
              }
              return { name: o.OptionName, value: o.Value, displayValue };
            }),
          }));

    return { pageNo, pageSize, totalCount, items };
  }

  private buildRequestBody(dto: AuctionSearchDto): Record<string, any> {
    return {
      ItemName: dto.query || '',
      ItemGrade: dto.grade === '전체' ? null : dto.grade,
      ItemTier: typeof dto.tier === 'string' ? null : dto.tier && dto.tier > 0 ? dto.tier : null,
      CharacterClass: dto.className === '전체' ? null : dto.className,
      CategoryCode: typeof dto.category === 'string' ? 10000 : dto.category || 10000,
      Sort: dto.sort || 'BIDSTART_PRICE',
      SortCondition: dto.sortCondition || 'ASC',
      PageNo: dto.pageNo || 1,
      EtcOptions: (dto.etcOptions || []).map((opt) => {
        const etc = EtcOptions.find((e) => e.Text === opt.type);
        return {
          FirstOption: etc?.Value ?? 0,
          SecondOption: opt.value,
          MinValue: opt.minValue ?? null,
          MaxValue: opt.maxValue ?? null,
        };
      }),
    };
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
    this.logger.error(`❌ [${context}] Auction API failed status=${status ?? 'N/A'}: ${err?.message}`);
    throw new InternalServerErrorException('Auction search failed');
  }
}
