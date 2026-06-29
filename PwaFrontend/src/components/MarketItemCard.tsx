import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import Alarm from '@/pages/Alarm';
import { calculate7DayChange, type PriceChange } from '@/services/price-history.service';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';

interface MarketItemCardProps {
  item: {
    id: string;
    name: string;
    grade: string;
    icon?: string;
    quality?: number;
    currentPrice?: number | null;
    previousPrice?: number | null;
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
  matchKey?: string; // ← price history 조회용 matchKey 추가
}

const MarketItemCard = ({
  item,
  onFavorite,
  isFavorite = false,
  favoriteId,
  showAlarm,
  matchKey,
}: MarketItemCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null);
  const [isLoadingChange, setIsLoadingChange] = useState(true);

  const handleFavorite = () => {
    setIsAnimating(true);
    onFavorite?.(item);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const isFaved = isFavorite || !!favoriteId;

  // 7일 가격 변동폭 계산 (즐겨찾기한 아이템만)
  useEffect(() => {
    let mounted = true;

    const loadPriceChange = async () => {
      // 즐겨찾기된 아이템만 변동폭 계산
      if (!isFaved) {
        setIsLoadingChange(false);
        return;
      }

      setIsLoadingChange(true);
      // market 아이템은 matchKey를 그대로 사용 (예: mkt:301230463)
      const itemKey = matchKey || item.id;
      const change = await calculate7DayChange(itemKey, (item as any).previousPrice || undefined);
      if (mounted) {
        setPriceChange(change);
        setIsLoadingChange(false);
      }
    };

    loadPriceChange();

    return () => {
      mounted = false;
    };
  }, [item.id, isFaved]);

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

          {/* 7일 변동폭 + 차트 버튼 */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            {isFaved && !isLoadingChange && priceChange ? (
              <div
                className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${
                  priceChange.changePct > 0 ? 'text-destructive' : 'text-green-600'
                }`}
              >
                {priceChange.changePct > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(priceChange.changePct).toFixed(1)}%</span>
              </div>
            ) : (
              <span />
            )}
            {isFaved && (
              <PriceHistoryChart
                itemKey={matchKey ?? String(item.id)}
                itemName={item.name}
                targetPrice={item.targetPrice}
                currentPrice={item.marketInfo?.currentMinPrice ?? item.currentPrice}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketItemCard;
