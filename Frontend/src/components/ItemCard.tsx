import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

interface ItemCardProps {
  item: {
    id: string;
    name: string;
    grade: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Relic";
    currentPrice: number;
    previousPrice?: number;
    source: "auction" | "market";
    quality?: number;
    tradeCount?: number;
  };
  onFavorite?: (item: any) => void;
  isFavorite?: boolean;
}

const ItemCard = ({ item, onFavorite, isFavorite = false }: ItemCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const gradeColors = {
    Common: "bg-muted text-muted-foreground",
    Uncommon: "bg-accent/20 text-accent border-accent/30",
    Rare: "bg-primary/20 text-primary border-primary/30", 
    Epic: "bg-secondary/20 text-secondary border-secondary/30",
    Legendary: "bg-accent/30 text-accent border-accent/40",
    Relic: "bg-primary/30 text-primary border-primary/40"
  };

  const priceChange = item.previousPrice 
    ? ((item.currentPrice - item.previousPrice) / item.previousPrice) * 100
    : 0;

  const handleFavorite = () => {
    setIsAnimating(true);
    onFavorite?.(item);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Card className="mobile-card group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2 p-3 sm:p-4 sm:pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-lg leading-tight truncate pr-2">{item.name}</CardTitle>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Badge className={`text-xs ${gradeColors[item.grade]} border`}>
                {item.grade}
              </Badge>
              {item.quality && (
                <Badge variant="secondary" className="text-xs">
                  Q: {item.quality}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavorite}
            className={`p-1 sm:p-2 transition-all shrink-0 ${isAnimating ? 'scale-125' : ''} ${
              isFavorite ? 'text-accent hover:text-accent/80' : 'text-muted-foreground hover:text-accent'
            }`}
          >
            <Star className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">Price</span>
            <span className="text-sm sm:text-lg font-bold text-primary">
              {item.currentPrice.toLocaleString()}G
            </span>
          </div>

          {item.previousPrice && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Change</span>
              <div className={`flex items-center gap-1 text-xs sm:text-sm ${
                priceChange > 0 ? 'text-destructive' : 'text-accent'
              }`}>
                {priceChange > 0 ? (
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                )}
                <span>{Math.abs(priceChange).toFixed(1)}%</span>
              </div>
            </div>
          )}

          {item.tradeCount && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Trades</span>
              <Badge variant="secondary" className="text-xs">
                {item.tradeCount}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemCard;