import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Star, TrendingUp, Gamepad2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '메인', icon: TrendingUp },
    { path: '/auction', label: '경매장', icon: Search },
    { path: '/market', label: '거래소', icon: Search },
    { path: '/favorites', label: '즐겨찾기', icon: Star },
  ];

  return (
    <Card className="mobile-card p-3 sm:p-4 mb-4 mx-2 sm:mx-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold text-primary">로아 알리미</h1>
        </div>
      </div>

      <nav className="grid grid-cols-2 sm:flex gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive ? 'default' : 'secondary'}
                size="sm"
                className={`w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.label.split(' ')[0]}</span>
              </Button>
            </Link>
          );
        })}
      </nav>
    </Card>
  );
};

export default Navigation;
