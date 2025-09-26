import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import AuctionItemCard from '@/components/AuctionItemCard';
import MarketItemCard from '@/components/MarketItemCard';
import { Star, Bell, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchFavorites,
  removeFavorite,
  updateTargetPrice,
} from '@/services/favorites/favorites.service';

// ---------- 평탄화 어댑터(모듈 스코프) ----------
const normalizeAuctionFavorite = (f: any) => {
  if (f?.source !== 'auction') return f;

  const isSnapshot = !!(
    f?.auctionInfo &&
    typeof f.auctionInfo === 'object' &&
    'auctionInfo' in f.auctionInfo
  );
  const inner = f?.auctionInfo?.auctionInfo ?? f?.auctionInfo ?? null;

  return {
    ...f,
    __fromSnapshot: isSnapshot, // 👈 스냅샷 힌트
    auctionInfo: inner
      ? {
          StartPrice: typeof inner.StartPrice === 'number' ? inner.StartPrice : null,
          BidStartPrice: typeof inner.BidStartPrice === 'number' ? inner.BidStartPrice : null,
          BuyPrice: typeof inner.BuyPrice === 'number' ? inner.BuyPrice : null,
          EndDate: typeof inner.EndDate === 'string' ? inner.EndDate : null,
        }
      : undefined,
    options: Array.isArray(f?.options)
      ? f.options
      : Array.isArray(f?.auctionInfo?.options)
        ? f.auctionInfo.options
        : [],
  };
};

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newTargetPrice, setNewTargetPrice] = useState('');

  // 🔹 컴포넌트 마운트 시 즐겨찾기 불러오기
  useEffect(() => {
    fetchFavorites()
      .then(setFavorites)
      .catch((err) => {
        console.error('즐겨찾기 불러오기 실패:', err);
        navigate('/login');
      });
  }, [navigate]);

  // 🔹 즐겨찾기 삭제
  const handleRemoveFavorite = async (itemId: string) => {
    try {
      await removeFavorite(itemId);
      setFavorites((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      console.error('즐겨찾기 삭제 실패:', err);
      navigate('/login');
    }
  };

  // 🔹 타겟 가격 수정 다이얼로그 열기
  const handleEditTargetPrice = (item: any) => {
    setEditingItem(item);
    setNewTargetPrice(item.targetPrice.toString());
  };

  // 🔹 타겟 가격 저장
  const handleSaveTargetPrice = async () => {
    if (editingItem && newTargetPrice) {
      try {
        const updated = await updateTargetPrice(editingItem.id, parseInt(newTargetPrice, 10));
        setFavorites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } catch (err) {
        console.error('타겟 가격 수정 실패:', err);
        navigate('/login');
      } finally {
        setEditingItem(null);
        setNewTargetPrice('');
      }
    }
  };

  // 📦 분류
  const auctionFavorites = favorites.filter((item) => item.source === 'auction');
  const marketFavorites = favorites.filter((item) => item.source === 'market');

  const getAlertedItems = (list: any[]) => list.filter((item) => item.isAlerted);
  const getTrackedItems = (list: any[]) => list.filter((item) => !item.isAlerted);

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Navigation />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              My Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat label="Total Items" value={favorites.length} />
              <Stat
                label="Price Alerts"
                value={getAlertedItems(favorites).length}
                className="text-gaming-green"
              />
              <Stat
                label="Avg. Change"
                value={`${
                  Math.round(
                    (favorites.reduce((avg, item) => {
                      const change =
                        item.previousPrice && item.previousPrice > 0
                          ? ((item.currentPrice - item.previousPrice) / item.previousPrice) * 100
                          : 0;
                      return avg + change;
                    }, 0) /
                      Math.max(favorites.length, 1)) *
                      10,
                  ) / 10
                }%`}
                className="text-accent"
              />
            </div>
          </CardContent>
        </Card>

        {/* 경매장 즐겨찾기 */}
        <FavoriteSection
          label="경매장 즐겨찾기"
          icon={<Bell className="text-gaming-green h-5 w-5" />}
          alertedItems={getAlertedItems(auctionFavorites)}
          trackedItems={getTrackedItems(auctionFavorites)}
          ItemCard={AuctionItemCard}
          onRemove={handleRemoveFavorite}
          onEdit={handleEditTargetPrice}
        />

        {/* 거래소 즐겨찾기 */}
        <FavoriteSection
          label="거래소 즐겨찾기"
          icon={<ShoppingCart className="text-yellow-600 h-5 w-5" />}
          alertedItems={getAlertedItems(marketFavorites)}
          trackedItems={getTrackedItems(marketFavorites)}
          ItemCard={MarketItemCard}
          onRemove={handleRemoveFavorite}
          onEdit={handleEditTargetPrice}
        />

        {favorites.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-muted-foreground mb-4">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No favorite items yet.</p>
                <p className="text-sm">Add items from Auction or Market to track them here.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 🎯 Dialog for Editing Target Price */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Target Price</DialogTitle>
              <DialogDescription>Set a new target price for {editingItem?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="number"
                value={newTargetPrice}
                onChange={(e) => setNewTargetPrice(e.target.value)}
                placeholder="Enter target price..."
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveTargetPrice} className="flex-1">
                  Save
                </Button>
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Favorites;

// 🔧 하단 유틸 컴포넌트
const Stat = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: any;
  className?: string;
}) => (
  <div className="text-center">
    <div className={`text-2xl font-bold ${className}`}>{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

const FavoriteSection = ({
  label,
  icon,
  alertedItems,
  trackedItems,
  ItemCard,
  onRemove,
  onEdit,
}: {
  label: string;
  icon: React.ReactNode;
  alertedItems: any[];
  trackedItems: any[];
  ItemCard: React.FC<any>;
  onRemove: (id: string) => void | Promise<void>;
  onEdit: (item: any) => void;
}) => (
  <>
    <div className="mb-4 flex items-center gap-2">
      {icon}
      <h2 className="text-xl font-semibold">{label}</h2>
      <Badge className="bg-muted/20 text-muted-foreground border-muted/30">
        {alertedItems.length + trackedItems.length} items
      </Badge>
    </div>

    {/* FavoriteSection 컴포넌트 내부 (alerted + tracked 공통 적용) */}
    {alertedItems.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {alertedItems.map((raw) => {
          const item = raw.source === 'auction' ? normalizeAuctionFavorite(raw) : raw;

          console.log(
            '[FavoriteSection] alerted=',
            alertedItems.length,
            'tracked=',
            trackedItems.length,
          );

          return (
            <div key={item.id} className="space-y-2">
              {item.source === 'auction' ? (
                <ItemCard item={item} isFavorite />
              ) : (
                <MarketItemCard item={item} isFavorite onFavorite={() => {}} />
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                  Edit Target
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onRemove(item.id)}>
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {trackedItems.map((raw) => {
        const item = raw.source === 'auction' ? normalizeAuctionFavorite(raw) : raw;
        return (
          <div key={item.id} className="space-y-2">
            {item.source === 'auction' ? (
              <ItemCard item={item} isFavorite />
            ) : (
              <MarketItemCard item={item} isFavorite onFavorite={() => {}} />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                Edit Target
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onRemove(item.id)}>
                Remove
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  </>
);
