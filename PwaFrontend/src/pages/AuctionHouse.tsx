// src/pages/AuctionHouse.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Navigation from '@/components/Navigation';
import ItemCard from '@/components/AuctionItemCard';
import { Search, UserPlus, AlertCircle } from 'lucide-react';
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
import { ItemPriceService } from '@/services/item-price.service';
import { getCurrentAnonId, getOrCreateAnonId } from '@/services/anonService';

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

  // ✅ 익명 사용자 상태
  const [anonId, setAnonId] = useState<string | null>(null);
  const [isCreatingAnon, setIsCreatingAnon] = useState(false);

  // ✅ 즐겨찾기 상태(서버) & 조회 헬퍼
  const [favorites, setFavorites] = useState<any[]>([]);
  const { getAuctionFavorite } = useFavoriteLookup(favorites);

  // 즉시구매가가 있는 제품만 조회
  const [onlyBuyNow, setOnlyBuyNow] = useState(false);

  // 가격 정렬 관련 상태
  const [priceSortEnabled, setPriceSortEnabled] = useState(false);
  const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isCollectingPrices, setIsCollectingPrices] = useState(false);
  const [sortedPriceItems, setSortedPriceItems] = useState<any[]>([]);
  const [cachedSearchHash, setCachedSearchHash] = useState<string | null>(null);

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

  // 즐겨찾기 새로고침
  const refreshFavorites = useCallback(async () => {
    try {
      const list = await fetchFavorites();
      setFavorites(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('[Auction] refreshFavorites failed:', e);
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
        etcOptions: filters.etcOptions,
        onlyBuyNow,
      };

      const result = await ItemPriceService.collectAndSortAuctionResults(searchRequest, {
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

      console.log(`✅ Collected ${result.total} auction items for price sorting`);
    } catch (error) {
      console.error('❌ Failed to collect price data:', error);
    } finally {
      setIsCollectingPrices(false);
    }
  }, [filters, onlyBuyNow, priceSortOrder, isCollectingPrices]);

  // 정렬된 가격 데이터 조회
  const fetchSortedPriceData = useCallback(async () => {
    if (!priceSortEnabled || !cachedSearchHash) return;

    console.log(`🔍 Fetching sorted data with hash: ${cachedSearchHash}`);
    console.log(
      `🔍 Current state - priceSortEnabled: ${priceSortEnabled}, cachedSearchHash: ${cachedSearchHash}`,
    );

    try {
      const requestData = {
        source: 'auction' as const,
        searchHash: cachedSearchHash,
        sort: priceSortOrder,
        limit: 100,
        offset: 0,
      };
      console.log(`📤 API request data:`, requestData);

      const result = await ItemPriceService.getSortedSearchResultsByHash(requestData);

      setSortedPriceItems(result.items);
      console.log(`📊 Retrieved ${result.items.length} sorted auction items (${priceSortOrder})`);
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
    <div className="p-4 bg-background">
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
        <div className="mb-4">
          {/* 데스크톱 레이아웃 */}
          <div className="hidden md:flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {loading ? 'Loading...' : `${totalCount} items found`}
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyBuyNow}
                  onChange={(e) => setOnlyBuyNow(e.target.checked)}
                />
                즉시구매가 있는 매물만
              </label>

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
          </div>

          {/* 모바일 레이아웃 */}
          <div className="md:hidden space-y-3">
            <h2 className="text-lg font-semibold">
              {loading ? 'Loading...' : `${totalCount} items found`}
            </h2>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyBuyNow}
                onChange={(e) => setOnlyBuyNow(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">즉시구매가 있는 매물만</span>
            </div>

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

        {/* ✅ 즐겨찾기 상태 내려주기: isFavorite / favoriteId */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(priceSortEnabled && sortedPriceItems.length > 0 ? sortedPriceItems : filteredItems).map(
            (item, idx) => {
              // 정렬된 아이템의 경우 metadata에서 정보 추출
              const displayItem =
                priceSortEnabled && sortedPriceItems.length > 0
                  ? {
                      id: item.id,
                      name: item.metadata.name,
                      grade: item.metadata.grade,
                      tier: item.metadata.tier,
                      quality: item.metadata.quality,
                      icon: item.metadata.icon,
                      currentPrice: item.price,
                      auctionInfo: item.metadata.auctionInfo,
                      options: item.metadata.options || [],
                    }
                  : item;

              const { category, name, grade, tier, quality, canonOptions } =
                buildKeyParts(displayItem);

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
                  item={displayItem}
                  showAlarm
                  onFavorite={() => handleToggleFavorite(displayItem)}
                  favoriteId={fav?.id}
                  matchKey={matchKey}
                />
              );
            },
          )}
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
