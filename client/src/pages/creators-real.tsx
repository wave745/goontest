'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Filter, 
  Star, 
  Heart, 
  Eye, 
  Upload, 
  Coins, 
  Check, 
  Plus,
  Loader2,
  Crown,
  Sparkles,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { supabase, getUsers, getPosts, getTokens, type User, type Post, type Token } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

type CreatorWithStats = User & {
  postCount: number;
  tokenCount: number;
  totalViews: number;
  followerCount: number;
  isFollowing?: boolean;
};

export default function Creators() {
  const { connected, publicKey } = useWallet();
  const [creators, setCreators] = useState<CreatorWithStats[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<CreatorWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'verified'>('popular');

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setIsLoading(true);
        
        // Get all creators
        const creatorsData = await getUsers(100);
        
        // Get stats for each creator
        const creatorsWithStats = await Promise.all(
          (creatorsData || []).map(async (creator) => {
            // Get creator's posts
            const creatorPosts = await getPosts({ creator_id: creator.id });
            
            // Get creator's tokens
            const creatorTokens = await getTokens(creator.id);
            
            // Calculate stats
            const postCount = creatorPosts?.length || 0;
            const tokenCount = creatorTokens?.length || 0;
            const totalViews = creatorPosts?.reduce((sum, post) => sum + (post.views || 0), 0) || 0;
            const followerCount = Math.floor(Math.random() * 1000) + 10; // TODO: Get real follower count
            
            return {
              ...creator,
              postCount,
              tokenCount,
              totalViews,
              followerCount,
              isFollowing: false, // TODO: Check if current user follows this creator
            };
          })
        );
        
        setCreators(creatorsWithStats);
        setFilteredCreators(creatorsWithStats);
        
      } catch (error) {
        console.error('Error fetching creators:', error);
        toast({
          title: "Error",
          description: "Failed to load creators",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreators();
  }, []);

  // Filter and sort creators
  useEffect(() => {
    let filtered = creators;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(creator =>
        creator.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered = filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'popular':
        filtered = filtered.sort((a, b) => b.followerCount - a.followerCount);
        break;
      case 'verified':
        filtered = filtered.sort((a, b) => {
          if (a.age_verified && !b.age_verified) return -1;
          if (!a.age_verified && b.age_verified) return 1;
          return b.followerCount - a.followerCount;
        });
        break;
    }

    setFilteredCreators(filtered);
  }, [creators, searchQuery, sortBy]);

  const handleFollow = async (creatorId: string) => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to follow creators",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement follow functionality
      setCreators(prev => 
        prev.map(creator => 
          creator.id === creatorId 
            ? { ...creator, isFollowing: !creator.isFollowing, followerCount: creator.isFollowing ? creator.followerCount - 1 : creator.followerCount + 1 }
            : creator
        )
      );
      
      toast({
        title: "Success",
        description: "Follow status updated",
      });
    } catch (error) {
      console.error('Error following creator:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getVerificationBadge = (creator: CreatorWithStats) => {
    if (creator.age_verified) {
      return (
        <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">
          <Check className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-muted-foreground">Loading creators...</p>
                </div>
              </div>
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
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="h-8 w-8 text-accent" />
                <h1 className="text-3xl font-bold text-foreground">Creators</h1>
              </div>
              <p className="text-muted-foreground">
                Discover amazing creators and their content on GoonHub
              </p>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search creators..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="flex gap-2">
                    <Button
                      variant={sortBy === 'popular' ? 'default' : 'outline'}
                      onClick={() => setSortBy('popular')}
                      className="flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Popular
                    </Button>
                    <Button
                      variant={sortBy === 'newest' ? 'default' : 'outline'}
                      onClick={() => setSortBy('newest')}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Newest
                    </Button>
                    <Button
                      variant={sortBy === 'verified' ? 'default' : 'outline'}
                      onClick={() => setSortBy('verified')}
                      className="flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Verified
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Creators Grid */}
            {filteredCreators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCreators.map((creator) => (
                  <Card key={creator.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                    <CardContent className="p-6">
                      {/* Creator Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={creator.avatar_url} alt={creator.handle || 'Creator'} />
                          <AvatarFallback className="text-lg">
                            {creator.handle?.charAt(0).toUpperCase() || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {creator.handle || 'Unnamed Creator'}
                            </h3>
                            {getVerificationBadge(creator)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {creator.bio || 'No bio available'}
                          </p>

                          {/* Wallet Address */}
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {creator.id.slice(0, 8)}...{creator.id.slice(-8)}
                          </code>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold text-foreground">
                            {formatNumber(creator.followerCount)}
                          </div>
                          <div className="text-xs text-muted-foreground">Followers</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold text-foreground">
                            {formatNumber(creator.totalViews)}
                          </div>
                          <div className="text-xs text-muted-foreground">Views</div>
                        </div>
                      </div>

                      {/* Content Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Upload className="h-4 w-4" />
                          {creator.postCount} posts
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4" />
                          {creator.tokenCount} coins
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant={creator.isFollowing ? "outline" : "default"}
                          onClick={() => handleFollow(creator.id)}
                          className="flex-1 flex items-center gap-2"
                          disabled={!connected}
                        >
                          {creator.isFollowing ? (
                            <>
                              <Check className="h-4 w-4" />
                              Following
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Follow
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            // TODO: Navigate to creator profile
                            toast({
                              title: "Coming Soon",
                              description: "Creator profiles will be available soon",
                            });
                          }}
                          className="px-3"
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchQuery ? 'No creators found' : 'No creators yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'Be the first to become a creator on GoonHub!'
                    }
                  </p>
                  {!searchQuery && connected && (
                    <Button className="bg-accent hover:bg-accent/90">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Become a Creator
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Load More */}
            {filteredCreators.length > 0 && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" className="bg-card border-border text-card-foreground hover:bg-accent/10">
                  Load More Creators
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
