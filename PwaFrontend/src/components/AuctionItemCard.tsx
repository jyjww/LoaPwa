// src/components/AuctionItemCard.tsx
import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import Alarm from '@/pages/Alarm';

interface ItemOption {
  name: string;
  value: number | string | null;
  displayValue?: string | number;
}

type AuctionInfoMerged = {
  StartPrice?: number | null;
  BidStartPrice?: number | null;
  BuyPrice?: number | null;
  EndDate?: string | null;
};

interface ItemCardProps {
  item: {
    id: string;
    name: string;
    icon?: string;
    grade: string;
    currentPrice?: number | null;
    previousPrice?: number | null;
    source: 'auction' | 'market';
    quality?: number | null;
    tradeCount?: number | null;
    options?: ItemOption[];
    auctionInfo?: any;
    info?: {
      auctionInfo?: any;
      options?: ItemOption[];
    };
  };
  onFavorite?: (item: any) => void;
  favoriteId?: string; // ← 이 값만으로 즐겨찾기 상태 판단
}

const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function extractAuctionInfo(item: any): AuctionInfoMerged {
  const candTop = item.auctionInfo;
  const candInfo = item.info?.auctionInfo;

  const pick = (x: any): AuctionInfoMerged => {
    if (!x) return {};
    const inner = typeof x === 'object' && x !== null && 'auctionInfo' in x ? x.auctionInfo : x;
    return {
      StartPrice: num(inner?.StartPrice),
      BidStartPrice: num(inner?.BidStartPrice),
      BuyPrice: num(inner?.BuyPrice),
      EndDate: typeof inner?.EndDate === 'string' ? inner.EndDate : null,
    };
  };

  return { ...pick(candInfo), ...pick(candTop) };
}

const AuctionItemCard = ({ item, onFavorite, favoriteId }: ItemCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const isFaved = !!favoriteId;

  const gradeColors: Record<string, string> = {
    일반: 'bg-gray-600 text-white border-gray-600',
    고급: 'bg-green-600 text-white border-green-600',
    희귀: 'bg-sky-500 text-white border-sky-500',
    영웅: 'bg-purple-500 text-white border-purple-500',
    전설: 'bg-yellow-500 text-black border-yellow-500',
    유물: 'bg-orange-500 text-white border-orange-500',
    고대: 'bg-amber-100 text-black border-amber-100',
  };

  const handleFavorite = () => {
    setIsAnimating(true);
    onFavorite?.(item);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const ai = extractAuctionInfo(item);
  const buy = num(ai.BuyPrice);
  const bid = num(ai.BidStartPrice) ?? num(ai.StartPrice);
  const fallbackCurrent = num(item.currentPrice);

  const effectiveCurrent = buy != null && buy > 0 ? buy : (bid ?? fallbackCurrent ?? 0);
  const base = bid ?? num(item.previousPrice) ?? 0;
  const changePct = base ? ((effectiveCurrent - base) / base) * 100 : 0;

  const endedByTime = typeof ai.EndDate === 'string' ? new Date(ai.EndDate) <= new Date() : false;
  const endedBySnapshot = (buy == null || buy <= 0) && bid == null && fallbackCurrent != null;
  const ended = endedByTime || endedBySnapshot;

  const buyText = buy != null && buy > 0 ? `${buy.toLocaleString()}G` : '-';
  const bidText = bid != null ? `${bid.toLocaleString()}G` : '-';
  const currentText = fallbackCurrent != null ? `${fallbackCurrent.toLocaleString()}G` : '-';

  const fromSnapshot =
    (item as any).__fromSnapshot === true ||
    (item.info && typeof item.info.auctionInfo === 'object' && !!item.info.auctionInfo);

  return (
    <Card className="mobile-card group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
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

                {typeof item.quality === 'number' && (
                  <Badge variant="secondary" className="text-xs">
                    품질: {item.quality}
                  </Badge>
                )}

                {fromSnapshot && (
                  <Badge className="bg-muted/20 text-muted-foreground border">스냅샷</Badge>
                )}

                {ended && <Badge className="bg-muted/30 text-muted-foreground">판매 종료</Badge>}
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
                // ⬇︎ 확실하게: 속성 + 클래스 동시 지정
                fill={isFaved ? 'currentColor' : 'none'}
                stroke={isFaved ? 'none' : 'currentColor'}
                className={clsx(
                  'transition-all duration-150',
                  isFaved
                    ? 'text-[var(--color-accent)]'
                    : 'text-muted-foreground group-hover/star:text-[var(--color-accent)] group-hover/star:[fill:currentColor] group-hover/star:[stroke:none]',
                )}
              />
            </Button>

            {/* 알림 버튼: favoriteId 있을 때만 표시 */}
            {favoriteId ? <Alarm favoriteId={favoriteId} /> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">즉시 구매가</span>
            <span
              className={`text-sm sm:text-lg font-bold ${buy != null && buy > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {buyText}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">최소 입찰가</span>
            <span className="text-sm sm:text-lg font-bold text-primary">{bidText}</span>
          </div>

          {(buy == null || buy <= 0) && bid == null && (
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">현재가</span>
              <span className="text-sm sm:text-lg font-bold">{currentText}</span>
            </div>
          )}

          {base > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Change</span>
              <div
                className={`flex items-center gap-1 text-xs sm:text-sm ${changePct > 0 ? 'text-destructive' : 'text-accent'}`}
              >
                {changePct > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(changePct).toFixed(1)}%</span>
              </div>
            </div>
          )}

          {Array.isArray(item.options) && item.options.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1">
                {item.options
                  .filter((opt) => ['깨달음', '힘', '민첩', '지능', '체력'].includes(opt.name))
                  .map((opt, idx) => (
                    <Badge key={`base-${idx}`} variant="outline" className="text-[10px] sm:text-xs">
                      {opt.name} {opt.displayValue ?? opt.value}
                    </Badge>
                  ))}
              </div>

              <hr className="border-t border-gray-600 my-1" />

              <div className="flex flex-wrap gap-1">
                {item.options
                  .filter((opt) => !['깨달음', '힘', '민첩', '지능', '체력'].includes(opt.name))
                  .map((opt, idx) => {
                    let tier: '하' | '중' | '상' = '하';
                    if (typeof opt.value === 'number') {
                      if (opt.value > 500) tier = '상';
                      else if (opt.value > 100) tier = '중';
                    }
                    return (
                      <Badge
                        key={`extra-${idx}`}
                        tier={tier}
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

export default AuctionItemCard;
