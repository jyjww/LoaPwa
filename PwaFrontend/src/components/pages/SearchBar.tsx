import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { ItemGrades, ItemTiers, Classes } from '@/constants/auctionFilters';
import { Search } from 'lucide-react';

interface SearchBarProps {
  filters: {
    query: string;
    grade: string;
    tier: number | '전체';
    className: string | '전체';
  };
  onChange: (key: string, value: any) => void;
  onSearch: () => void;
}

const SearchBar = ({ filters, onChange, onSearch }: SearchBarProps) => {
  return (
    <CardContent className="space-y-4 p-0">
      {/* 검색어 */}
      <div className="flex gap-4">
        <Input
          placeholder="아이템 이름을 입력하세요..."
          value={filters.query}
          onChange={(e) => onChange('query', e.target.value)}
        />
        <Button onClick={onSearch}>
          <Search className="h-4 w-4 mr-2" />
          검색
        </Button>
      </div>

      {/* 아이템 등급 / 티어 / 직업 */}
      <div className="flex gap-3 flex-wrap">
        {/* 아이템 등급 */}
        <div className="flex flex-row gap-3 items-center">
          <label className="text-sm font-medium mb-1">아이템 등급</label>
          <select
            value={filters.grade}
            onChange={(e) => onChange('grade', e.target.value)}
            className="filter-dropdown"
          >
            <option value="전체">전체</option>
            {ItemGrades.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* 아이템 티어 */}
        <div className="flex flex-row gap-3 items-center">
          <label className="text-sm font-medium mb-1">아이템 티어</label>
          <select
            value={filters.tier}
            onChange={(e) =>
              onChange('tier', e.target.value === '전체' ? '전체' : Number(e.target.value))
            }
            className="filter-dropdown"
          >
            <option value="전체">전체</option>
            {ItemTiers.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 직업 */}
        <div className="flex flex-row gap-3 items-center">
          <label className="text-sm font-medium mb-1">직업</label>
          <select
            value={filters.className}
            onChange={(e) => onChange('className', e.target.value)}
            className="filter-dropdown"
          >
            <option value="전체">전체</option>
            {Classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    </CardContent>
  );
};

export default SearchBar;
