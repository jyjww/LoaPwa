import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Search, Star, Bell, BarChart3, Download } from 'lucide-react';
import usePWAInstall from '@/hooks/usePWAInstall';
import { fetchFavorites } from '@/services/favorites/favorites.service';
import { getCurrentAnonId } from '@/services/anonService';
import { calculate7DayChange } from '@/services/price-history.service';
import { PopularMarketSection } from '@/components/PopularMarketSection';

type Fav = {
  id: string;
  name: string;
  source: 'auction' | 'market';
  currentPrice: number;
  previousPrice?: number | null;
  targetPrice?: number | null;
  isAlerted: boolean;
  lastNotifiedAt?: string | Date | null;
  matchKey?: string;
};

const Dashboard = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { canInstall, isStandalone, isiOS, promptInstall } = usePWAInstall();

  const [favorites, setFavorites] = useState<Fav[]>([]);
  const [loading, setLoading] = useState(false);
  const [avgChange, setAvgChange] = useState<number | null>(null);
  const [isCalculatingAvg, setIsCalculatingAvg] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const hasToken = !!localStorage.getItem('access_token');
    const hasAnonId = !!getCurrentAnonId();
    return hasToken || hasAnonId;
  });

  // 설치 배너 제어
  useEffect(() => {
    const flag = localStorage.getItem('showInstallPrompt') === 'true';
    if (!isStandalone && (canInstall || isiOS || flag)) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [canInstall, isStandalone, isiOS]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.removeItem('showInstallPrompt');
  };

  const handleInstallClick = async () => {
    if (isiOS) return;
    const ok = await promptInstall();
    if (ok) setShowPrompt(false);
  };

  // 로그인 상태 감지 (토큰 또는 익명 ID 변경)
  useEffect(() => {
    const onStorage = () => {
      const hasToken = !!localStorage.getItem('access_token');
      const hasAnonId = !!getCurrentAnonId();
      setIsLoggedIn(hasToken || hasAnonId);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 즐겨찾기 로드 (로그인 사용자 또는 익명 사용자)
  useEffect(() => {
    if (!isLoggedIn) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    fetchFavorites()
      .then((list: any[]) => setFavorites(list ?? []))
      .catch((e) => {
        console.warn('[Dashboard] fetchFavorites failed:', e);
        setFavorites([]);
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  // 🔹 평균 변동률 계산 (즐겨찾기 변경 시)
  useEffect(() => {
    const calculateAverageChange = async () => {
      if (favorites.length === 0) {
        setAvgChange(null);
        return;
      }

      setIsCalculatingAvg(true);
      try {
        const changePromises = favorites.map(async (item) => {
          // matchKey가 있으면 실제 7일 변동률 계산, 없으면 null 반환
          if (item.matchKey) {
            const change = await calculate7DayChange(
              item.matchKey,
              item.previousPrice ?? undefined,
            );
            return change?.changePct ?? null;
          } else {
            // matchKey가 없으면 null 반환 (기존 로직 사용 안함)
            return null;
          }
        });

        const changes = await Promise.all(changePromises);
        const validChanges = changes.filter(
          (change): change is number => change !== null && !isNaN(change) && isFinite(change),
        );

        if (validChanges.length > 0) {
          const average =
            validChanges.reduce((sum, change) => sum + change, 0) / validChanges.length;
          setAvgChange(average);
        } else {
          setAvgChange(null);
        }
      } catch (error) {
        console.error('평균 변동률 계산 실패:', error);
        setAvgChange(null);
      } finally {
        setIsCalculatingAvg(false);
      }
    };

    calculateAverageChange();
  }, [favorites]);

  // ===== 파생 통계 =====
  const stats = useMemo(() => {
    if (!isLoggedIn || favorites.length === 0) {
      return {
        total: '-',
        alertsBelowTarget: '-',
        avgChangePct: '-',
        recentAlerts: [] as Fav[],
      };
    }

    const total = favorites.length;

    // 목표가 이하 알림 건수
    const alertsBelowTarget = favorites.filter((f) => {
      const hasTarget = typeof f.targetPrice === 'number' && !Number.isNaN(f.targetPrice);
      return f.isAlerted && hasTarget && f.currentPrice <= (f.targetPrice as number);
    }).length;

    // 평균 변화율 (%) - 새로운 로직 사용
    const avgChangePct = isCalculatingAvg
      ? '계산 중...'
      : avgChange !== null
        ? `${Math.round(avgChange * 10) / 10}%`
        : '-';

    // 최근 알림(목표가 이한 항목 + 최근 변경 우선) 상위 3
    const recentAlerts = favorites
      .filter((f) => {
        const hasTarget = typeof f.targetPrice === 'number' && !Number.isNaN(f.targetPrice);
        return f.isAlerted && hasTarget && f.currentPrice <= (f.targetPrice as number);
      })
      .sort((a, b) => {
        const ta = new Date(a.lastNotifiedAt || 0).getTime();
        const tb = new Date(b.lastNotifiedAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 3);

    return { total, alertsBelowTarget, avgChangePct, recentAlerts };
  }, [favorites, isLoggedIn, avgChange, isCalculatingAvg]);

  // UI 헬퍼 - 익명 사용자도 즐겨찾기 사용 가능하므로 메시지 제거
  const HintLogin = () => null;

  return (
    <div className="p-2 sm:p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Navigation />

        {/* ✅ PWA 설치 안내 배너 */}
        {showPrompt && (
          <Card className="mb-4 border-2 border-primary/40 bg-primary/5">
            <CardHeader className="flex items-center justify-between flex-row">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                홈화면에 추가하고 더 편리하게 이용하세요!
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs" onClick={handleDismiss}>
                  닫기
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex items-center justify-between gap-3">
              {isiOS ? (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  iOS는 <b>공유</b> 버튼 → <b>“홈 화면에 추가”</b>를 눌러 설치할 수 있어요.
                </p>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    설치하면 더 빠르게 접근할 수 있어요.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleInstallClick}>
                      설치
                    </Button>
                    {/* 여기에도 간단 링크 추가 가능 */}
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/push-help">사용 가이드</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== 주요 재료 시세 (공개) ===== */}
        <PopularMarketSection />

        {/* ===== Quick Stats ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {/* Favorites */}
          <Card className="mobile-card bg-gradient-to-br from-card to-secondary/10">
            <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-lg">Favorites</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">
                {loading ? '…' : stats.total}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Items tracked</p>
              <HintLogin />
            </CardContent>
          </Card>

          {/* Alerts (Below target) */}
          <Card className="mobile-card bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                <CardTitle className="text-sm sm:text-lg">Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-3xl font-bold text-accent mb-1 sm:mb-2">
                {loading ? '…' : stats.alertsBelowTarget}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Below target</p>
              <HintLogin />
            </CardContent>
          </Card>

          {/* Trends (Avg change) */}
          <Card className="mobile-card bg-gradient-to-br from-card to-primary/10 sm:col-span-1 col-span-1">
            <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-lg">Trends</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">
                {loading ? '…' : stats.avgChangePct}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Avg change</p>
              <HintLogin />
            </CardContent>
          </Card>
        </div>

        {/* ===== Quick Actions ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="mobile-card hover:shadow-lg transition-all duration-300">
            <CardHeader className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg">
                  <Search className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm sm:text-base">Auction House</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Search auctions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Link to="/auction">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm">
                  Browse Auctions
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="mobile-card hover:shadow-lg transition-all duration-300">
            <CardHeader className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-secondary/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm sm:text-base">Market</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Track materials</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Link to="/market">
                <Button variant="secondary" className="w-full text-xs sm:text-sm">
                  Browse Market
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ===== Recent Activity (실데이터 or 로그인 안내) ===== */}
        <Card className="mobile-card">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              Recent Alerts
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Items below target price
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {loading ? (
              <div className="text-xs sm:text-sm text-muted-foreground">불러오는 중…</div>
            ) : stats.recentAlerts.length === 0 ? (
              <div className="text-xs sm:text-sm text-muted-foreground">최근 알림이 없습니다.</div>
            ) : (
              <div className="space-y-2 sm:space-y-4">
                {stats.recentAlerts.map((item, idx) => {
                  const prev = typeof item.previousPrice === 'number' ? item.previousPrice : null;
                  const change =
                    prev && prev > 0
                      ? Math.round(((item.currentPrice - prev) / prev) * 1000) / 10
                      : 0;
                  return (
                    <div
                      key={item.id ?? idx}
                      className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg border border-border/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Target:{' '}
                          {typeof item.targetPrice === 'number'
                            ? `${item.targetPrice.toLocaleString()}G`
                            : '-'}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="font-bold text-accent text-xs sm:text-sm">
                          {item.currentPrice.toLocaleString()}G
                        </div>
                        <div className="text-xs text-accent">
                          {change > 0 ? `+${change}%` : `${change}%`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
