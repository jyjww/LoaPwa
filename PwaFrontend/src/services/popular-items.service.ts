import { fetchPriceHistory, type PriceHistoryPoint } from './price-history.service';

export interface PopularItem {
  key: string;
  label: string;
  group: string;
  iconUrl: string | null;
  currentPrice: number | null;
  changePct: number | null;
  history: PriceHistoryPoint[];
}

import { API } from './axiosInstance';

export async function fetchPopularItems(): Promise<PopularItem[]> {
  try {
    const res = await fetch(`${API}/prices/popular`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/** 클라이언트에서 직접 history API를 조회할 때 (상세 차트용) */
export { fetchPriceHistory };
