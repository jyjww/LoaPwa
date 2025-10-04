import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import MarketItemCard from '@/components/MarketItemCard';
import { Filter, Search } from 'lucide-react';
import { marketCategories } from '@/constants/marketCategories';
import SearchBar from '@/components/pages/SearchBar';
import { searchMarket } from '@/services/market.dto';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '@/services/favorites/favorites.service';
import { useFavoriteLookup } from '@/hooks/useFavoriteLookup';

const Market = () => {
  const [selectedCategory, setSelectedCategory] = useState<number | 'All'>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | 'All'>('All');

  // ✅ SearchBar와 타입을 맞춘 filters 상태 (원본 유지)
  const [filters, setFilters] = useState({
    query: '',
    grade: '전체',
    tier: '전체' as number | '전체',
    className: '전체',
    category: '전체' as number | '전체',
    subCategory: '전체' as number | '전체',
    pageNo: 1,
  });

  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // ✅ 무한 스크롤 관련 상태
  const [pageNo, setPageNo] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  // ✅ 즐겨찾기 상태 보관
  const [favorites, setFavorites] = useState<any[]>([]);
  const { getMarketFavorite } = useFavoriteLookup(favorites);

  const { toast } = useToast();
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  // ✅ 최초 마운트 시 즐겨찾기 로드
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchFavorites();
        setFavorites(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn('[Market] fetchFavorites failed:', e);
        setFavorites([]);
      }
    })();
  }, []);

  // ✅ 즐겨찾기 목록을 새로고침하는 헬퍼
  const refreshFavorites = useCallback(async () => {
    try {
      const list = await fetchFavorites();
      setFavorites(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('[Market] refreshFavorites failed:', e);
    }
  }, []);

  const toMarketDto = (base: typeof filters, page: number) => ({
    ...base,
    pageNo: page,
    category: base.category === '전체' ? undefined : base.category,
    subCategory: base.subCategory === '전체' ? undefined : base.subCategory,
    tier: base.tier === '전체' ? undefined : base.tier,
    grade: base.grade === '전체' ? undefined : base.grade,
    className: base.className === '전체' ? undefined : base.className,
  });

  const fetchPage = useCallback(
    async (page: number, mode: 'reset' | 'append') => {
      // 진행 중이면 취소
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        setIsLoading(true);

        const data = await searchMarket(toMarketDto(filters, page), { signal: controller.signal });

        const nextItems = data.items ?? [];
        setItems((prev) => (mode === 'reset' ? nextItems : [...prev, ...nextItems]));

        const pageSize = data.pageSize && data.pageSize > 0 ? data.pageSize : nextItems.length;
        const total = typeof data.totalCount === 'number' ? data.totalCount : 0;
        const loadedCount = (page - 1) * (pageSize || 0) + nextItems.length;

        setTotalCount(total || nextItems.length);
        setHasMore(total === 0 ? nextItems.length > 0 : loadedCount < total);
        setPageNo(page);
      } catch (err: any) {
        // 취소 계열 에러 무시
        const isCanceled =
          err?.name === 'AbortError' ||
          err?.name === 'CanceledError' ||
          err?.code === 'ERR_CANCELED';
        if (!isCanceled) {
          // 여기서 콘솔 스팸 줄이고 싶으면 주석 유지
          // console.warn('Market API 실패:', err);
          setHasMore(false);
        }
      } finally {
        setIsLoading(false);
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [filters],
  );

  useEffect(() => {
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  // 🔎 검색 버튼: 1페이지로 초기화 후 새로 로드
  const handleSearchButton = async () => {
    setIsSearching(true);
    setItems([]);
    setPageNo(1);
    setHasMore(true);
    setTotalCount(null);
    await fetchPage(1, 'reset');
  };

  // 🔧 SearchBar에서 필터 변경 시 pageNo 1로 초기화(원본 유지)
  const handleChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, pageNo: 1 }));
  };

  // ✅ 카드에서 호출되는 즐겨찾기 토글
  const handleFavorite = async (item: any) => {
    if (busyIds.has(item.id)) return;
    setBusyIds((s) => new Set(s).add(item.id));
    try {
      const existing = getMarketFavorite(item.id);
      if (existing) {
        await removeFavorite(existing.id);
        toast({ title: '즐겨찾기 해제', description: `${item.name}을(를) 해제했어요.` });
        // 낙관적 업데이트 (즉시 반영)
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
      } else {
        const created = await addFavorite({
          source: 'market',
          itemId: item.id,
          name: item.name,
          grade: item.grade,
          icon: item.icon,
          currentPrice: item.marketInfo?.recentPrice ?? item.marketInfo?.currentMinPrice ?? 0,
          previousPrice: item.marketInfo?.yDayAvgPrice ?? 0,
          marketInfo: {
            currentMinPrice: item.marketInfo?.currentMinPrice ?? 0,
            yDayAvgPrice: item.marketInfo?.yDayAvgPrice ?? 0,
            recentPrice: item.marketInfo?.recentPrice ?? 0,
            tradeRemainCount: item.marketInfo?.tradeRemainCount ?? 0,
          },
        });
        toast({ title: '즐겨찾기 추가', description: `${item.name}을(를) 저장했어요.` });
        // 낙관적 업데이트 (즉시 반영)
        setFavorites((prev) => [...prev, created]);
      }

      // ✅ 서버 기준으로 재동기화는 "조용히" (실패해도 토스트 X)
      refreshFavorites().catch((e) => console.warn('refreshFavorites failed', e));
    } catch (err) {
      console.error('❌ 즐겨찾기 토글 실패:', err);
      toast({
        title: '오류',
        description: '즐겨찾기 처리 중 문제가 발생했어요.',
        variant: 'destructive',
      });
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(filters.query.toLowerCase()),
  );

  // ✅ IntersectionObserver: sentinel 보이면 다음 페이지 로드
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!isSearching) return;
    if (loadingRef.current || isLoading || !hasMore) return;
    loadingRef.current = true;
    await fetchPage(pageNo + 1, 'append');
    loadingRef.current = false;
  }, [isLoading, hasMore, pageNo, fetchPage]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !isSearching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: null, rootMargin: '400px', threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isSearching, loadMore]);

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Navigation />

        <Card className="bg-gradient-to-br from-card to-primary/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              거래소 검색 (Market)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 🔎 검색바 (원본 유지) */}
            <SearchBar filters={filters} onChange={handleChange} onSearch={handleSearchButton} />

            {/* 📂 카테고리 (원본 유지) */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Category:</span>
              <Button
                variant={selectedCategory === 'All' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSubCategory('All');
                  setFilters((prev) => ({
                    ...prev,
                    category: '전체',
                    subCategory: '전체',
                    pageNo: 1,
                  }));
                }}
              >
                전체
              </Button>
              {marketCategories.map((cat) => (
                <Button
                  key={cat.code}
                  variant={selectedCategory === cat.code ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(cat.code);
                    setSelectedSubCategory('All');
                    setFilters((prev) => ({
                      ...prev,
                      category: cat.code,
                      subCategory: '전체',
                      pageNo: 1,
                    }));
                  }}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* 📂 소분류 (원본 유지) */}
            {selectedCategory !== 'All' && (
              <div className="ml-6 flex flex-wrap gap-2">
                {marketCategories
                  .find((c) => c.code === selectedCategory)
                  ?.subs.map((sub) => (
                    <Button
                      key={sub.code}
                      variant={selectedSubCategory === sub.code ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedSubCategory(sub.code);
                        setFilters((prev) => ({ ...prev, subCategory: sub.code, pageNo: 1 }));
                      }}
                    >
                      {sub.label}
                    </Button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 결과 헤더 (원본 UX 유지) */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {totalCount != null ? `${totalCount} items loaded` : `${items.length} items loaded`}
          </h2>
        </div>

        {/* 결과 그리드 (원본 유지: filteredItems가 아닌 items 사용) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => {
            // ✅ 각 아이템에 매칭되는 즐겨찾기 조회
            const fav = getMarketFavorite(item.id);
            return (
              <MarketItemCard
                key={`${item.id}-${index}`}
                item={{
                  id: item.id,
                  name: item.name,
                  grade: item.grade,
                  icon: item.icon,
                  quality: item.quality,
                  marketInfo: {
                    currentMinPrice: item.marketInfo?.currentMinPrice ?? 0,
                    yDayAvgPrice: item.marketInfo?.yDayAvgPrice ?? 0,
                    recentPrice: item.marketInfo?.recentPrice ?? 0,
                    tradeRemainCount: item.marketInfo?.tradeRemainCount ?? 0,
                  },
                }}
                onFavorite={handleFavorite}
                isFavorite={!!fav} // ✅ 카드에 상태 전달
                favoriteId={fav?.id ?? ''} // ✅ Alarm에 서버 UUID 전달 (없으면 빈 문자열)
              />
            );
          })}
        </div>

        {/* 무한 스크롤 sentinel */}
        <div ref={loaderRef} className="h-12 flex items-center justify-center">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">불러오는 중...</span>
          ) : !hasMore && items.length > 0 ? (
            <span className="text-sm text-muted-foreground">여기까지 끝!</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Market;
