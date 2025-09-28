import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import { TrendingUp, Search, Star, Bell, BarChart3, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePWAInstall from '@/hooks/usePWAInstall';

const Dashboard = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { canInstall, isStandalone, isiOS, promptInstall } = usePWAInstall();

  useEffect(() => {
    const flag = localStorage.getItem('showInstallPrompt') === 'true';
    if (!isStandalone && (flag || canInstall)) setShowPrompt(true);
  }, [canInstall, isStandalone]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.removeItem('showInstallPrompt');
  };

  const handleInstallClick = async () => {
    if (isiOS) {
      // iOS는 시스템 프롬프트가 없으므로 가이드만 유지
      return;
    }
    const ok = await promptInstall();
    if (ok) setShowPrompt(false);
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 bg-background">
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
              <Button variant="ghost" size="sm" className="text-xs" onClick={handleDismiss}>
                닫기
              </Button>
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
                  <Button size="sm" onClick={handleInstallClick}>
                    설치
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {/* Quick Stats */}
          <Card className="mobile-card bg-gradient-to-br from-card to-secondary/10">
            <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-lg">Favorites</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">12</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Items tracked</p>
            </CardContent>
          </Card>

          <Card className="mobile-card bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                <CardTitle className="text-sm sm:text-lg">Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-3xl font-bold text-accent mb-1 sm:mb-2">3</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Below target</p>
            </CardContent>
          </Card>

          <Card className="mobile-card bg-gradient-to-br from-card to-primary/10 sm:col-span-1 col-span-1">
            <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-lg">Trends</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">-5.2%</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Avg change</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
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

        {/* Recent Activity */}
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
            <div className="space-y-2 sm:space-y-4">
              {[
                { name: 'Greatsword of Salvation', price: 9500, target: 10000, change: -5.0 },
                { name: 'Legendary Ability Stone', price: 1800, target: 2000, change: -10.0 },
                { name: 'Pheon Bundle', price: 4200, target: 4500, change: -6.7 },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg border border-border/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs sm:text-sm truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Target: {item.target.toLocaleString()}G
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="font-bold text-accent text-xs sm:text-sm">
                      {item.price.toLocaleString()}G
                    </div>
                    <div className="text-xs text-accent">{item.change}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
