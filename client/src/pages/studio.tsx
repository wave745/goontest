import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudioModal from '@/components/modals/StudioModal';
import { Upload, Coins, BarChart3, Settings } from 'lucide-react';
import type { Post, Token } from '@shared/schema';

export default function Studio() {
  const { connected, publicKey } = useWallet();
  const [showStudioModal, setShowStudioModal] = useState(false);

  const { data: myPosts } = useQuery<Post[]>({
    queryKey: ['/api/posts/my'],
    enabled: connected,
  });

  const { data: myTokens } = useQuery<Token[]>({
    queryKey: ['/api/tokens/my'],
    enabled: connected,
  });

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground mb-4">Creator Studio</h1>
              <p className="text-muted-foreground mb-6">Connect your wallet to access creator tools</p>
              <Button className="btn-goon">Connect Wallet</Button>
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
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground">Creator Studio</h1>
              <Button 
                onClick={() => setShowStudioModal(true)}
                className="btn-goon"
                data-testid="button-new-content"
              >
                <Upload className="mr-2 h-4 w-4" />
                New Content
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{myPosts?.length || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">GOON Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{myTokens?.length || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {myPosts?.reduce((total, post) => total + post.views, 0).toLocaleString() || '0'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/10">
                <TabsTrigger value="posts">My Posts</TabsTrigger>
                <TabsTrigger value="tokens">GOON Tokens</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myPosts?.map((post) => (
                    <Card key={post.id} className="bg-card border-border">
                      <div className="aspect-video relative">
                        <img 
                          src={post.thumb_url} 
                          alt={post.caption} 
                          className="w-full h-full object-cover rounded-t-lg" 
                        />
                        {post.price_lamports > 0 && (
                          <div className="absolute top-2 right-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded">
                            {(post.price_lamports / 1e9).toFixed(3)} SOL
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-foreground mb-2 line-clamp-2">{post.caption}</h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{post.views} views</span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="tokens" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myTokens?.map((token) => (
                    <Card key={token.id} className="bg-gradient-to-br from-accent/20 to-accent-2/20 border-accent/30">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
                            <Coins className="h-6 w-6 text-accent-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-foreground">{token.name}</CardTitle>
                            <p className="text-xs text-muted-foreground font-mono">{token.mint_address}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Supply</span>
                            <span className="text-foreground">{token.supply.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Symbol</span>
                            <span className="text-foreground">{token.symbol}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Analytics Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Analytics features coming soon. Track your content performance, earnings, and audience engagement.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <StudioModal
        isOpen={showStudioModal}
        onClose={() => setShowStudioModal(false)}
      />
    </div>
  );
}
