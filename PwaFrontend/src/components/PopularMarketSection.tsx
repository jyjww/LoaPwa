import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { fetchPopularItems, type PopularItem } from '@/services/popular-items.service';

// ─── 유틸 ────────────────────────────────────────────────────────────────────

const formatGold = (v: number) => {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억G`;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}만G`;
  return `${v.toLocaleString()}G`;
};

const formatDate = (t: string) => {
  const d = new Date(t);
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
};

const GROUP_ORDER = ['강화석', '돌파석', '융화재료', '파편', '숨결', '기타'];
const GROUP_LABEL: Record<string, string> = {
  강화석: '강화석',
  돌파석: '돌파석',
  융화재료: '융화 재료',
  파편: '명예·운명 파편',
  숨결: '숨결',
  기타: '기타',
};

// ─── 미니 스파크라인 (30px 높이, 축 없음) ──────────────────────────────────

const Spark = ({ prices, rising }: { prices: number[]; rising: boolean }) => {
  if (prices.length < 2) return <div className="w-14 h-6" />;
  const data = prices.map((v, i) => ({ i, v }));
  const color = rising ? '#ef4444' : '#22c55e';
  return (
    <div className="w-14 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
          <defs>
            <linearGradient id={`sp-${rising}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#sp-${rising})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 상세 차트 Sheet ─────────────────────────────────────────────────────────

const DetailSheet = ({ item, open, onClose }: { item: PopularItem; open: boolean; onClose: () => void }) => {
  const prices = item.history.map(p => p.price).filter((p): p is number => p != null && p > 0);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const pad = (max - min) * 0.15 || max * 0.1;
  const domain = prices.length ? [Math.max(0, min - pad), max + pad] : ['auto', 'auto'];

  const isRising = (item.changePct ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl overflow-y-auto pb-8">
        <SheetHeader className="mb-3">
          <SheetTitle className="flex items-center gap-2 text-sm">
            {item.iconUrl
              ? <img src={item.iconUrl} alt={item.label} className="w-7 h-7 rounded object-cover" />
              : <div className="w-7 h-7 bg-muted rounded" />}
            <span>{item.label}</span>
            {item.changePct !== null && (
              <Badge className={`text-xs ml-auto ${item.changePct > 0 ? 'bg-red-500' : item.changePct < 0 ? 'bg-green-600' : 'bg-muted'} text-white`}>
                {item.changePct > 0 ? '+' : ''}{item.changePct}%
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[['최저', min], ['평균', Math.round(avg)], ['최고', max]].map(([lbl, val]) => (
            <div key={lbl as string} className="bg-muted/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">{lbl}</div>
              <div className="text-xs font-bold">{val ? formatGold(val as number) : '-'}</div>
            </div>
          ))}
        </div>

        {/* 차트 */}
        <div className="h-48 w-full">
          {prices.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
              <BarChart3 className="h-7 w-7 opacity-25" />
              <p className="text-xs">데이터 수집 중 · 매일 09:00 업데이트</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={item.history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="popG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="t" tickFormatter={formatDate}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={domain as any} tickFormatter={formatGold}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false} axisLine={false} width={50} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const price = payload[0]?.value as number;
                  return price ? (
                    <div className="bg-background border border-border rounded-lg px-2.5 py-1.5 shadow text-xs">
                      <p className="text-muted-foreground">{formatDate(label)}</p>
                      <p className="font-bold text-primary">{price.toLocaleString()}G</p>
                    </div>
                  ) : null;
                }} />
                {avg > 0 && (
                  <ReferenceLine y={avg} stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="2 3" strokeWidth={1}
                    label={{ value: `평균 ${formatGold(Math.round(avg))}`, position: 'insideBottomRight', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                )}
                <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))"
                  strokeWidth={2} fill="url(#popG)" connectNulls={false} dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: 'hsl(var(--primary))' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-3">
          매일 오전 9시(KST) 자동 업데이트 · 로스트아크 공식 API
        </p>
      </SheetContent>
    </Sheet>
  );
};

// ─── 아이템 행 ────────────────────────────────────────────────────────────────

const ItemRow = ({ item }: { item: PopularItem }) => {
  const [open, setOpen] = useState(false);
  const prices = item.history.map(p => p.price).filter((p): p is number => p != null && p > 0);
  const isRising = (item.changePct ?? 0) > 0;
  const isFalling = (item.changePct ?? 0) < 0;

  return (
    <>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
        onClick={() => setOpen(true)}
      >
        {/* 썸네일 */}
        {item.iconUrl
          ? <img src={item.iconUrl} alt={item.label} className="w-7 h-7 rounded shrink-0 object-cover" />
          : <div className="w-7 h-7 bg-muted rounded shrink-0" />}

        {/* 이름 */}
        <span className="flex-1 text-xs truncate">{item.label}</span>

        {/* 스파크라인 */}
        <Spark prices={prices} rising={isRising} />

        {/* 변동 */}
        <span className={`text-[10px] w-10 text-right shrink-0 ${isRising ? 'text-red-500' : isFalling ? 'text-green-600' : 'text-muted-foreground'}`}>
          {item.changePct !== null
            ? `${isRising ? '+' : ''}${item.changePct}%`
            : '-'}
        </span>

        {/* 현재가 */}
        <span className="text-xs font-bold w-16 text-right shrink-0">
          {item.currentPrice ? formatGold(item.currentPrice) : '-'}
        </span>
      </button>
      <DetailSheet item={item} open={open} onClose={() => setOpen(false)} />
    </>
  );
};

// ─── 그룹 섹션 ────────────────────────────────────────────────────────────────

const GroupSection = ({ group, items }: { group: string; items: PopularItem[] }) => (
  <div>
    <div className="px-3 py-1 bg-muted/30 border-y border-border/40">
      <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">
        {GROUP_LABEL[group] ?? group}
      </span>
    </div>
    {items.map(item => <ItemRow key={item.key} item={item} />)}
  </div>
);

// ─── 메인 섹션 ───────────────────────────────────────────────────────────────

export function PopularMarketSection() {
  const [items, setItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchPopularItems()
      .then(data => {
        setItems(data);
        // 가장 최근 lastAt 기준으로 업데이트 시각 표시
        const dates = data.flatMap(d => d.history).map(p => p.lastAt).filter(Boolean) as string[];
        if (dates.length) {
          const latest = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
          setUpdatedAt(latest.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const activeItems = items.filter(i => i.currentPrice);

  // 그룹별로 분류
  const grouped = GROUP_ORDER.reduce<Record<string, PopularItem[]>>((acc, g) => {
    const list = activeItems.filter(i => (i as any).group === g);
    if (list.length) acc[g] = list;
    return acc;
  }, {});

  return (
    <div className="mb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          주요 재료 시세
        </h2>
        {updatedAt && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <RefreshCw className="h-2.5 w-2.5" />
            {updatedAt}
          </span>
        )}
      </div>

      {/* 컬럼 헤더 */}
      <div className="flex items-center gap-2 px-3 pb-1 border-b border-border/40">
        <div className="w-7 shrink-0" />
        <span className="flex-1 text-[10px] text-muted-foreground">아이템</span>
        <span className="w-14 text-[10px] text-muted-foreground text-center">7일 추세</span>
        <span className="w-10 text-[10px] text-muted-foreground text-right">변동</span>
        <span className="w-16 text-[10px] text-muted-foreground text-right">현재가</span>
      </div>

      {/* 본문 */}
      <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/30">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <div className="w-7 h-7 bg-muted rounded animate-pulse shrink-0" />
              <div className="flex-1 h-3 bg-muted rounded animate-pulse" />
              <div className="w-14 h-4 bg-muted rounded animate-pulse" />
              <div className="w-10 h-3 bg-muted rounded animate-pulse" />
              <div className="w-16 h-3 bg-muted rounded animate-pulse" />
            </div>
          ))
        ) : activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1">
            <BarChart3 className="h-6 w-6 opacity-25" />
            <p className="text-xs">시세 수집 중 · 매일 09:00(KST) 업데이트</p>
          </div>
        ) : (
          Object.entries(grouped).map(([group, list]) => (
            <GroupSection key={group} group={group} items={list} />
          ))
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-right mt-1 px-1">
        클릭하면 7일 차트를 볼 수 있어요
      </p>
    </div>
  );
}
