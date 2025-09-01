import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import ItemCard from '@/components/AuctionItemCard';
import { Search } from 'lucide-react';
import SearchBar from '@/components/pages/SearchBar';
import CategoryFilter from '@/components/pages/CategoryFilter';
import { CategoryEtcOptions } from '@/constants/etcOptions';
import EtcOptionsFilter from '@/components/pages/EtcOptionsFilter';
import { searchAuctions } from '@/services/auction.dto';
import { addFavorite } from '@/services/favorites.service';

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

  const handleSearch = async (reset = true) => {
    setLoading(true);
    try {
      const data = await searchAuctions(filters);

      if (reset) {
        setResults(data.items || []);
      } else {
        setResults((prev) => [...prev, ...(data.items || [])]);
      }
      setTotalCount(data.totalCount ?? 0);

      // ✅ 서버에서 더 이상 데이터가 없을 때만 false
      setHasMore(data.items && data.items.length > 0);
    } catch (err) {
      console.error('API 검색 실패:', err);
      setHasMore(false); // API 에러 발생 시 더 이상 요청하지 않도록 설정
    } finally {
      setLoading(false);
    }
  };

  const handleSearchButton = () => {
    setIsSearching(true); // ✅ 검색 시작 상태로 변경
    setResults([]); // 이전 결과 초기화
    setHasMore(true); // 새 검색에서는 다시 true
    setFilters((prev) => ({ ...prev, pageNo: 1 })); // 페이지 초기화
  };

  // 필터 변경 시 pageNo 초기화 + 새 검색
  const handleChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, pageNo: 1 }));
  };

  // pageNo 변경될 때 API 호출 (단, isSearching이 true일 때만)
  useEffect(() => {
    if (isSearching) {
      handleSearch(filters.pageNo === 1);
    }
  }, [filters.pageNo, isSearching]);

  // 무한 스크롤 옵저버
  useEffect(() => {
    if (!loaderRef.current) return;
    const target = loaderRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setFilters((prev) => ({ ...prev, pageNo: (prev.pageNo as number) + 1 }));
        }
      },
      { threshold: 1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, hasMore]);

  const filteredItems = useMemo(() => {
    return results.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(filters.query.toLowerCase());
      const matchesGrade = filters.grade === '전체' || item.grade === filters.grade;
      return matchesSearch && matchesGrade;
    });
  }, [results, filters]);

  const handleAddFavorite = async (item: any) => {
    try {
      const saved = await addFavorite({
        source: 'auction', // ✅ Auction 전용
        name: item.name,
        grade: item.grade,
        tier: item.tier,
        icon: item.icon,
        quality: item.quality,
        currentPrice: item.currentPrice,
        previousPrice: item.previousPrice,
        auctionInfo: item.auctionInfo,
        options: item.options,
        itemId: item.itemId,
      });
      console.log('즐겨찾기 저장 성공:', saved);
      alert('즐겨찾기에 추가되었습니다!');
    } catch (err) {
      console.error('즐겨찾기 저장 실패:', err);
      alert('로그인이 필요합니다.');
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Navigation />

        <Card className="rounded-lg border text-card-foreground shadow-sm mobile-card bg-gradient-to-br from-card to-primary/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              경매장 검색 (Auction)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 🔎 검색바 */}
            <SearchBar filters={filters} onChange={handleChange} onSearch={handleSearchButton} />

            {/* 📂 카테고리 필터 */}
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
                availableOptions={CategoryEtcOptions[filters.category as number] || []} // ✅ string[]만 내려감
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
          <Badge variant="secondary" className="text-sm">
            Notice
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <ItemCard key={item.id ?? idx} item={item} onFavorite={() => handleAddFavorite(item)} />
          ))}
        </div>

        {/* 무한 스크롤 로더 */}
        <div
          ref={loaderRef}
          className="h-10 flex justify-center items-center text-muted-foreground"
        >
          {loading && <span>Loading more...</span>}
          {!hasMore && <span>No more items</span>}
        </div>
      </div>
    </div>
  );
};

export default AuctionHouse;
