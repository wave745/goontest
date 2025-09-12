import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { CategoryChips } from '@/components/CategoryChips';
import VideoCard from '@/components/VideoCard';
import MasonryGrid from '@/components/MasonryGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserPlus, 
  MessageCircle, 
  Coins, 
  Bot, 
  Sparkles, 
  Zap, 
  Heart, 
  Star,
  Crown,
  Gem,
  Settings,
  Wand2
} from 'lucide-react';
import { Link } from 'wouter';
import type { User, Post, Token, AiPersona } from '@shared/schema';

type CreatorWithStats = User & {
  posts: Post[];
  tokens: Token[];
  followerCount: number;
  postCount: number;
};

export default function AIProfile() {
  const { handle } = useParams<{ handle: string }>();
  const { connected } = useWallet();
  
  const { data: creator, isLoading: creatorLoading } = useQuery<CreatorWithStats>({
    queryKey: ['/api/creators', handle],
    queryFn: async () => {
      const response = await fetch(`/api/creators/${handle}`);
      if (!response.ok) {
        throw new Error('Creator not found');
      }
      return response.json();
    },
    enabled: !!handle,
  });

  const { data: persona, isLoading: personaLoading } = useQuery<AiPersona>({
    queryKey: ['/api/personas', handle],
    queryFn: async () => {
      const response = await fetch(`/api/personas/${handle}`);
      if (!response.ok) {
        throw new Error('Persona not found');
      }
      return response.json();
    },
    enabled: !!creator,
  });

  const isLoading = creatorLoading || personaLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
              <h1 className="text-2xl font-bold text-foreground">AI Creator not found</h1>
              <p className="text-muted-foreground">The AI creator you're looking for doesn't exist.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getPersonalityIcon = (handle: string) => {
    switch (handle) {
      case 'amy_ai':
        return <Heart className="h-6 w-6 text-pink-500" />;
      case 'mia_ai':
        return <Gem className="h-6 w-6 text-purple-500" />;
      case 'una_ai':
        return <Zap className="h-6 w-6 text-orange-500" />;
      default:
        return <Bot className="h-6 w-6 text-blue-500" />;
    }
  };

  const getPersonalityColor = (handle: string) => {
    switch (handle) {
      case 'amy_ai':
        return 'from-pink-500/20 to-rose-500/20 border-pink-500/30';
      case 'mia_ai':
        return 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
      case 'una_ai':
        return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
      default:
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          {/* AI Creator Banner */}
          <div className="relative h-48 bg-gradient-to-r from-accent/20 to-accent-2/20">
            {creator.banner_url && (
              <img 
                src={creator.banner_url} 
                alt={`${creator.handle} banner`} 
                className="w-full h-full object-cover" 
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            
            {/* AI Badge */}
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-accent to-accent-2 text-accent-foreground border-0">
                <Bot className="h-3 w-3 mr-1" />
                AI Companion
              </Badge>
            </div>
            
            {/* Profile Picture */}
            <div className="absolute -bottom-12 left-6">
              <div className="relative">
                <img
                  src={creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.handle}`}
                  alt={creator.handle}
                  className="w-24 h-24 rounded-full border-4 border-background"
                />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-accent to-accent-2 flex items-center justify-center border-2 border-background">
                  {getPersonalityIcon(creator.handle)}
                </div>
              </div>
            </div>
          </div>

          {/* AI Creator Info */}
          <div className="px-6 pt-16 pb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">@{creator.handle}</h1>
                  <Badge variant="secondary" className="bg-gradient-to-r from-accent/20 to-accent-2/20 text-accent">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Creator
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-2">{creator.bio}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{creator.postCount} posts</span>
                  <span>{creator.followerCount} followers</span>
                  <span>{creator.tokens.length} GOON coins</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" className="bg-card border-border">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Follow
                </Button>
                <Link href="/chat">
                  <Button className="bg-gradient-to-r from-accent to-accent-2 hover:from-accent/90 hover:to-accent-2/90">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat Now
                  </Button>
                </Link>
              </div>
            </div>

            {/* AI Persona Info */}
            {persona && (
              <Card className={`mb-6 bg-gradient-to-br ${getPersonalityColor(creator.handle)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    AI Personality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Price per message:</span>
                        <Badge variant="outline" className="bg-background/50">
                          {(persona.price_per_message / 1000000000).toFixed(3)} SOL
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={persona.is_active ? "default" : "secondary"}>
                          {persona.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {persona.system_prompt}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                      <Button size="sm" className="w-full bg-gradient-to-r from-accent to-accent-2 hover:from-accent/90 hover:to-accent-2/90">
                        Trade {token.symbol}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* AI Features */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/20">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-accent" />
                    <h3 className="font-semibold mb-1">Interactive Chat</h3>
                    <p className="text-sm text-muted-foreground">Engage in real-time conversations</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/20">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-accent" />
                    <h3 className="font-semibold mb-1">Unique Personality</h3>
                    <p className="text-sm text-muted-foreground">Each AI has its own character</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/20">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-accent" />
                    <h3 className="font-semibold mb-1">Premium Experience</h3>
                    <p className="text-sm text-muted-foreground">High-quality AI interactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
