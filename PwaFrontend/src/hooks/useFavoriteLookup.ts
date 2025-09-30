// src/hooks/useFavoriteLookup.ts
import { useMemo } from 'react';
import { makeAuctionKey } from '@shared/utils/matchAuctionKey';
export type { CategoryKey } from '@shared/utils/matchAuctionKey';

type Favorite = {
  id: string;
  source: 'auction' | 'market';
  itemId?: number | null; // market 전용
  matchKey?: string | null; // auction 전용
};

type AuctionItemLike = {
  name: string;
  grade: string;
  tier?: number | null;
  quality?: number | null;
  options?: Array<{
    name: string;
    value: number | string | null;
    displayValue?: number | string | null;
  }>;
};

/** 옵션을 숫자화 + 이름 기준 안정 정렬 (서버/클라 동일화) */
function normalizeOptions(opts?: AuctionItemLike['options']) {
  if (!Array.isArray(opts)) return [] as Array<{ name: string; value: number }>;
  const norm = opts.map((o) => {
    const raw =
      typeof o?.value === 'string' && !Number.isNaN(Number(o.value))
        ? Number(o.value)
        : typeof o?.value === 'number'
          ? o.value
          : 0;
    return { name: String(o?.name ?? ''), value: raw };
  });
  norm.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
  return norm;
}

export function useFavoriteLookup(favorites: Favorite[]) {
  return useMemo(() => {
    const byId = new Map<string, Favorite>(); // favorite UUID -> Favorite
    const marketByItemId = new Map<number, Favorite>(); // itemId -> Favorite (market)
    const auctionByMatchKey = new Map<string, Favorite>(); // matchKey -> Favorite (auction)

    for (const f of favorites ?? []) {
      if (!f) continue;
      if (f.id) byId.set(f.id, f);

      if (f.source === 'market' && typeof f.itemId === 'number') {
        marketByItemId.set(f.itemId, f);
      }

      if (f.source === 'auction' && f.matchKey) {
        auctionByMatchKey.set(f.matchKey, f);
      }
    }

    /** UUID로 바로 찾기 */
    const getById = (id?: string | null) => (id ? (byId.get(id) ?? null) : null);

    /** 거래소용: itemId로 찾기 */
    const getMarketFavorite = (itemId?: number | string | null) => {
      if (itemId == null) return null;
      const num = typeof itemId === 'string' ? Number(itemId) : itemId;
      if (!Number.isFinite(num)) return null;
      return marketByItemId.get(num) ?? null;
    };

    /** 경매용: 이미 계산된 matchKey로 찾기 */
    const getAuctionFavoriteByMatchKey = (mk?: string | null) =>
      mk ? (auctionByMatchKey.get(mk) ?? null) : null;

    /** 경매용: 아이템으로부터 matchKey 생성 후 찾기 */
    const getAuctionFavorite = (item: AuctionItemLike) => {
      if (!item?.name || !item?.grade) return null;
      const options = normalizeOptions(item.options);
      const mk = makeAuctionKey({
        name: item.name,
        grade: item.grade,
        tier: item.tier ?? undefined,
        quality: item.quality ?? undefined,
        options, // {name, value:number}만 넘김
      });
      return getAuctionFavoriteByMatchKey(mk);
    };

    return {
      // 맵들(디버깅/고급 사용 시)
      byId,
      marketByItemId,
      auctionByMatchKey,
      // 조회기
      getById,
      getMarketFavorite,
      getAuctionFavoriteByMatchKey,
      getAuctionFavorite,
    };
  }, [favorites]);
}
