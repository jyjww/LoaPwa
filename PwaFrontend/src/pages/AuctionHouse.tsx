import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import ItemCard from "@/components/ItemCard";
import { Search, Filter } from "lucide-react";

// Mock data for auction house items
const mockAuctionItems = [
  {
    id: "1",
    name: "Greatsword of Salvation",
    grade: "Relic" as const,
    currentPrice: 12500,
    previousPrice: 13200,
    source: "auction" as const,
    quality: 100
  },
  {
    id: "2", 
    name: "Legendary Ability Stone",
    grade: "Legendary" as const,
    currentPrice: 2100,
    previousPrice: 1950,
    source: "auction" as const,
    quality: 85
  },
  {
    id: "3",
    name: "Epic Weapon Enhancement Stone",
    grade: "Epic" as const,
    currentPrice: 750,
    previousPrice: 800,
    source: "auction" as const,
    quality: 90
  },
  {
    id: "4",
    name: "Rare Accessory",
    grade: "Rare" as const,
    currentPrice: 450,
    source: "auction" as const,
    quality: 75
  },
  {
    id: "5",
    name: "Ancient Relic Set Piece",
    grade: "Relic" as const,
    currentPrice: 18900,
    previousPrice: 19500,
    source: "auction" as const,
    quality: 95
  },
  {
    id: "6",
    name: "Legendary Engraving Recipe",
    grade: "Legendary" as const,
    currentPrice: 3400,
    previousPrice: 3200,
    source: "auction" as const,
    quality: 100
  }
];

const AuctionHouse = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("All");

  const filteredItems = useMemo(() => {
    return mockAuctionItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = selectedGrade === "All" || item.grade === selectedGrade;
      return matchesSearch && matchesGrade;
    });
  }, [searchQuery, selectedGrade]);

  const grades = ["All", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Relic"];

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
              <Search className="h-5 w-5 text-primary" />
              Auction House Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search for items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-input border-border/50 focus:border-primary"
                />
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Grade:</span>
              <div className="flex flex-wrap gap-2">
                {grades.map((grade) => (
                  <Button
                    key={grade}
                    variant={selectedGrade === grade ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedGrade(grade)}
                    className="text-xs"
                  >
                    {grade}
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
          <Badge variant="secondary" className="text-sm">
            Live prices updated every 5 minutes
          </Badge>
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
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items found matching your search.</p>
                <p className="text-sm">Try adjusting your search terms or filters.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AuctionHouse;