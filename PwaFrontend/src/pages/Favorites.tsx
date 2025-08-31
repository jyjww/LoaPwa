import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import ItemCard from '@/components/AuctionItemCard';
import { Star, Target, Bell, Trash2, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Mock favorites data
const mockFavorites = [
  {
    id: 'f1',
    name: 'Greatsword of Salvation',
    grade: 'Relic' as const,
    currentPrice: 9500,
    previousPrice: 10200,
    source: 'auction' as const,
    targetPrice: 10000,
    quality: 100,
    isAlerted: true,
  },
  {
    id: 'f2',
    name: 'Destruction Stone Crystal',
    grade: 'Epic' as const,
    currentPrice: 45,
    previousPrice: 50,
    source: 'market' as const,
    targetPrice: 40,
    tradeCount: 1250,
    isAlerted: false,
  },
  {
    id: 'f3',
    name: 'Pheon Bundle (100)',
    grade: 'Legendary' as const,
    currentPrice: 4200,
    previousPrice: 4500,
    source: 'market' as const,
    targetPrice: 4000,
    tradeCount: 156,
    isAlerted: true,
  },
];

const Favorites = () => {
  const [favorites, setFavorites] = useState(mockFavorites);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newTargetPrice, setNewTargetPrice] = useState('');

  const handleRemoveFavorite = (itemId: string) => {
    setFavorites(favorites.filter((item) => item.id !== itemId));
  };

  const handleEditTargetPrice = (item: any) => {
    setEditingItem(item);
    setNewTargetPrice(item.targetPrice.toString());
  };

  const handleSaveTargetPrice = () => {
    if (editingItem && newTargetPrice) {
      setFavorites(
        favorites.map((item) =>
          item.id === editingItem.id ? { ...item, targetPrice: parseInt(newTargetPrice) } : item,
        ),
      );
      setEditingItem(null);
      setNewTargetPrice('');
    }
  };

  const alertedItems = favorites.filter((item) => item.isAlerted);
  const trackedItems = favorites.filter((item) => !item.isAlerted);

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
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{favorites.length}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gaming-green">{alertedItems.length}</div>
                <div className="text-sm text-muted-foreground">Price Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  {Math.round(
                    (favorites.reduce((avg, item) => {
                      const change = item.previousPrice
                        ? ((item.currentPrice - item.previousPrice) / item.previousPrice) * 100
                        : 0;
                      return avg + change;
                    }, 0) /
                      favorites.length) *
                      10,
                  ) / 10}
                  %
                </div>
                <div className="text-sm text-muted-foreground">Avg. Change</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {alertedItems.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-gaming-green" />
              <h2 className="text-xl font-semibold">Price Alerts</h2>
              <Badge className="bg-gaming-green/20 text-gaming-green border-gaming-green/30">
                {alertedItems.length} items below target
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {alertedItems.map((item) => (
                <div key={item.id} className="relative">
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge className="bg-gaming-green text-gaming-green-foreground animate-pulse">
                      Alert!
                    </Badge>
                  </div>
                  <ItemCard item={item} isFavorite={true} />
                  <div className="mt-2 flex items-center justify-between p-2 bg-gaming-green/10 rounded-lg border border-gaming-green/20">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-medium">{item.targetPrice.toLocaleString()}G</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditTargetPrice(item)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFavorite(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Tracking</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trackedItems.map((item) => (
            <div key={item.id} className="relative">
              <ItemCard item={item} isFavorite={true} />
              <div className="mt-2 flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/30">
                <div className="text-sm">
                  <span className="text-muted-foreground">Target: </span>
                  <span className="font-medium">{item.targetPrice.toLocaleString()}G</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEditTargetPrice(item)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFavorite(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {favorites.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-muted-foreground mb-4">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No favorite items yet.</p>
                <p className="text-sm">
                  Add items from the Auction House or Market to start tracking prices.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Target Price Dialog */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Target Price</DialogTitle>
              <DialogDescription>Set a new target price for {editingItem?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Target Price (Gold)</label>
                <Input
                  type="number"
                  value={newTargetPrice}
                  onChange={(e) => setNewTargetPrice(e.target.value)}
                  placeholder="Enter target price..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveTargetPrice} className="flex-1">
                  Save Changes
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
