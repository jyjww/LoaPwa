import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import MarketItemCard from '@/components/MarketItemCard';
import { Filter, Search, UserPlus, AlertCircle } from 'lucide-react';
import { marketCategories } from '@/constants/marketCategories';
import SearchBar from '@/components/pages/SearchBar';
import { searchMarket } from '@/services/market.dto';
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from '@/services/favorites/favorites.service';
import { useFavoriteLookup } from '@/hooks/useFavoriteLookup';
import { ItemPriceService } from '@/services/item-price.service';
import { getCurrentAnonId, getOrCreateAnonId } from '@/services/anonService';

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

  // ✅ 익명 사용자 상태
  const [anonId, setAnonId] = useState<string | null>(null);
  const [isCreatingAnon, setIsCreatingAnon] = useState(false);

  // ✅ 즐겨찾기 상태 보관
  const [favorites, setFavorites] = useState<any[]>([]);
  const { getMarketFavorite } = useFavoriteLookup(favorites);

  const { toast } = useToast();
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  // 가격 정렬 관련 상태
  const [priceSortEnabled, setPriceSortEnabled] = useState(false);
  const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isCollectingPrices, setIsCollectingPrices] = useState(false);
  const [sortedPriceItems, setSortedPriceItems] = useState<any[]>([]);
  const [cachedSearchHash, setCachedSearchHash] = useState<string | null>(null);

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

  // 익명 사용자 ID 확인
  useEffect(() => {
    const currentAnonId = getCurrentAnonId();
    setAnonId(currentAnonId);
  }, []);

  // 익명 사용자 생성 함수
  const handleCreateAnonUser = async () => {
    if (isCreatingAnon) return; // 중복 호출 방지

    setIsCreatingAnon(true);
    try {
      const newAnonId = await getOrCreateAnonId();
      setAnonId(newAnonId);

      // 프로덕션 환경에서는 anonId를 노출하지 않음
      const isProd = import.meta.env.PROD;
      if (isProd) {
        alert('임시 사용자 등록 완료!');
      } else {
        alert(`임시 사용자 등록 완료!\nID: ${newAnonId.substring(0, 8)}...`);
      }
    } catch (error) {
      console.error('익명 사용자 생성 실패:', error);
      alert('임시 사용자 등록에 실패했습니다.');
    } finally {
      setIsCreatingAnon(false);
    }
  };

  // ✅ 즐겨찾기 목록을 새로고침하는 헬퍼
  const refreshFavorites = useCallback(async () => {
    try {
      const list = await fetchFavorites();
      setFavorites(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('[Market] refreshFavorites failed:', e);
    }
  }, []);

  // 가격 정렬 데이터 수집
  const collectPriceData = useCallback(async () => {
    if (isCollectingPrices) return;

    setIsCollectingPrices(true);
    try {
      const searchRequest = {
        query: filters.query,
        grade: filters.grade,
        tier: filters.tier,
        className: filters.className,
        category: filters.category,
        subCategory: filters.subCategory,
      };

      const result = await ItemPriceService.collectAndSortMarketResults(searchRequest, {
        sort: priceSortOrder,
        limit: 100,
      });

      setCachedSearchHash(result.searchHash);
      setPriceSortEnabled(true);

      console.log(`🔑 Saved search hash: ${result.searchHash}`);
      console.log(`🔑 Full result object:`, result);

      // 수집 완료 후 정렬된 데이터 조회
      setTimeout(() => {
        fetchSortedPriceData();
      }, 1000);

      console.log(`✅ Collected ${result.total} market items for price sorting`);
    } catch (error) {
      console.error('❌ Failed to collect price data:', error);
    } finally {
      setIsCollectingPrices(false);
    }
  }, [filters, priceSortOrder, isCollectingPrices]);

  // 정렬된 가격 데이터 조회
  const fetchSortedPriceData = useCallback(async () => {
    if (!priceSortEnabled || !cachedSearchHash) return;

    console.log(`🔍 Fetching sorted data with hash: ${cachedSearchHash}`);
    console.log(
      `🔍 Current state - priceSortEnabled: ${priceSortEnabled}, cachedSearchHash: ${cachedSearchHash}`,
    );

    try {
      const requestData = {
        source: 'market' as const,
        searchHash: cachedSearchHash,
        sort: priceSortOrder,
        limit: 100,
        offset: 0,
      };
      console.log(`📤 API request data:`, requestData);

      const result = await ItemPriceService.getSortedSearchResultsByHash(requestData);

      setSortedPriceItems(result.items);
      console.log(`📊 Retrieved ${result.items.length} sorted market items (${priceSortOrder})`);
    } catch (error) {
      console.error('❌ Failed to fetch sorted price data:', error);
      setSortedPriceItems([]);
    }
  }, [priceSortEnabled, cachedSearchHash, priceSortOrder]);

  // 정렬 순서 변경 시 데이터 다시 조회
  useEffect(() => {
    if (priceSortEnabled) {
      fetchSortedPriceData();
    }
  }, [priceSortOrder, fetchSortedPriceData]);

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
    triggerSearch();
  };

  // 🔧 SearchBar에서 필터 변경 시 pageNo 1로 초기화(원본 유지)
  const handleChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, pageNo: 1 }));
    triggerSearch();
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
  const debRef = useRef<number | undefined>(undefined);

  const loadMore = useCallback(async () => {
    if (!isSearching) return;
    if (loadingRef.current || isLoading || !hasMore) return;
    loadingRef.current = true;
    await fetchPage(pageNo + 1, 'append');
    loadingRef.current = false;
  }, [isLoading, hasMore, pageNo, fetchPage]);

  const triggerSearch = useCallback(() => {
    window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(async () => {
      // 1페이지로 초기화 후 로드
      setIsSearching(true);
      setItems([]);
      setPageNo(1);
      setHasMore(true);
      setTotalCount(null);
      await fetchPage(1, 'reset'); // 이전 요청은 fetchPage 내부에서 abort됨
    }, 300); // 250~400ms 권장
  }, [fetchPage]);

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
    <div className="p-4 bg-background">
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
            {/* 익명 사용자 등록 안내 */}
            {!anonId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">
                      즐겨찾기 기능을 사용하려면 임시 사용자 등록이 필요합니다
                    </h3>
                    <p className="text-xs text-yellow-700 mb-3">
                      임시 사용자로 등록하면 즐겨찾기 기능을 사용할 수 있습니다. 개인정보는 수집되지
                      않습니다.
                    </p>
                    <button
                      onClick={handleCreateAnonUser}
                      disabled={isCreatingAnon}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white text-sm rounded-md transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      {isCreatingAnon ? '등록 중...' : '임시 사용자 등록'}
                    </button>
                  </div>
                </div>
              </div>
            )}

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

        {/* 결과 헤더 */}
        <div className="mb-4">
          {/* 데스크톱 레이아웃 */}
          <div className="hidden md:flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {totalCount != null ? `${totalCount} items found` : `${items.length} items found`}
            </h2>

            {/* 가격 정렬 컨트롤 */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={collectPriceData}
                      disabled={isCollectingPrices}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isCollectingPrices ? '수집 중...' : '가격 정렬'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isCollectingPrices
                        ? '검색 결과를 수집하고 있습니다...'
                        : '모든 검색 결과를 수집하여 가격별로 정렬합니다'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {priceSortEnabled && (
                <div className="flex items-center gap-2">
                  <select
                    value={priceSortOrder}
                    onChange={(e) => setPriceSortOrder(e.target.value as 'asc' | 'desc')}
                    className="px-2 py-1 text-sm border rounded"
                  >
                    <option value="asc">낮은 가격순</option>
                    <option value="desc">높은 가격순</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 모바일 레이아웃 */}
          <div className="md:hidden space-y-3">
            <h2 className="text-lg font-semibold">
              {totalCount != null ? `${totalCount} items found` : `${items.length} items found`}
            </h2>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={collectPriceData}
                      disabled={isCollectingPrices}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isCollectingPrices ? '수집 중...' : '가격 정렬'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isCollectingPrices
                        ? '검색 결과를 수집하고 있습니다...'
                        : '모든 검색 결과를 수집하여 가격별로 정렬합니다'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {priceSortEnabled && (
                <select
                  value={priceSortOrder}
                  onChange={(e) => setPriceSortOrder(e.target.value as 'asc' | 'desc')}
                  className="px-2 py-1 text-sm border rounded"
                >
                  <option value="asc">낮은 가격순</option>
                  <option value="desc">높은 가격순</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* 결과 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(priceSortEnabled && sortedPriceItems.length > 0 ? sortedPriceItems : filteredItems).map(
            (item, index) => {
              // 정렬된 아이템의 경우 metadata에서 정보 추출
              const displayItem =
                priceSortEnabled && sortedPriceItems.length > 0
                  ? {
                      id: item.id,
                      name: item.metadata.name,
                      grade: item.metadata.grade,
                      icon: item.metadata.icon,
                      quality: item.metadata.quality,
                      bundleCount: item.metadata.bundleCount,
                      currentPrice: item.price,
                      marketInfo: {
                        currentMinPrice: item.price,
                        yDayAvgPrice: item.metadata.marketInfo?.yDayAvgPrice ?? 0,
                        recentPrice: item.metadata.marketInfo?.recentPrice ?? 0,
                        tradeRemainCount: item.metadata.marketInfo?.tradeRemainCount ?? 0,
                      },
                    }
                  : {
                      id: item.id,
                      name: item.name,
                      grade: item.grade,
                      icon: item.icon,
                      quality: item.quality,
                      currentPrice: item.marketInfo?.currentMinPrice ?? 0,
                      previousPrice: item.marketInfo?.yDayAvgPrice ?? 0,
                      marketInfo: {
                        currentMinPrice: item.marketInfo?.currentMinPrice ?? 0,
                        yDayAvgPrice: item.marketInfo?.yDayAvgPrice ?? 0,
                        recentPrice: item.marketInfo?.recentPrice ?? 0,
                        tradeRemainCount: item.marketInfo?.tradeRemainCount ?? 0,
                      },
                    };

              // ✅ 각 아이템에 매칭되는 즐겨찾기 조회
              const fav = getMarketFavorite(displayItem.id);
              return (
                <MarketItemCard
                  key={`${displayItem.id}-${index}`}
                  item={displayItem}
                  onFavorite={handleFavorite}
                  isFavorite={!!fav} // ✅ 카드에 상태 전달
                  favoriteId={fav?.id ?? ''} // ✅ Alarm에 서버 UUID 전달 (없으면 빈 문자열)
                  matchKey={fav?.matchKey || undefined} // ✅ 즐겨찾기된 아이템만 matchKey 전달
                />
              );
            },
          )}
        </div>

        {/* 무한 스크롤 sentinel */}
        <div ref={loaderRef} className="h-12 flex items-center justify-center">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading ...</span>
          ) : !hasMore && items.length > 0 ? (
            <span className="text-sm text-muted-foreground">No more items</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Market;
