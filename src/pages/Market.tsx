import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import ItemCard from "@/components/ItemCard";
import { Search, Filter, TrendingUp } from "lucide-react";

// Mock data for market items
const mockMarketItems = [
  {
    id: "m1",
    name: "Destruction Stone Crystal",
    grade: "Epic" as const,
    currentPrice: 45,
    previousPrice: 50,
    source: "market" as const,
    tradeCount: 1250
  },
  {
    id: "m2", 
    name: "Guardian Stone Crystal",
    grade: "Epic" as const,
    currentPrice: 32,
    previousPrice: 28,
    source: "market" as const,
    tradeCount: 980
  },
  {
    id: "m3",
    name: "Pheon Bundle (100)",
    grade: "Legendary" as const,
    currentPrice: 4200,
    previousPrice: 4500,
    source: "market" as const,
    tradeCount: 156
  },
  {
    id: "m4",
    name: "Great Honor Leapstone",
    grade: "Legendary" as const,
    currentPrice: 125,
    previousPrice: 130,
    source: "market" as const,
    tradeCount: 2100
  },
  {
    id: "m5",
    name: "Superior Oreha Fusion Material",
    grade: "Rare" as const,
    currentPrice: 85,
    previousPrice: 90,
    source: "market" as const,
    tradeCount: 890
  },
  {
    id: "m6",
    name: "Legendary Card Pack",
    grade: "Legendary" as const,
    currentPrice: 2800,
    previousPrice: 2950,
    source: "market" as const,
    tradeCount: 245
  }
];

const Market = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    "All", 
    "Enhancement Materials", 
    "Consumables", 
    "Card Packs",
    "Currencies"
  ];

  const filteredItems = useMemo(() => {
    return mockMarketItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      // In a real app, items would have categories
      return matchesSearch;
    });
  }, [searchQuery]);

  const handleFavorite = (item: any) => {
    // In a real app, this would save to favorites
    console.log("Added to favorites:", item.name);
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <Navigation />
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary-foreground" />
              Market Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search for materials, consumables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-input border-border/50 focus:border-secondary"
                />
              </div>
              <Button variant="secondary" className="hover:bg-secondary/90">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Category:</span>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="text-xs"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {filteredItems.length} items found
          </h2>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              Live market data
            </Badge>
            <Badge className="bg-gaming-green/20 text-gaming-green border-gaming-green/30 text-sm">
              High trade volume
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onFavorite={handleFavorite}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-muted-foreground mb-4">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No market items found matching your search.</p>
                <p className="text-sm">Try adjusting your search terms or browse categories.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Market;