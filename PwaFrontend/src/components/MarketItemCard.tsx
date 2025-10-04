import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useState } from 'react';
import Alarm from '@/pages/Alarm';

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
    isAlerted?: boolean;
    targetPrice?: number | null;
  };
  onFavorite?: (item: any) => void;
  isFavorite?: boolean;
  favoriteId?: string;
  showAlarm?: boolean;
}

const MarketItemCard = ({
  item,
  onFavorite,
  isFavorite = false,
  favoriteId,
  showAlarm,
}: MarketItemCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  // const location = useLocation();

  const handleFavorite = () => {
    setIsAnimating(true);
    onFavorite?.(item);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const isFaved = isFavorite || !!favoriteId;

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
    <Card className="mobile-card group transition-all duration-300 hover:shadow-lg">
      <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-3">
        <div className="flex items-start justify-between gap-3">
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
          <div className="flex items-start gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              title={isFaved ? '즐겨찾기 해제' : '즐겨찾기'}
              className={clsx(
                'p-0 sm:p-0 shrink-0 transition-transform items-start justify-end',
                isAnimating && 'scale-125',
                'bg-transparent hover:bg-transparent focus-visible:ring-0',
                '[&_svg]:!h-5 [&_svg]:!w-5',
                'group/star',
              )}
            >
              <Star
                className={clsx(
                  'transition-all duration-150',
                  isFaved
                    ? 'text-[var(--color-accent)] [fill:currentColor] [stroke:none]'
                    : 'text-muted-foreground group-hover/star:text-[var(--color-accent)] group-hover/star:[fill:currentColor] group-hover/star:[stroke:none]',
                )}
              />
            </Button>

            {(showAlarm || isFaved) && (
              <Alarm
                favoriteId={favoriteId ?? ''}
                isFavorite={true}
                defaultIsAlerted={Boolean(item.isAlerted)}
                defaultTargetPrice={Number(item.targetPrice) || 0}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2 sm:space-y-3">
          {/* ✅ 최소가 */}
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
