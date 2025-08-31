import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AuctionSearchDto } from './dto/auction-search.dto';
import { EtcOptions } from '../constants/etcOptions';

@Injectable()
export class AuctionService {
  private readonly BASE_URL = 'https://developer-lostark.game.onstove.com/auctions/items';
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

  async search(dto: AuctionSearchDto) {
    // 📌 요청 Body 변환
    const requestBody = {
      ItemName: dto.query || '',
      ItemGrade: dto.grade === '전체' ? null : dto.grade,
      ItemTier: typeof dto.tier === 'string' ? null : dto.tier,
      CharacterClass: dto.className === '전체' ? null : dto.className,
      CategoryCode: typeof dto.category === 'string' ? 0 : dto.category,
      Sort: dto.sort || 'BIDSTART_PRICE',
      SortCondition: dto.sortCondition || 'ASC',
      PageNo: dto.pageNo || 1,

      // ✅ 문자열 type → 숫자 코드 변환
      EtcOptions: (dto.etcOptions || []).map((opt) => {
        const etc = EtcOptions.find((e) => e.Text === opt.type);
        return {
          FirstOption: etc?.Value ?? 0, // "각인 효과" → 3
          SecondOption: opt.value, // "각성" → 255
          MinValue: opt.minValue ?? null,
          MaxValue: opt.maxValue ?? null,
        };
      }),
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

      return {
        pageNo: data.PageNo ?? 1,
        pageSize: data.PageSize ?? 0,
        totalCount: data.TotalCount ?? 0,
        items:
          data.PageNo &&
          data.PageSize &&
          data.TotalCount &&
          data.PageNo * data.PageSize > data.TotalCount
            ? []
            : (data.Items ?? []).map((item) => ({
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

                // ✅ 옵션 값 변환 (퍼센트 매핑)
                options: (item.Options ?? []).map((o) => {
                  const etcSub = EtcOptions.flatMap((opt) => opt.EtcSubs).find(
                    (sub) => sub.Text === o.OptionName,
                  );

                  let displayValue: string | number = o.Value;
                  if (etcSub?.EtcValues) {
                    const matched = etcSub.EtcValues.find((ev) => ev.Value === o.Value);
                    if (matched) {
                      displayValue = matched.DisplayValue; // "0.39%" 같은 값
                    }
                  }

                  return {
                    name: o.OptionName,
                    value: o.Value,
                    displayValue,
                  };
                }),
              })),
      };
    } catch (err) {
      console.error('Auction API failed:', err.response?.data || err.message);
      throw new InternalServerErrorException('Auction search failed');
    }
  }
}
