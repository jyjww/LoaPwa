import axiosInstance from '@/services/axiosInstance';

export interface PriceHistoryPoint {
  t: string; // timestamp
  price: number | null;
  lastAt: string | null;
}

export interface PriceChange {
  changePct: number; // 변동률 (%)
  firstPrice: number; // 첫 번째 가격
  lastPrice: number; // 마지막 가격
}

/**
 * 가격 히스토리 조회
 * @param itemKey - market은 숫자 ID, auction은 "auction:auc:xxxxx"
 * @param range - '24h' | '7d'
 */
export async function fetchPriceHistory(
  itemKey: string,
  range: '24h' | '7d' = '7d',
): Promise<PriceHistoryPoint[]> {
  try {
    const res = await axiosInstance.get<PriceHistoryPoint[]>(`/prices/history/${itemKey}`, {
      params: { range },
      timeout: 3000,
    });
    return res.data || [];
  } catch (error) {
    console.warn(`Failed to fetch price history for ${itemKey}:`, error);
    return [];
  }
}

/**
 * 7일 가격 변동폭 계산
 * @param itemKey - market은 숫자 ID, auction은 "auction:auc:xxxxx"
 * @param previousPrice - 이전 가격 (데이터가 부족할 때 사용)
 */
export async function calculate7DayChange(
  itemKey: string,
  previousPrice?: number,
): Promise<PriceChange | null> {
  try {
    const history = await fetchPriceHistory(itemKey, '7d');
    console.log(`[calculate7DayChange] ${itemKey}:`, history);

    // null 제거 및 유효한 가격만 필터링
    const validPrices = history
      .filter((p) => p.price !== null && p.price > 0)
      .map((p) => ({ ...p, price: p.price! }));

    console.log(`[calculate7DayChange] ${itemKey} validPrices:`, validPrices);

    if (validPrices.length < 1) {
      console.log(
        `[calculate7DayChange] ${itemKey}: insufficient data (${validPrices.length} valid prices)`,
      );
      return null; // 데이터 부족
    }

    let oldPrice: number;
    let newPrice: number;

    if (validPrices.length >= 2) {
      // 2개 이상의 데이터가 있으면 첫 번째와 마지막 비교
      oldPrice = validPrices[0].price;
      newPrice = validPrices[validPrices.length - 1].price;
    } else {
      // 1개 데이터만 있으면 previousPrice와 비교
      newPrice = validPrices[0].price;
      oldPrice = previousPrice ?? newPrice; // previousPrice가 없으면 현재 가격과 동일하게 설정
    }

    const changeAmount = newPrice - oldPrice;
    const changePct = oldPrice > 0 ? (changeAmount / oldPrice) * 100 : 0;

    const result = {
      changePct,
      firstPrice: oldPrice,
      lastPrice: newPrice,
    };

    console.log(`[calculate7DayChange] ${itemKey} result:`, result);
    return result;
  } catch (error) {
    console.warn(`Failed to calculate 7-day change for ${itemKey}:`, error);
    return null;
  }
}
