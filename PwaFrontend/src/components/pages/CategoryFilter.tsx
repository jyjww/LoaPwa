import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { auctionCategories } from '@/constants/auctionCategories';

interface CategoryFilterProps {
  category: number | '전체';
  subCategory: number | '전체';
  onCategoryChange: (code: number | '전체') => void;
  onSubCategoryChange: (code: number | '전체') => void;
}

const CategoryFilter = ({
  category,
  subCategory,
  onCategoryChange,
  onSubCategoryChange,
}: CategoryFilterProps) => {
  const selectedCategory = auctionCategories.find((c) => c.code === category);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">카테고리:</span>
      </div>

      {/* 메인 카테고리 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={category === '전체' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange('전체')}
        >
          전체
        </Button>
        {auctionCategories.map((cat) => (
          <Button
            key={cat.code}
            variant={category === cat.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(cat.code)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Sub Category */}
      {selectedCategory?.subs && (
        <div className="ml-6 flex flex-wrap gap-2">
          {selectedCategory.subs.map((sub) => (
            <Button
              key={sub.code}
              variant={subCategory === sub.code ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSubCategoryChange(sub.code)}
            >
              {sub.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
