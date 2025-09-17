'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  Heart, 
  Eye, 
  Upload, 
  Coins, 
  Users, 
  Play, 
  Image as ImageIcon,
  Video as VideoIcon,
  Zap,
  Clock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase, getActivities, getPosts, getTokens, type Activity as ActivityType, type Post, type Token, type User } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

type ActivityWithDetails = ActivityType & {
  user?: User;
  post?: Post;
  token?: Token;
};

export default function Recent() {
  const { connected, publicKey } = useWallet();
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) return;

    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        
        // Get user's activities
        const userActivities = await getActivities(publicKey.toBase58(), 50);
        
        // Get user's posts and tokens for additional context
        const userPosts = await getPosts({ creator_id: publicKey.toBase58() });
        const userTokens = await getTokens(publicKey.toBase58());
        
        // Create activity entries for posts and tokens
        const postActivities: ActivityWithDetails[] = (userPosts || []).map(post => ({
          id: `post_${post.id}`,
          user_id: publicKey.toBase58(),
          type: 'post' as const,
          target_id: post.id,
          title: 'New Post',
          description: post.caption || 'Shared new content',
          metadata: { post },
          created_at: post.created_at,
          post,
        }));

        const tokenActivities: ActivityWithDetails[] = (userTokens || []).map(token => ({
          id: `token_${token.id}`,
          user_id: publicKey.toBase58(),
          type: 'coin' as const,
          target_id: token.id,
          title: 'New GOON Coin',
          description: `Launched ${token.name}`,
          metadata: { token },
          created_at: token.created_at,
          token,
        }));

        // Combine and sort all activities
        const allActivities = [...userActivities, ...postActivities, ...tokenActivities]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50);

        setActivities(allActivities);
        
      } catch (error) {
        console.error('Error fetching activities:', error);
        toast({
          title: "Error",
          description: "Failed to load recent activities",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [connected, publicKey]);

  // Set up Realtime subscription for new activities
  useEffect(() => {
    if (!connected || !publicKey) return;

    const channel = supabase
      .channel('activities')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activities' },
        (payload) => {
          if (payload.new.user_id === publicKey.toBase58()) {
            setActivities(prev => [payload.new as ActivityWithDetails, ...prev]);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.new.creator_id === publicKey.toBase58()) {
            const newActivity: ActivityWithDetails = {
              id: `post_${payload.new.id}`,
              user_id: publicKey.toBase58(),
              type: 'post',
              target_id: payload.new.id,
              title: 'New Post',
              description: payload.new.caption || 'Shared new content',
              metadata: { post: payload.new },
              created_at: payload.new.created_at,
              post: payload.new as Post,
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'tokens' },
        (payload) => {
          if (payload.new.creator_id === publicKey.toBase58()) {
            const newActivity: ActivityWithDetails = {
              id: `token_${payload.new.id}`,
              user_id: publicKey.toBase58(),
              type: 'coin',
              target_id: payload.new.id,
              title: 'New GOON Coin',
              description: `Launched ${payload.new.name}`,
              metadata: { token: payload.new },
              created_at: payload.new.created_at,
              token: payload.new as Token,
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [connected, publicKey]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Re-fetch activities
    if (publicKey) {
      try {
        const userActivities = await getActivities(publicKey.toBase58(), 50);
        const userPosts = await getPosts({ creator_id: publicKey.toBase58() });
        const userTokens = await getTokens(publicKey.toBase58());
        
        const postActivities: ActivityWithDetails[] = (userPosts || []).map(post => ({
          id: `post_${post.id}`,
          user_id: publicKey.toBase58(),
          type: 'post' as const,
          target_id: post.id,
          title: 'New Post',
          description: post.caption || 'Shared new content',
          metadata: { post },
          created_at: post.created_at,
          post,
        }));

        const tokenActivities: ActivityWithDetails[] = (userTokens || []).map(token => ({
          id: `token_${token.id}`,
          user_id: publicKey.toBase58(),
          type: 'coin' as const,
          target_id: token.id,
          title: 'New GOON Coin',
          description: `Launched ${token.name}`,
          metadata: { token },
          created_at: token.created_at,
          token,
        }));

        const allActivities = [...userActivities, ...postActivities, ...tokenActivities]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50);

        setActivities(allActivities);
      } catch (error) {
        console.error('Error refreshing activities:', error);
      }
    }
    setIsRefreshing(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <Upload className="h-4 w-4" />;
      case 'coin':
        return <Coins className="h-4 w-4" />;
      case 'follow':
        return <Users className="h-4 w-4" />;
      case 'stream':
        return <Play className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'post':
        return 'text-blue-500 bg-blue-500/20';
      case 'coin':
        return 'text-yellow-500 bg-yellow-500/20';
      case 'follow':
        return 'text-green-500 bg-green-500/20';
      case 'stream':
        return 'text-red-500 bg-red-500/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Connect Your Wallet</h1>
                <p className="text-muted-foreground">Please connect your wallet to view your recent activities.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-muted-foreground">Loading activities...</p>
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
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Recent Activity</h1>
                <p className="text-muted-foreground">Your latest posts, GOON coins, and platform activity</p>
              </div>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Activities List */}
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <Card key={activity.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Activity Icon */}
                        <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>

                        {/* Activity Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{activity.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(activity.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {activity.description}
                          </p>

                          {/* Post Preview */}
                          {activity.post && (
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                                {activity.post.content_type === 'video' ? (
                                  <VideoIcon className="h-6 w-6 text-muted-foreground" />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground line-clamp-2">
                                  {activity.post.caption || 'Untitled post'}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {activity.post.views || 0}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    {activity.post.likes || 0}
                                  </div>
                                  {activity.post.price_lamports > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {(activity.post.price_lamports / 1e9).toFixed(3)} SOL
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Token Preview */}
                          {activity.token && (
                            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 flex items-center justify-center">
                                <Zap className="h-6 w-6 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {activity.token.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {activity.token.symbol} • Supply: {activity.token.supply.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Recent Activity</h3>
                  <p className="text-muted-foreground mb-4">
                    Start creating content or launching GOON coins to see your activity here.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button className="bg-accent hover:bg-accent/90">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Content
                    </Button>
                    <Button variant="outline">
                      <Coins className="h-4 w-4 mr-2" />
                      Launch GOON Coin
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Load More */}
            {activities.length > 0 && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" className="bg-card border-border text-card-foreground hover:bg-accent/10">
                  Load More Activities
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
