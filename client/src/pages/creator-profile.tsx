import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { CategoryChips } from '@/components/CategoryChips';
import VideoCard from '@/components/VideoCard';
import MasonryGrid from '@/components/MasonryGrid';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserPlus, MessageCircle, Coins } from 'lucide-react';
import type { User, Post, Token } from '@shared/schema';

type CreatorWithStats = User & {
  posts: Post[];
  tokens: Token[];
  followerCount: number;
  postCount: number;
};

export default function CreatorProfile() {
  const { handle } = useParams<{ handle: string }>();
  
  const { data: creator, isLoading } = useQuery<CreatorWithStats>({
    queryKey: ['/api/creators', handle],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="loading-skeleton h-40 rounded-xl mb-4"></div>
            <div className="loading-skeleton h-24 rounded-xl"></div>
          </main>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground">Creator not found</h1>
              <p className="text-muted-foreground">The creator you're looking for doesn't exist.</p>
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
        <main className="flex-1">
          {/* Creator Banner */}
          <div className="relative h-48 bg-panel">
            {creator.banner_url && (
              <img 
                src={creator.banner_url} 
                alt={`${creator.handle} banner`} 
                className="w-full h-full object-cover" 
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            
            {/* Profile Picture */}
            <div className="absolute -bottom-12 left-6">
              <img
                src={creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.handle}`}
                alt={creator.handle}
                className="w-24 h-24 rounded-full border-4 border-bg"
              />
            </div>
          </div>

          {/* Creator Info */}
          <div className="px-6 pt-16 pb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">@{creator.handle}</h1>
                <p className="text-muted-foreground mb-2">{creator.bio}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{creator.postCount} posts</span>
                  <span>{creator.followerCount} followers</span>
                  <span>{creator.tokens.length} GOON coins</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" className="bg-card border-border" data-testid="button-follow-creator">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Follow
                </Button>
                <Button className="btn-goon" data-testid="button-chat-creator">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat
                </Button>
              </div>
            </div>

            {/* GOON Tokens */}
            {creator.tokens.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">GOON Tokens</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {creator.tokens.map((token) => (
                    <Card key={token.id} className="bg-gradient-to-br from-accent/20 to-accent-2/20 border-accent/30 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
                          <Coins className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{token.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{token.mint_address.slice(0, 4)}...goon</p>
                        </div>
                      </div>
                      <Button size="sm" className="w-full btn-goon" data-testid={`button-trade-${token.symbol}`}>
                        Trade {token.symbol}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content Grid */}
          <CategoryChips categories={['Posts', 'Photos', 'Videos', 'Collections']} />
          <div className="p-4">
            <MasonryGrid>
              {creator.posts.map((post) => (
                <VideoCard
                  key={post.id}
                  id={post.id}
                  thumb={post.thumb_url}
                  title={post.caption}
                  creator={creator.handle}
                  creatorAvatar={creator.avatar_url}
                  views={`${(post.views / 1000).toFixed(1)}K`}
                  likes={`${(post.likes / 1000).toFixed(1)}K`}
                  price={post.price_lamports}
                  isGated={post.price_lamports > 0}
                  isVerified={creator.is_creator}
                />
              ))}
            </MasonryGrid>
          </div>
        </main>
      </div>
    </div>
  );
}
