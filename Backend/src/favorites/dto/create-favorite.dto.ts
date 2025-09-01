// src/favorites/dto/create-favorite.dto.ts
export class CreateFavoriteDto {
  source: 'auction' | 'market';

  // 공통
  name: string;
  grade: string;
  icon: string;
  currentPrice: number;
  previousPrice?: number;
  targetPrice?: number;

  // 선택(경매장)
  tier?: number;
  quality?: number;
  auctionInfo?: any;
  options?: { name: string; value: number; displayValue: number }[];

  // 선택(거래소)
  itemId?: number;
  marketInfo?: {
    currentMinPrice?: number;
    yDayAvgPrice?: number;
    recentPrice?: number;
    tradeRemainCount?: number;
  };
}
