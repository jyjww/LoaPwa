import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import MarketItemCard from '@/components/MarketItemCard';
import { Filter, Search } from 'lucide-react';
import { marketCategories } from '@/constants/marketCategories';
import SearchBar from '@/components/pages/SearchBar';
import { searchMarket } from '@/services/market.dto';
import { addFavorite } from '@/services/favorites/favorites.service';

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

  // ✅ 무한 스크롤 관련 상태
  const [pageNo, setPageNo] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // ✅ 페이지 단위로 호출 (mode: 'reset' | 'append')
  const fetchPage = useCallback(
    async (page: number, mode: 'reset' | 'append') => {
      try {
        setIsLoading(true);
        const data = await searchMarket({ ...filters, pageNo: page });

        const nextItems = data.items ?? [];
        if (mode === 'reset') {
          setItems(nextItems);
        } else {
          setItems((prev) => [...prev, ...nextItems]);
        }

        setTotalCount(
          typeof data.totalCount === 'number' ? data.totalCount : (totalCount ?? nextItems.length),
        );

        // hasMore 계산 (pageSize가 0이거나 없으면 items 길이로 대체)
        const pageSize = data.pageSize && data.pageSize > 0 ? data.pageSize : nextItems.length;
        const total = data.totalCount ?? 0;

        // 다음 페이지가 존재하는지 판단
        const loadedCount = (page - 1) * (pageSize || 0) + nextItems.length;
        setHasMore(total === 0 ? nextItems.length > 0 : loadedCount < total);

        setPageNo(page);
      } catch (err) {
        console.error('Market API 실패:', err);
        // 실패 시 더 이상 로드하지 않도록 방어
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, totalCount],
  );

  // 🔎 검색 버튼: 1페이지로 초기화 후 새로 로드
  const handleSearchButton = async () => {
    setPageNo(1);
    setHasMore(true);
    setTotalCount(null);
    await fetchPage(1, 'reset');
  };

  // 🔧 SearchBar에서 필터 변경 시 pageNo 1로 초기화(원본 유지)
  const handleChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, pageNo: 1 }));
  };

  // ⭐ 즐겨찾기 추가 (원본 유지)
  const handleFavorite = async (item: any) => {
    try {
      await addFavorite({
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
      alert('즐겨찾기 추가 성공');
    } catch (err) {
      console.error('❌ 즐겨찾기 추가 실패:', err);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(filters.query.toLowerCase()),
  );

  // ✅ IntersectionObserver: sentinel 보이면 다음 페이지 로드
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || isLoading || !hasMore) return;
    loadingRef.current = true;
    await fetchPage(pageNo + 1, 'append');
    loadingRef.current = false;
  }, [isLoading, hasMore, pageNo, fetchPage]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '400px', // 살짝 여유있게 다음 페이지 프리페치
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

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
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              Live market data
            </Badge>
          </div>
        </div>

        {/* 결과 그리드 (원본 유지: filteredItems가 아닌 items 사용) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
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
            />
          ))}
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
