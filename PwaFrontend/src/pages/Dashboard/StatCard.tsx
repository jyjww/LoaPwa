import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  label: string;
  colorClass?: string; // text-primary, text-accent 등
}

const StatCard = ({ icon, title, value, label, colorClass }: StatCardProps) => {
  return (
    <Card className="dashboard-card">
      <CardHeader className="dashboard-card-header pb-2 sm:pb-3">
        <div className="flex items-center gap-2">
          <div className={`h-5 w-5 ${colorClass}`}>{icon}</div>
          <CardTitle className="text-sm sm:text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="dashboard-card-content">
        <div className={`dashboard-stat-value ${colorClass}`}>{value}</div>
        <p className="dashboard-stat-label">{label}</p>
      </CardContent>
    </Card>
  );
};

export default StatCard;
