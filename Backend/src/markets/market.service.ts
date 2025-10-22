// src/markets/market.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { MarketSearchDto } from './dto/market-search.dto';

const SORT_ALLOWED = new Set([
  'GRADE',
  'RECENT_PRICE',
  'YDAY_AVG_PRICE',
  'CURRENT_MIN_PRICE',
  'TRADE_COUNT',
]);
const SORT_COND_ALLOWED = new Set(['ASC', 'DESC']);

// ← 필요에 맞게 조정(예시): 50000=재련 재료, 20000=소모품, 40000=각종 재료 등
const CATEGORY_FALLBACKS: number[] = [50000, 20000, 40000];

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly BASE_URL = 'https://developer-lostark.game.onstove.com/markets/items';
  private readonly CATEGORY_URL = 'https://developer-lostark.game.onstove.com/markets/options';
  private readonly TOKEN: string;
  private categoriesCache: any | null = null;
  private categoriesFetchedAt: number | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('LOSTARK_API_KEY');
    if (!apiKey) throw new Error('LOSTARK_API_KEY is not defined in environment variables');
    this.TOKEN = apiKey;
  }

  // ✅ 카테고리 캐싱 메서드
  async getCategories(force = false) {
    const now = Date.now();
    // 캐시가 있고, 24시간 내에 불러온 거라면 그대로 사용
    if (
      !force &&
      this.categoriesCache &&
      this.categoriesFetchedAt &&
      now - this.categoriesFetchedAt < 24 * 60 * 60 * 1000
    ) {
      this.logger.debug('📦 Using cached market categories');
      return this.categoriesCache;
    }

    this.logger.debug('📡 Fetching market categories from API...');
    const res = await lastValueFrom(
      this.http.get(this.CATEGORY_URL, {
        headers: {
          Authorization: `bearer ${this.TOKEN}`,
          Accept: 'application/json',
        },
        timeout: 5000,
      }),
    );

    this.categoriesCache = res.data;
    this.categoriesFetchedAt = now;
    this.logger.debug('✅ Market categories cached');
    return this.categoriesCache;
  }

  async search(dto: MarketSearchDto) {
    // 1) DTO → 요청 바디 구성
    const categoryCode =
      (typeof dto.subCategory === 'number' ? dto.subCategory : undefined) ??
      (typeof dto.category === 'number' ? dto.category : undefined) ??
      (dto.category === '전체' || dto.subCategory === '전체' ? 0 : undefined) ??
      0; // ← '전체'는 0으로 강제 전송

    const rawBody = {
      ItemName: (dto.query ?? '').trim(),
      ItemGrade: dto.grade && dto.grade !== '전체' ? dto.grade : undefined,
      ItemTier: typeof dto.tier === 'number' ? dto.tier : undefined,
      CharacterClass: dto.className && dto.className !== '전체' ? dto.className : undefined,
      CategoryCode: categoryCode, // ← 0도 보낼 수 있게 둠
      Sort: SORT_ALLOWED.has(dto.sort as any) ? dto.sort : 'GRADE',
      SortCondition: SORT_COND_ALLOWED.has(dto.sortCondition as any) ? dto.sortCondition : 'ASC',
      PageNo: dto.pageNo && dto.pageNo > 0 ? dto.pageNo : 1,
    };

    // 2) 불필요 키 제거(주의: 0은 유지!)
    const requestBody: Record<string, any> = {};
    for (const [k, v] of Object.entries(rawBody)) {
      if (v === undefined || v === null) continue;
      if (k === 'ItemName' && typeof v === 'string' && v.trim() === '') continue;
      // ❌ 기존: 0이면 제거 → 제거하지 마세요!
      requestBody[k] = v;
    }

    try {
      this.logger.debug(`📡 Market.search body=${JSON.stringify(requestBody)}`);
      return await this.postMarket(requestBody);
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;

      // 3) 폴백: CategoryCode=0 이 거절되는 환경을 위해 후보 카테고리로 재시도
      if (status === 400 && requestBody.CategoryCode === 0 && requestBody.ItemName) {
        this.logger.warn(
          `⚠️ CategoryCode=0 rejected. fallback retry with candidates=${CATEGORY_FALLBACKS.join(',')}`,
        );
        for (const code of CATEGORY_FALLBACKS) {
          try {
            const fallbackBody = { ...requestBody, CategoryCode: code };
            this.logger.debug(`↻ retry with CategoryCode=${code}`);
            const res = await this.postMarket(fallbackBody);
            if (res.totalCount > 0) {
              this.logger.debug(
                `✅ fallback success with CategoryCode=${code}, items=${res.items.length}`,
              );
              return res;
            }
          } catch (e) {
            // 다음 후보로 넘어감
          }
        }
      }

      this.logger.error(
        `❌ Market API failed (${status ?? 'no-status'}) ${err?.message}` +
          (body ? `\n↳ body=${JSON.stringify(body)}` : ''),
      );
      throw new InternalServerErrorException('Market search failed');
    }
  }

  private async postMarket(body: any) {
    const res = await lastValueFrom(
      this.http.post(this.BASE_URL, body, {
        headers: {
          Authorization: `bearer ${this.TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 7000,
      }),
    );
    const data = res.data;
    const items = (data?.Items ?? []).map((item: any) => ({
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
      pageNo: data?.PageNo ?? 1,
      pageSize: data?.PageSize ?? items.length,
      totalCount: data?.TotalCount ?? items.length,
      items,
    };
  }
}
