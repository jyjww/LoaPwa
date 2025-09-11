export type FavoriteSource = 'auction' | 'market';

export interface FavoritePayload {
  source: FavoriteSource;
  name: string;
  grade: string;
  icon: string;
  tier?: number;
  quality?: number;
  currentPrice: number;
  previousPrice?: number;
  auctionInfo?: Record<string, any>;
  marketInfo?: Record<string, any>;
  options?: Array<{ name: string; value: number; displayValue: number }>;
  itemId?: number;
  targetPrice?: number;
}

export interface FavoriteResponse extends FavoritePayload {
  id: string;
  targetPrice: number;
  isAlerted: boolean;
  active: boolean;
}
