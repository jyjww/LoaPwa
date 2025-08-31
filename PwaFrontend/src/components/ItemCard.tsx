import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface ItemOption {
  name: string;
  value: number | string | null;
  displayValue?: string | number;
}

interface ItemCardProps {
  item: {
    id: string;
    name: string;
    icon?: string;
    grade: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Relic';
    currentPrice: number;
    previousPrice?: number;
    source: 'auction' | 'market';
    quality?: number;
    tradeCount?: number;
    options?: ItemOption[];
    auctionInfo?: {
      StartPrice?: number;
      BidStartPrice?: number;
      BuyPrice?: number;
    };
  };
  onFavorite?: (item: any) => void;
  isFavorite?: boolean;
}

const ItemCard = ({ item, onFavorite, isFavorite = false }: ItemCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const gradeColors: Record<string, string> = {
    일반: 'bg-gray-600 text-white border-gray-600',
    고급: 'bg-green-600 text-white border-green-600',
    희귀: 'bg-sky-500 text-white border-sky-500',
    영웅: 'bg-purple-500 text-white border-purple-500',
    전설: 'bg-yellow-500 text-black border-yellow-500',
    유물: 'bg-orange-500 text-white border-orange-500',
    고대: 'bg-amber-100 text-black border-amber-100',
  };

  const priceChange = item.previousPrice
    ? ((item.currentPrice - item.previousPrice) / item.previousPrice) * 100
    : 0;

  const handleFavorite = () => {
    setIsAnimating(true);
    onFavorite?.(item);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Card className="mobile-card group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {item.icon && (
              <img
                src={item.icon}
                alt={item.name}
                className="w-12 h-12 border bg-white rounded-md object-contain"
              />
            )}
            <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-lg leading-tight truncate pr-2">
                {item.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <Badge className={`text-xs ${gradeColors[item.grade] ?? ''} border`}>
                  {item.grade}
                </Badge>
                {item.quality && (
                  <Badge variant="secondary" className="text-xs">
                    품질: {item.quality}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavorite}
            className={`p-1 sm:p-2 transition-all shrink-0 ${isAnimating ? 'scale-125' : ''} ${
              isFavorite
                ? 'text-accent hover:text-accent/80'
                : 'text-muted-foreground hover:text-accent'
            }`}
          >
            <Star className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2 sm:space-y-3">
          {/* ✅ 최소 입찰가 */}
          {item.auctionInfo?.BidStartPrice != null && (
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">최소 입찰가</span>
              <span className="text-sm sm:text-lg font-bold text-primary">
                {item.auctionInfo.BidStartPrice.toLocaleString()}G
              </span>
            </div>
          )}

          {/* ✅ 즉시 구매가 */}
          {item.auctionInfo?.BuyPrice != null && (
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">즉시 구매가</span>
              <span className="text-sm sm:text-lg font-bold text-destructive">
                {item.auctionInfo.BuyPrice.toLocaleString()}G
              </span>
            </div>
          )}

          {/* ✅ 가격 변동률 */}
          {item.previousPrice && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Change</span>
              <div
                className={`flex items-center gap-1 text-xs sm:text-sm ${
                  priceChange > 0 ? 'text-destructive' : 'text-accent'
                }`}
              >
                {priceChange > 0 ? (
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                )}
                <span>{Math.abs(priceChange).toFixed(1)}%</span>
              </div>
            </div>
          )}

          {item.tradeCount && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Trades</span>
              <Badge variant="secondary" className="text-xs">
                {item.tradeCount}
              </Badge>
            </div>
          )}

          {/* 🔥 옵션 뱃지 */}
          {item.options && item.options.length > 0 && (
            <div className="mt-2 space-y-2">
              {/* 기본 효과 */}
              <div className="flex flex-wrap gap-1">
                {item.options
                  .filter((opt) => ['깨달음', '힘', '민첩', '지능', '체력'].includes(opt.name))
                  .map((opt, idx) => (
                    <Badge key={`base-${idx}`} variant="outline" className="text-[10px] sm:text-xs">
                      {opt.name} {opt.displayValue ?? opt.value}
                    </Badge>
                  ))}
              </div>

              {/* 구분선 */}
              <hr className="border-t border-gray-600 my-1" />

              {/* 추가 효과 */}
              <div className="flex flex-wrap gap-1">
                {item.options
                  .filter((opt) => !['깨달음', '힘', '민첩', '지능', '체력'].includes(opt.name))
                  .map((opt, idx) => {
                    // ✅ 여기서 value 크기에 따라 tier 구분 (예시 로직)
                    let tier: '하' | '중' | '상' = '하';
                    if (typeof opt.value === 'number') {
                      if (opt.value > 500) tier = '상';
                      else if (opt.value > 100) tier = '중';
                    }

                    return (
                      <Badge
                        key={`extra-${idx}`}
                        tier={tier} // ✅ 추가된 부분
                        variant="outline"
                        className="text-[10px] sm:text-xs"
                      >
                        {opt.name} {opt.displayValue ?? opt.value}
                      </Badge>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemCard;
