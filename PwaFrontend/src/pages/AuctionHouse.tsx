import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import ItemCard from '@/components/ItemCard';
import { Search } from 'lucide-react';
import SearchBar from '@/components/pages/SearchBar';
import CategoryFilter from '@/components/pages/CategoryFilter';

// Mock data
const mockAuctionItems = [
  {
    id: '1',
    name: 'Greatsword of Salvation',
    grade: 'Relic' as const,
    currentPrice: 12500,
    previousPrice: 13200,
    source: 'auction' as const,
    quality: 100,
  },
  {
    id: '2',
    name: 'Legendary Ability Stone',
    grade: 'Legendary' as const,
    currentPrice: 2100,
    previousPrice: 1950,
    source: 'auction' as const,
    quality: 85,
  },
  {
    id: '3',
    name: 'Epic Weapon Enhancement Stone',
    grade: 'Epic' as const,
    currentPrice: 750,
    previousPrice: 800,
    source: 'auction' as const,
    quality: 90,
  },
  {
    id: '4',
    name: 'Rare Accessory',
    grade: 'Rare' as const,
    currentPrice: 450,
    source: 'auction' as const,
    quality: 75,
  },
  {
    id: '5',
    name: 'Ancient Relic Set Piece',
    grade: 'Relic' as const,
    currentPrice: 18900,
    previousPrice: 19500,
    source: 'auction' as const,
    quality: 95,
  },
  {
    id: '6',
    name: 'Legendary Engraving Recipe',
    grade: 'Legendary' as const,
    currentPrice: 3400,
    previousPrice: 3200,
    source: 'auction' as const,
    quality: 100,
  },
];

const AuctionHouse = () => {
  const [filters, setFilters] = useState({
    query: '',
    grade: '전체',
    tier: '전체' as number | '전체',
    className: '전체',
    category: '전체' as number | '전체',
    subCategory: '전체' as number | '전체',
  });

  const handleChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    console.log('검색 실행:', filters);
  };

  const filteredItems = useMemo(() => {
    return mockAuctionItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(filters.query.toLowerCase());
      const matchesGrade = filters.grade === '전체' || item.grade === filters.grade;
      return matchesSearch && matchesGrade;
    });
  }, [filters]);

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Navigation />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              경매장 검색 (Auction)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 🔎 검색바 */}
            <SearchBar filters={filters} onChange={handleChange} onSearch={handleSearch} />

            {/* 📂 카테고리 필터 */}
            <CategoryFilter
              category={filters.category}
              subCategory={filters.subCategory}
              onCategoryChange={(code) =>
                setFilters((prev) => ({ ...prev, category: code, subCategory: '전체' }))
              }
              onSubCategoryChange={(sub) => setFilters((prev) => ({ ...prev, subCategory: sub }))}
            />
          </CardContent>
        </Card>

        {/* 결과 */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{filteredItems.length} items found</h2>
          <Badge variant="secondary" className="text-sm">
            Live prices updated every 5 minutes
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} onFavorite={(i) => console.log('Fav:', i)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuctionHouse;
