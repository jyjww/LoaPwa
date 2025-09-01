// src/markets/market.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { MarketSearchDto } from './dto/market-search.dto';

@Injectable()
export class MarketService {
  private readonly BASE_URL = 'https://developer-lostark.game.onstove.com/markets/items';
  private readonly TOKEN: string;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('LOSTARK_API_KEY');
    if (!apiKey) {
      throw new Error('LOSTARK_API_KEY is not defined in environment variables');
    }
    this.TOKEN = apiKey;
  }

  async search(dto: MarketSearchDto) {
    // 📌 프론트(dto: 소문자) → Lost Ark API(대문자) 변환
    const requestBody = {
      ItemName: dto.query || '',
      ItemGrade: dto.grade === '전체' ? null : dto.grade,
      ItemTier: typeof dto.tier === 'string' ? null : dto.tier,
      CharacterClass: dto.className === '전체' ? null : dto.className,
      CategoryCode:
        dto.subCategory && dto.subCategory !== '전체'
          ? dto.subCategory
          : typeof dto.category === 'string'
            ? 0
            : dto.category,
      Sort: dto.sort || 'GRADE',
      SortCondition: dto.sortCondition || 'ASC',
      PageNo: dto.pageNo || 1,
    };

    try {
      const response = await lastValueFrom(
        this.http.post(this.BASE_URL, requestBody, {
          headers: {
            Authorization: `bearer ${this.TOKEN}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const data = response.data;

      // 📌 프론트에서 바로 사용할 수 있게 다시 소문자 변환
      return {
        pageNo: data.PageNo ?? 1,
        pageSize: data.PageSize ?? 0,
        totalCount: data.TotalCount ?? 0,
        items: (data.Items ?? []).map((item) => ({
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
        })),
      };
    } catch (err) {
      console.error('Market API failed:', err.response?.data || err.message);
      throw new InternalServerErrorException('Market search failed');
    }
  }
}
