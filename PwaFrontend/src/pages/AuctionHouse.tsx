// src/pages/AuctionHouse.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import ItemCard from '@/components/AuctionItemCard';
import { Search } from 'lucide-react';
import SearchBar from '@/components/pages/SearchBar';
import CategoryFilter from '@/components/pages/CategoryFilter';
import { CategoryEtcOptions } from '@/constants/etcOptions';
import EtcOptionsFilter from '@/components/pages/EtcOptionsFilter';
import { searchAuctions } from '@/services/auction.dto';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '@/services/favorites/favorites.service';
import { makeAuctionKey, type CategoryKey } from '@shared/matchAuctionKey';
import { useFavoriteLookup } from '@/hooks/useFavoriteLookup';

type CanonOption = { name: string; value: number; displayValue: number };

const normalizeOptions = (opts?: any[]): CanonOption[] =>
  Array.isArray(opts)
    ? opts
        .map((o) => {
          const rawV = Number(
            typeof o?.value === 'string' ? o.value : typeof o?.value === 'number' ? o.value : 0,
          );
          const dv = typeof o?.displayValue === 'number' ? o.displayValue : rawV;
          return { name: String(o?.name ?? '').trim(), value: rawV, displayValue: dv };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

const getTier = (item: any) => item.tier ?? item.auctionInfo?.tier ?? item.info?.tier ?? null;
const getQuality = (item: any) =>
  item.quality ?? item.auctionInfo?.quality ?? item.info?.quality ?? null;

// AuctionItemCard와 동일한 옵션 폴백 규칙
const pickOptionsForKey = (item: any) =>
  item.options ??
  (Array.isArray(item.auctionInfo?.options) ? item.auctionInfo.options : undefined) ??
  item.info?.options ??
  [];

const AuctionHouse = () => {
  const [filters, setFilters] = useState({
    query: '',
    grade: '전체',
    tier: '전체' as number | '전체',
    className: '전체',
    category: '전체' as number | '전체',
    subCategory: '전체' as number | '전체',
    etcOptions: [] as Array<{ type: string; value: number | null }>,
    pageNo: 1,
  });

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debRef = useRef<number | undefined>(undefined);

  // ✅ 즐겨찾기 상태(서버) & 조회 헬퍼
  const [favorites, setFavorites] = useState<any[]>([]);
  const { getAuctionFavorite } = useFavoriteLookup(favorites);

  // 즉시구매가가 있는 제품만 조회
  const [onlyBuyNow, setOnlyBuyNow] = useState(false);

  // 최초 로드 시 즐겨찾기 가져오기
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchFavorites();
        setFavorites(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn('[Auction] fetchFavorites failed:', e);
        setFavorites([]);
      }
    })();
  }, []);

  // 즐겨찾기 새로고침
  const refreshFavorites = useCallback(async () => {
    try {
      const list = await fetchFavorites();
      setFavorites(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('[Auction] refreshFavorites failed:', e);
    }
  }, []);

  const triggerSearch = (reset = true) => {
    window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setIsSearching(true);
      await handleSearch(reset, abortRef.current.signal);
    }, 250); // 250~400ms 권장
  };

  const handleSearch = async (reset = true, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await searchAuctions(filters, { signal });
      if (reset) setResults(data.items || []);
      else setResults((prev) => [...prev, ...(data.items || [])]);

      setTotalCount(data.totalCount ?? 0);
      setHasMore((reset ? 0 : results.length) + (data.items?.length || 0) < (data.totalCount ?? 0));
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('API 검색 실패:', err);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchButton = () => {
    // setIsSearching(true);
    setResults([]);
    setHasMore(true);
    setFilters((prev) => ({ ...prev, pageNo: 1 }));
    triggerSearch(true);
  };

  const handleChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, pageNo: 1 }));
    triggerSearch(true);
  };

  useEffect(() => {
    if (!isSearching) return;
    (async () => {
      if (!loading) await handleSearch(filters.pageNo === 1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.pageNo, isSearching]);

  useEffect(() => {
    const target = loaderRef.current;
    if (!target) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setFilters((prev) => ({ ...prev, pageNo: (prev.pageNo as number) + 1 }));
        }
      },
      { threshold: 0.1 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [loading, hasMore]);

  const filteredItems = useMemo(() => {
    return results.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(filters.query.toLowerCase());
      const matchesGrade = filters.grade === '전체' || item.grade === filters.grade;
      const hasBuyNow =
        (typeof item?.auctionInfo?.BuyPrice === 'number' && item.auctionInfo.BuyPrice > 0) ||
        (typeof item?.currentPrice === 'number' && item.currentPrice > 0);
      const buyNowOk = !onlyBuyNow || hasBuyNow;
      return matchesSearch && matchesGrade && buyNowOk;
    });
  }, [results, filters, onlyBuyNow]);

  // 경매 카테고리 추정(기존 로직 유지)
  const classifyAuctionCategory = (item: any): CategoryKey => {
    if (item.name.includes('비상의 돌')) return 'stone';
    if (/멸화|홍염/.test(item.name)) return 'gem';
    const opts = pickOptionsForKey(item);
    const hasOptions = Array.isArray(opts) && opts.length > 0;
    if (hasOptions && item.quality != null) return 'accessory';
    return 'generic';
  };

  // 공통: 키에 쓸 파츠를 만들어주는 헬퍼
  const buildKeyParts = (item: any) => {
    const category = classifyAuctionCategory(item);
    let canonOptions = normalizeOptions(pickOptionsForKey(item));

    const name = String(item.name ?? '').trim();
    const grade = item.grade;
    const tier = getTier(item);
    let quality = getQuality(item);

    // ✅ 보석이면 옵션/품질 제외
    if (category === 'gem') {
      canonOptions = [];
      quality = null;
    }

    // ✅ generic은 품질 제외(선택)
    if (category === 'generic') {
      quality = null;
    }

    return { category, name, grade, tier, quality, canonOptions };
  };

  const toAuctionLike = ({
    name,
    grade,
    tier,
    quality,
    canonOptions,
  }: {
    name: string;
    grade: string;
    tier: number | null;
    quality: number | null;
    canonOptions: CanonOption[];
  }) => ({
    name,
    grade,
    tier,
    quality,
    options: canonOptions.map((o) => ({ name: o.name, value: o.value })),
  });

  // ✅ 즐겨찾기 토글 (matchKey/옵션 정규화 통일)
  const handleToggleFavorite = async (item: any) => {
    try {
      const { category, name, grade, tier, quality, canonOptions } = buildKeyParts(item);

      const matchKey = makeAuctionKey(
        { name, grade, tier, quality, options: canonOptions },
        category,
      );

      const likeObj = toAuctionLike({ name, grade, tier, quality, canonOptions });

      const existing = getAuctionFavorite(likeObj);
      if (existing) {
        await removeFavorite(existing.id);
      } else {
        await addFavorite({
          source: 'auction',
          itemId: item.id ?? undefined,
          matchKey,
          name,
          grade,
          tier,
          icon: item.icon,
          quality,
          currentPrice: item.currentPrice,
          previousPrice: item.previousPrice,
          auctionInfo: item.auctionInfo,
          options: canonOptions,
        });
      }
      await refreshFavorites();
    } catch (err) {
      console.error('즐겨찾기 토글 실패:', err);
      alert('즐겨찾기 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Navigation />

        <Card className="bg-gradient-to-br from-card to-primary/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              경매장 검색 (Auction)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchBar filters={filters} onChange={handleChange} onSearch={handleSearchButton} />

            <CategoryFilter
              category={filters.category}
              subCategory={filters.subCategory}
              onCategoryChange={(code) =>
                setFilters((prev) => ({ ...prev, category: code, subCategory: '전체' }))
              }
              onSubCategoryChange={(sub) => setFilters((prev) => ({ ...prev, subCategory: sub }))}
            />

            {!['전체', 10000, 210000].includes(filters.category) && (
              <EtcOptionsFilter
                availableOptions={CategoryEtcOptions[filters.category as number] || []}
                selected={filters.etcOptions}
                onChange={(opts) => setFilters((prev) => ({ ...prev, etcOptions: opts }))}
                subCategory={filters.subCategory as number}
              />
            )}
          </CardContent>
        </Card>

        {/* 결과 */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {loading ? 'Loading...' : `${totalCount} items found`}
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyBuyNow}
              onChange={(e) => setOnlyBuyNow(e.target.checked)}
            />
            즉시구매가 있는 매물만
          </label>
        </div>

        {/* ✅ 즐겨찾기 상태 내려주기: isFavorite / favoriteId */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => {
            const { category, name, grade, tier, quality, canonOptions } = buildKeyParts(item);

            const matchKey = makeAuctionKey(
              { name, grade, tier, quality, options: canonOptions },
              category,
            );

            const priceSig =
              item.currentPrice != null || item.previousPrice != null || item.tradeCount != null
                ? `${item.currentPrice ?? ''}-${item.previousPrice ?? ''}-${item.tradeCount ?? ''}`
                : undefined;

            const uniqueness =
              item.id ??
              item.auctionInfo?.Uid ??
              item.info?.auctionInfo?.Uid ??
              item.auctionInfo?.EndDate ??
              item.info?.auctionInfo?.EndDate ??
              priceSig ??
              idx;

            const rowKey = `${matchKey}-${uniqueness}`;

            const fav = getAuctionFavorite(
              toAuctionLike({ name, grade, tier, quality, canonOptions }),
            );

            return (
              <ItemCard
                key={rowKey}
                item={item}
                showAlarm
                onFavorite={() => handleToggleFavorite(item)}
                favoriteId={fav?.id}
              />
            );
          })}
        </div>

        {/* 무한 스크롤 로더 */}
        <div
          ref={loaderRef}
          className="h-10 flex justify-center items-center text-muted-foreground"
        >
          {loading && <span>Loading ...</span>}
          {!hasMore && <span>No more Items</span>}
        </div>
      </div>
    </div>
  );
};

export default AuctionHouse;
