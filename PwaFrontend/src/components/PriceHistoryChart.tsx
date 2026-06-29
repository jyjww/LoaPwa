import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { fetchPriceHistory, type PriceHistoryPoint } from '@/services/price-history.service';

interface PriceHistoryChartProps {
  itemKey: string;
  itemName: string;
  targetPrice?: number | null;
  currentPrice?: number | null;
}

type Range = '24h' | '7d';

const formatGold = (v: number) => {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}만G`;
  return `${v.toLocaleString()}G`;
};

const formatDate = (t: string, range: Range) => {
  const d = new Date(t);
  if (range === '24h') {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
};

const CustomTooltip = ({ active, payload, label, range }: any) => {
  if (!active || !payload?.length) return null;
  const price = payload[0]?.value;
  if (price == null) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{formatDate(label, range)}</p>
      <p className="font-bold text-primary">{price.toLocaleString()}G</p>
    </div>
  );
};

export function PriceHistoryChart({
  itemKey,
  itemName,
  targetPrice,
  currentPrice,
}: PriceHistoryChartProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchPriceHistory(itemKey, range)
      .then(setData)
      .finally(() => setLoading(false));
  }, [open, range, itemKey]);

  const validPoints = data.filter((p) => p.price !== null && p.price > 0);
  const prices = validPoints.map((p) => p.price as number);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const firstPrice = validPoints[0]?.price ?? 0;
  const lastPrice = validPoints[validPoints.length - 1]?.price ?? 0;
  const changePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : null;
  const isRising = changePct !== null && changePct > 0;
  const isFalling = changePct !== null && changePct < 0;

  // 적정가 판단: 현재가 vs 7일 평균
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const fairValue =
    currentPrice && avgPrice > 0
      ? currentPrice < avgPrice * 0.95
        ? 'low'
        : currentPrice > avgPrice * 1.05
          ? 'high'
          : 'fair'
      : null;

  const domainPad = (maxPrice - minPrice) * 0.15 || maxPrice * 0.1;
  const yDomain = prices.length
    ? [Math.max(0, minPrice - domainPad), maxPrice + domainPad]
    : ['auto', 'auto'];

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
        onClick={() => setOpen(true)}
        title="가격 히스토리 차트"
      >
        <LineChart className="h-3.5 w-3.5" />
        차트
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              {itemName}
              {fairValue === 'low' && (
                <Badge className="bg-green-600 text-white text-xs">현재가 낮음</Badge>
              )}
              {fairValue === 'high' && (
                <Badge className="bg-red-500 text-white text-xs">현재가 높음</Badge>
              )}
              {fairValue === 'fair' && (
                <Badge variant="secondary" className="text-xs">적정가</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* 요약 스탯 */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatBox label="최저" value={prices.length ? formatGold(minPrice) : '-'} />
            <StatBox
              label={`${range === '24h' ? '24h' : '7일'} 변동`}
              value={
                changePct !== null ? (
                  <span className={isRising ? 'text-red-500' : isFalling ? 'text-green-600' : ''}>
                    <span className="inline-flex items-center gap-0.5">
                      {isRising ? <TrendingUp className="h-3.5 w-3.5" /> : isFalling ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      {Math.abs(changePct).toFixed(1)}%
                    </span>
                  </span>
                ) : '-'
              }
            />
            <StatBox label="최고" value={prices.length ? formatGold(maxPrice) : '-'} />
          </div>

          {/* 범위 탭 */}
          <div className="flex gap-2 mb-4">
            {(['24h', '7d'] as Range[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? 'default' : 'outline'}
                className="h-7 px-3 text-xs"
                onClick={() => setRange(r)}
              >
                {r === '24h' ? '24시간' : '7일'}
              </Button>
            ))}
          </div>

          {/* 차트 */}
          <div className="h-52 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                불러오는 중...
              </div>
            ) : validPoints.length < 2 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-1">
                <LineChart className="h-8 w-8 opacity-30" />
                <p>아직 가격 데이터가 부족해요</p>
                <p className="text-xs opacity-60">즐겨찾기 후 데이터가 쌓이면 표시됩니다</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(v) => formatDate(v, range)}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yDomain as any}
                    tickFormatter={formatGold}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip content={<CustomTooltip range={range} />} />

                  {/* 목표가 기준선 */}
                  {targetPrice && targetPrice > 0 && (
                    <ReferenceLine
                      y={targetPrice}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{
                        value: `목표 ${formatGold(targetPrice)}`,
                        position: 'insideTopRight',
                        fontSize: 10,
                        fill: 'hsl(var(--destructive))',
                      }}
                    />
                  )}

                  {/* 7일 평균선 */}
                  {avgPrice > 0 && (
                    <ReferenceLine
                      y={avgPrice}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="2 3"
                      strokeWidth={1}
                      label={{
                        value: `평균 ${formatGold(Math.round(avgPrice))}`,
                        position: 'insideBottomRight',
                        fontSize: 9,
                        fill: 'hsl(var(--muted-foreground))',
                      }}
                    />
                  )}

                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                    connectNulls={false}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 적정가 설명 */}
          {fairValue && avgPrice > 0 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {range === '24h' ? '24시간' : '7일'} 평균 {formatGold(Math.round(avgPrice))} 기준
              {fairValue === 'low' && ' — 현재가가 평균보다 5% 이상 낮아요 🟢'}
              {fairValue === 'high' && ' — 현재가가 평균보다 5% 이상 높아요 🔴'}
              {fairValue === 'fair' && ' — 현재가가 평균 범위 내에 있어요'}
            </p>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

const StatBox = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="bg-muted/40 rounded-lg p-2.5 text-center">
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className="text-sm font-bold">{value}</div>
  </div>
);
