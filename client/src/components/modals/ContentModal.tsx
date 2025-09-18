import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Heart,
  Download,
  Share,
  Flag,
  Lock,
  Coins,
  Check,
  Play,
  X,
} from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import ReactionButtons from '@/components/ReactionButtons';
import type { Post, User } from '@shared/schema';

type PostWithCreator = Post & { creator: User };

interface ContentModalProps {
  postId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContentModal({ postId, isOpen, onClose }: ContentModalProps) {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(0);

  // Fetch post data
  const { data: post, isLoading } = useQuery<PostWithCreator>({
    queryKey: [`/api/posts/${postId}`],
    enabled: !!postId && isOpen,
  });

  // Track view mutation
  const viewMutation = useMutation({
    mutationFn: async () => {
      if (!postId) return;
      const response = await fetch(`/api/posts/${postId}/view`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to record view');
      return response.json();
    },
    onError: (error: any) => {
      console.error('View tracking error:', error);
    },
  });

  // Unlock content mutation
  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (!connected || !publicKey || !post) {
        throw new Error('Please connect your wallet first');
      }

      const response = await fetch('/api/posts/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          userPubkey: publicKey.toBase58(),
        }),
      });

      if (!response.ok) throw new Error('Failed to unlock');
      return response.json();
    },
    onSuccess: () => {
      setIsUnlocked(true);
      toast({
        title: 'Content Unlocked!',
        description: 'You now have access to this content',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlock content',
        variant: 'destructive',
      });
    },
  });

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!connected || !publicKey || !postId) {
        throw new Error('Please connect your wallet first');
      }

      const response = await fetch(`/api/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: publicKey.toBase58() })
      });
      
      if (!response.ok) throw new Error('Failed to like/unlike post');
      return response.json();
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      setCurrentLikes(prev => isLiked ? prev - 1 : prev + 1);
    },
    onError: (error: any) => {
      console.error('Like error:', error);
      toast({
        title: 'Error',
        description: 'Failed to like post',
        variant: 'destructive',
      });
    }
  });

  // Initialize likes when post data loads
  useEffect(() => {
    if (post) {
      setCurrentLikes(post.likes);
    }
  }, [post]);

  // Track view when modal opens and post is loaded
  useEffect(() => {
    if (post && isOpen) {
      viewMutation.mutate();
    }
  }, [post, isOpen, viewMutation]);

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleTip = async (postId: string, amount: number) => {
    console.log('Tip request handled by ReactionButtons:', { postId, amount });
  };

  const handleUnlock = () => {
    unlockMutation.mutate();
  };

  const handleDownload = () => {
    if (!post?.media_url) return;
    
    const link = document.createElement('a');
    link.href = post.media_url;
    link.download = `content-${post.id}`;
    link.click();
  };

  const handleShare = () => {
    if (!post) return;
    
    const url = `${window.location.origin}/p/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Link Copied!',
        description: 'Post link has been copied to clipboard',
      });
    });
  };

  const formatPrice = (lamports: number) => {
    if (lamports === 0) return 'Free';
    return `${(lamports / 1000000).toFixed(2)} GOON`;
  };

  const canView = !post || post.price_lamports === 0 || isUnlocked;
  const isVideo = post?.media_url?.match(/\.(mp4|webm|ogg|mov|avi)$/i);
  const isImage = post?.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  if (!postId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-4xl w-full h-[90vh] p-0 overflow-hidden"
        data-testid="content-modal"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-black/50 text-white p-2"
          data-testid="button-close-modal"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : !post ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Post not found</h2>
              <p className="text-muted-foreground">The content you're looking for doesn't exist.</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Media Section */}
            <div className="flex-1 bg-black flex items-center justify-center relative">
              {canView ? (
                <div className="w-full h-full flex items-center justify-center">
                  {isVideo ? (
                    <video
                      src={post.media_url}
                      controls
                      className="max-w-full max-h-full object-contain"
                      data-testid="video-player"
                      autoPlay
                    />
                  ) : isImage ? (
                    <img
                      src={post.media_url}
                      alt={post.caption}
                      className="max-w-full max-h-full object-contain"
                      data-testid="image-content"
                    />
                  ) : (
                    <div className="text-white text-center">
                      <p>Unsupported media type</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={post.thumb_url}
                    alt="Thumbnail"
                    className="w-full h-full object-cover filter blur-sm opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="bg-black/80 rounded-full p-6 mb-4 mx-auto w-fit">
                        <Lock className="text-accent h-8 w-8" />
                      </div>
                      <Button
                        onClick={handleUnlock}
                        disabled={unlockMutation.isPending}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        data-testid="button-unlock-content"
                      >
                        <Coins className="h-4 w-4 mr-2" />
                        {unlockMutation.isPending ? 'Unlocking...' : `Unlock for ${formatPrice(post.price_lamports)}`}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Media overlay indicators */}
              {isVideo && canView && (
                <div className="absolute bottom-4 left-4">
                  <Badge variant="secondary" className="bg-black/70 text-white">
                    <Play className="h-3 w-3 mr-1" />
                    Video
                  </Badge>
                </div>
              )}
              {post.price_lamports > 0 && (
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary" className="bg-accent/90 text-accent-foreground">
                    <Coins className="h-3 w-3 mr-1" />
                    {formatPrice(post.price_lamports)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="w-80 bg-card border-l border-border flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Creator Info */}
                  <div className="flex items-center gap-3">
                    <Link href={`/c/${(post.creator as any)?.goon_username || post.creator?.handle || 'unknown'}`}>
                      <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all">
                        <AvatarImage src={post.creator?.avatar_url} />
                        <AvatarFallback>
                          {((post.creator as any)?.goon_username || post.creator?.handle)?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/c/${(post.creator as any)?.goon_username || post.creator?.handle || 'unknown'}`}>
                          <h3 className="font-medium hover:text-accent transition-colors cursor-pointer truncate">
                            @{(post.creator as any)?.goon_username || post.creator?.handle || 'unknown'}
                          </h3>
                        </Link>
                        {post.creator?.is_creator && (
                          <Check className="h-4 w-4 text-accent" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Caption */}
                  {post.caption && (
                    <div>
                      <h4 className="font-medium mb-2">Caption</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {post.caption}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div>
                    <h4 className="font-medium mb-2">Stats</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        <span>{currentLikes.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{post.views.toLocaleString()} views</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="p-4 border-t border-border space-y-3">
                {/* Reaction Buttons */}
                <div className="flex justify-center">
                  <ReactionButtons
                    postId={post.id}
                    likes={currentLikes}
                    isLiked={isLiked}
                    solanaAddress={post.solana_address}
                    creatorId={post.creator_id}
                    onLike={handleLike}
                    onTip={handleTip}
                  />
                </div>

                {/* Action Buttons Row */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="flex-1"
                    data-testid="button-download"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="flex-1"
                    data-testid="button-share"
                  >
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid="button-report"
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}