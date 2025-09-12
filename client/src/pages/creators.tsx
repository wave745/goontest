import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { CategoryChips } from '@/components/CategoryChips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, Coins, MessageCircle, UserPlus, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { User } from '@shared/schema';

type CreatorWithStats = User & {
  posts: any[];
  tokens: any[];
  followerCount: number;
  postCount: number;
};

type CreatorsResponse = {
  creators: CreatorWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export default function Creators() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);

  const { data: creatorsData, isLoading } = useQuery<CreatorsResponse>({
    queryKey: ['/api/creators', page],
    queryFn: async () => {
      const response = await fetch(`/api/creators?page=${page}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch creators');
      return response.json();
    },
  });

  const creators = creatorsData?.creators || [];
  const pagination = creatorsData?.pagination;

  const filteredCreators = creators?.filter(creator => {
    const matchesSearch = creator.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         creator.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' ||
                           (selectedCategory === 'Verified' && creator.is_creator) ||
                           (selectedCategory === 'GOON Holders' && creator.tokens.length > 0);
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 loading-skeleton rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 loading-skeleton rounded w-3/4"></div>
                        <div className="h-3 loading-skeleton rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 loading-skeleton rounded"></div>
                      <div className="h-3 loading-skeleton rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Discover Creators</h1>
              <p className="text-muted-foreground">Connect with talented creators in the GoonHub community</p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                  data-testid="input-search-creators"
                />
              </div>
            </div>

            <CategoryChips
              categories={['All', 'Verified', 'GOON Holders', 'New']}
              onCategoryChange={setSelectedCategory}
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{creators?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Creators</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {creators?.filter(c => c.is_creator).length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Verified</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Coins className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {creators?.reduce((total, c) => total + c.tokens.length, 0) || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">GOON Tokens</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {creators?.reduce((total, c) => total + (c.posts?.length || 0), 0) || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Posts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Creators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreators?.map((creator) => (
                <Card key={creator.id} className="bg-card border-border hover:border-accent/50 transition-colors group">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.handle}`}
                        alt={creator.handle}
                        className="w-16 h-16 rounded-full border-2 border-border group-hover:border-accent/50 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg text-foreground truncate">@{creator.handle}</CardTitle>
                          {creator.is_creator && (
                            <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                              <Crown className="h-2.5 w-2.5 text-accent-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{creator.bio}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">{creator.postCount}</p>
                        <p className="text-xs text-muted-foreground">Posts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">
                          {(creator.followerCount / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-muted-foreground">Followers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">{creator.tokens.length}</p>
                        <p className="text-xs text-muted-foreground">GOON</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/c/${creator.handle}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full border-border hover:border-accent">
                          View Profile
                        </Button>
                      </Link>
                      <Link href={`/chat/${creator.handle}`}>
                        <Button size="sm" className="btn-goon">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="border-border hover:border-accent">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCreators?.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No creators found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.hasPrev}
                  className="border-border hover:border-accent"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({pagination.total} total creators)
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNext}
                  className="border-border hover:border-accent"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}







