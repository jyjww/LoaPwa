import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import MarketItemCard from '@/components/MarketItemCard';
import { Filter, Search } from 'lucide-react';
import { marketCategories } from '@/constants/marketCategories';
import SearchBar from '@/components/pages/SearchBar';
import { searchMarket } from '@/services/market.dto';

const Market = () => {
  const [selectedCategory, setSelectedCategory] = useState<number | 'All'>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | 'All'>('All');

  // ✅ SearchBar와 타입을 맞춘 filters 상태
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

  const handleSearchButton = async () => {
    try {
      const data = await searchMarket(filters);
      setItems(data.items ?? []);
    } catch (err) {
      console.error('Market API 실패:', err);
    }
  };

  const handleChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, pageNo: 1 }));
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(filters.query.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSub = selectedSubCategory === 'All' || item.subCategory === selectedSubCategory;
    return matchesSearch && matchesCategory && matchesSub;
  });

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Navigation />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              거래소 검색 (Market)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 🔎 검색바 */}
            <SearchBar filters={filters} onChange={handleChange} onSearch={handleSearchButton} />

            {/* 📂 카테고리 */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Category:</span>
              <Button
                variant={selectedCategory === 'All' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSubCategory('All');
                  setFilters((prev) => ({ ...prev, category: '전체', subCategory: '전체' }));
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
                    setFilters((prev) => ({ ...prev, category: cat.code, subCategory: '전체' }));
                  }}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* 📂 소분류 */}
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
                        setFilters((prev) => ({ ...prev, subCategory: sub.code }));
                      }}
                    >
                      {sub.label}
                    </Button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 결과 */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{filteredItems.length} items found</h2>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              Live market data
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <MarketItemCard
              key={item.id}
              item={{
                id: item.id,
                name: item.name,
                grade: item.grade,
                icon: item.icon,
                currentMinPrice: item.currentMinPrice,
                yDayAvgPrice: item.yDayAvgPrice,
                recentPrice: item.recentPrice,
                tradeRemainCount: item.tradeRemainCount,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Market;
