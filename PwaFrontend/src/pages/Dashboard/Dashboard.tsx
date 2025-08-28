import StatCard from './StatCard';
import { Star, TrendingUp, BarChart3 } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="min-h-screen p-2 sm:p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            icon={<Star />}
            title="Favorites"
            value={12}
            label="Items tracked"
            colorClass="text-primary"
          />
          <StatCard
            icon={<TrendingUp />}
            title="Alerts"
            value={3}
            label="Below target"
            colorClass="text-accent"
          />
          <StatCard
            icon={<BarChart3 />}
            title="Trends"
            value="-5.2%"
            label="Avg change"
            colorClass="text-primary"
          />
        </div>
        {/* Quick Actions, Recent Alerts는 같은 방식으로 분리 */}
      </div>
    </div>
  );
};

export default Dashboard;
