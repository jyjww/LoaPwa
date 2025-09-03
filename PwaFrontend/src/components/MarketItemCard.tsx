import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useState } from 'react';
// import { useLocation } from 'react-router-dom';
import Alarm from '@/pages/Alarm';

// interface MarketItemCardProps {
//   item: {
//     id: number;
//     name: string;
//     grade: string;
//     icon?: string;
//     currentMinPrice: number;
//     yDayAvgPrice?: number;
//     recentPrice?: number;
//     tradeRemainCount?: number;
//     quality?: number;
//   };
//   onFavorite?: (item: any) => void;
//   isFavorite?: boolean;
// }
interface MarketItemCardProps {
  item: {
    id: string;
    name: string;
    grade: string;
    icon?: string;
    quality?: number;
    marketInfo?: {
      currentMinPrice: number;
      yDayAvgPrice?: number;
      recentPrice?: number;
      tradeRemainCount?: number;
    };
  };
  onFavorite?: (item: any) => void;
  isFavorite?: boolean;
}

const MarketItemCard = ({ item, onFavorite, isFavorite = false }: MarketItemCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  // const location = useLocation();

  const handleFavorite = () => {
    setIsAnimating(true);
    onFavorite?.(item);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const gradeColors: Record<string, string> = {
    일반: 'bg-gray-600 text-white border-gray-600',
    고급: 'bg-green-600 text-white border-green-600',
    희귀: 'bg-sky-500 text-white border-sky-500',
    영웅: 'bg-purple-500 text-white border-purple-500',
    전설: 'bg-yellow-500 text-black border-yellow-500',
    유물: 'bg-orange-500 text-white border-orange-500',
    고대: 'bg-amber-100 text-black border-amber-100',
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
          {/* ⭐ 즐겨찾기 버튼 */}
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
          {/* {location.pathname === '/favorites' && <Alarm favoriteId={item.id} />} */}
          <Alarm favoriteId={item.id} />
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2 sm:space-y-3">
          {/* ✅ 최소가 */}
          {/* {(item.currentMinPrice ?? item.recentPrice ?? 0).toLocaleString()}G */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">최소가</span>
            <span className="text-sm sm:text-lg font-bold text-primary">
              {item.marketInfo?.currentMinPrice?.toLocaleString() ?? 0}G
            </span>
          </div>

          {/* ✅ 전일 평균 */}
          {/* {item.yDayAvgPrice !== undefined && ( */}
          {/* {item.yDayAvgPrice.toLocaleString()}G */}
          {item.marketInfo?.yDayAvgPrice !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">전일 평균</span>
              <span className="text-sm font-bold">
                {item.marketInfo?.yDayAvgPrice?.toLocaleString() ?? 0}G
              </span>
            </div>
          )}

          {/* ✅ 잔여 거래 */}
          {/* {item.tradeRemainCount} */}
          {/* {item.tradeRemainCount !== undefined && ( */}
          {item.marketInfo?.tradeRemainCount !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">잔여 거래</span>
              <Badge variant="secondary" className="text-xs">
                {item.marketInfo?.tradeRemainCount ?? 0}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketItemCard;
