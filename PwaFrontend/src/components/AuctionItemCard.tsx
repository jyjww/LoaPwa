// src/components/AuctionItemCard.tsx
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
    auctionInfo?: any; // 스냅샷/직접형 모두 수용
    info?: {
      auctionInfo?: any;
      options?: ItemOption[];
    };
  };
  onFavorite?: (item: any) => void;
  isFavorite?: boolean;
}

// 숫자 보정 헬퍼
const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// auctionInfo 정규화: 케이스 A/B 모두 {StartPrice, BidStartPrice, BuyPrice, EndDate}로 변환
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

  // 스냅샷 → 현재값 순 병합(현재값 우선)
  return { ...pick(candInfo), ...pick(candTop) };
}

const AuctionItemCard = ({ item, onFavorite, isFavorite = false }: ItemCardProps) => {
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

  const handleFavorite = () => {
    setIsAnimating(true);
    onFavorite?.(item);
    setTimeout(() => setIsAnimating(false), 300);
  };

  // --- 핵심: 정규화된 경매가/종료일 ---
  const ai = extractAuctionInfo(item);

  // 숫자 보정
  const buy = num(ai.BuyPrice); // 즉시구매가
  const bid = num(ai.BidStartPrice) ?? num(ai.StartPrice); // 최소입찰가
  const fallbackCurrent = num(item.currentPrice); // Favorites 폴백(스냅샷)

  // “현재가”(변동률 계산용)
  const effectiveCurrent = buy != null && buy > 0 ? buy : (bid ?? fallbackCurrent ?? 0);

  // 변동률 기준
  const base = bid ?? num(item.previousPrice) ?? 0;
  const changePct = base ? ((effectiveCurrent - base) / base) * 100 : 0;

  // 종료 여부(시간 기준)
  const endedByTime = typeof ai.EndDate === 'string' ? new Date(ai.EndDate) <= new Date() : false;

  // 종료 여부(판매/삭제로 리스트에서 사라진 듯한 스냅샷 기준)
  // - 즉시구매가/최소입찰가가 모두 없고(falsy) currentPrice 스냅샷만 남아있는 경우
  const endedBySnapshot = (buy == null || buy <= 0) && bid == null && fallbackCurrent != null;

  // 최종 종료 플래그
  const ended = endedByTime || endedBySnapshot;

  // 표시 텍스트
  const buyText = buy != null && buy > 0 ? `${buy.toLocaleString()}G` : '-';
  const bidText = bid != null ? `${bid.toLocaleString()}G` : '-';
  const currentText = fallbackCurrent != null ? `${fallbackCurrent.toLocaleString()}G` : '-';

  // (선택) 스냅샷 표시 플래그 (Favorites에서 내려준 힌트도 함께 체크)
  const fromSnapshot =
    (item as any).__fromSnapshot === true ||
    (item.info && typeof item.info.auctionInfo === 'object' && !!item.info.auctionInfo);

  // 옵션 폴백: item → 스냅샷(상위) → 스냅샷(내부)
  const options: ItemOption[] =
    item.options ??
    (Array.isArray((item.auctionInfo as any)?.options)
      ? (item.auctionInfo as any).options
      : undefined) ??
    item.info?.options ??
    [];

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

          <Alarm favoriteId={item.id} />
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2 sm:space-y-3">
          {/* 즉시 구매가 */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">즉시 구매가</span>
            <span
              className={`text-sm sm:text-lg font-bold ${buy != null && buy > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {buyText}
            </span>
          </div>

          {/* 최소 입찰가 */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">최소 입찰가</span>
            <span className="text-sm sm:text-lg font-bold text-primary">{bidText}</span>
          </div>

          {/* 둘 다 없으면 '현재가' 폴백 */}
          {(buy == null || buy <= 0) && bid == null && (
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">현재가</span>
              <span className="text-sm sm:text-lg font-bold">{currentText}</span>
            </div>
          )}

          {/* 변동률 */}
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

          {/* 옵션 뱃지 */}
          {options.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1">
                {options
                  .filter((opt) => ['깨달음', '힘', '민첩', '지능', '체력'].includes(opt.name))
                  .map((opt, idx) => (
                    <Badge key={`base-${idx}`} variant="outline" className="text-[10px] sm:text-xs">
                      {opt.name} {opt.displayValue ?? opt.value}
                    </Badge>
                  ))}
              </div>

              <hr className="border-t border-gray-600 my-1" />

              <div className="flex flex-wrap gap-1">
                {options
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
