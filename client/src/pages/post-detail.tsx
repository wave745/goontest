import { useParams } from 'wouter';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Heart, Share, Flag, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Post, User } from '@shared/schema';

type PostWithCreator = Post & { creator: User };

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const [isUnlocked, setIsUnlocked] = useState(false);

  const { data: post, isLoading } = useQuery<PostWithCreator>({
    queryKey: ['/api/posts', id],
  });

  const handleUnlock = async () => {
    if (!connected || !publicKey || !post) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/posts/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          userPubkey: publicKey.toBase58(),
        }),
      });

      if (!response.ok) throw new Error('Failed to unlock');

      setIsUnlocked(true);
      toast({
        title: "Content Unlocked!",
        description: "You now have access to this content",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlock content",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="loading-skeleton aspect-video rounded-xl mb-4"></div>
              <div className="loading-skeleton h-12 rounded-xl"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
              <p className="text-muted-foreground">The content you're looking for doesn't exist.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const canView = post.price_lamports === 0 || isUnlocked;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                {canView ? (
                  <div className="aspect-video">
                    {post.media_url.includes('.mp4') || post.media_url.includes('.webm') ? (
                      <video 
                        src={post.media_url} 
                        controls 
                        className="w-full h-full rounded-t-xl"
                        data-testid="video-player"
                      />
                    ) : (
                      <img 
                        src={post.media_url} 
                        alt={post.caption} 
                        className="w-full h-full object-cover rounded-t-xl"
                        data-testid="image-content"
                      />
                    )}
                  </div>
                ) : (
                  <div className="relative aspect-video bg-panel rounded-t-xl">
                    <img 
                      src={post.thumb_url} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover filter blur-sm" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="bg-black/80 rounded-full p-6 mb-4">
                          <Lock className="text-accent h-8 w-8" />
                        </div>
                        <Button 
                          onClick={handleUnlock}
                          className="btn-goon"
                          data-testid="button-unlock-post"
                        >
                          Unlock for {(post.price_lamports / 1e9).toFixed(3)} SOL
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post Info */}
            <Card className="bg-card border-border mt-4">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.creator.handle}`}
                      alt={post.creator.handle}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <CardTitle className="text-foreground">{post.caption}</CardTitle>
                      <p className="text-muted-foreground">@{post.creator.handle}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="bg-card border-border">
                      <Heart className="mr-2 h-4 w-4" />
                      {post.likes}
                    </Button>
                    <Button size="sm" variant="outline" className="bg-card border-border">
                      <Share className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    <Button size="sm" variant="outline" className="bg-card border-border">
                      <Flag className="mr-2 h-4 w-4" />
                      Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{post.views.toLocaleString()} views</span>
                  <span>•</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  {post.tags && (
                    <>
                      <span>•</span>
                      <div className="flex gap-1">
                        {post.tags.map((tag) => (
                          <span key={tag} className="bg-accent/20 text-accent px-2 py-1 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
