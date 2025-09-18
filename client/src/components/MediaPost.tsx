import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Download,
  Coins,
 
  Lock,
  Users,
  Crown
} from 'lucide-react';
import { Link } from 'wouter';
import type { Post, User } from '@shared/schema';

interface MediaPostProps {
  post: Post;
  creator: User;
  onTip?: (postId: string, amount: number) => void;
}

export default function MediaPost({ post, creator, onTip }: MediaPostProps) {
  const { connected, publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [viewCount, setViewCount] = useState(post.views);
  const [isLoading, setIsLoading] = useState(false);

  // Track view when component mounts
  const trackView = async () => {
    try {
      await fetch(`/api/posts/${post.id}/view`, { method: 'POST' });
      setViewCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: publicKey?.toBase58() })
      });
      if (!response.ok) throw new Error('Failed to like/unlike post');
      return response.json();
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    },
    onError: (error) => {
      console.error('Like error:', error);
    }
  });

  const handleLike = () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet to like posts');
      return;
    }
    likeMutation.mutate();
  };

  const handleTip = () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet to tip creators');
      return;
    }
    onTip?.(post.id, 1000); // Default tip amount
  };

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'public':
        return null;
      case 'subscribers':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'goon':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getVisibilityLabel = () => {
    switch (post.visibility) {
      case 'public':
        return 'Public';
      case 'subscribers':
        return 'Subscribers Only';
      case 'goon':
        return 'GOON Holders Only';
      default:
        return 'Public';
    }
  };

  const isMediaVideo = post.media_url?.match(/\.(mp4|webm|ogg|mov|avi)$/i);
  const isMediaImage = post.media_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Link href={`/c/${(creator as any).goon_username || creator.handle}`}>
            <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all">
              <AvatarImage src={creator.avatar_url} alt={(creator as any).goon_username || creator.handle} />
              <AvatarFallback>
                {((creator as any).goon_username || creator.handle)?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/c/${(creator as any).goon_username || creator.handle}`}>
                <h3 className="font-medium hover:text-accent transition-colors cursor-pointer">
                  @{(creator as any).goon_username || creator.handle}
                </h3>
              </Link>
              {creator.is_creator && (
                <Badge variant="secondary" className="text-xs">
                  Creator
                </Badge>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                {getVisibilityIcon()}
                <span className="text-xs">{getVisibilityLabel()}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Media Content */}
        <div className="relative">
          {isMediaVideo ? (
            <video
              className="w-full h-auto max-h-96 object-cover"
              controls
              poster={post.thumb_url}
              onLoadStart={trackView}
            >
              <source src={post.media_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : isMediaImage ? (
            <img
              src={post.media_url}
              alt={post.caption}
              className="w-full h-auto max-h-96 object-cover cursor-pointer"
              onClick={trackView}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Unsupported media type</p>
            </div>
          )}

          {/* Price Overlay */}
          {post.price_lamports > 0 && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-accent text-accent-foreground">
                <Lock className="h-3 w-3 mr-1" />
                {post.price_lamports / 1000000} SOL
              </Badge>
            </div>
          )}
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="p-4">
            <p className="text-sm">{post.caption}</p>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats and Actions */}
        <div className="px-4 pb-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{likeCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={`flex-1 ${isLiked ? 'text-red-500' : ''}`}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Liked' : 'Like'}
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleTip}
              className="flex-1 hover:text-accent"
            >
              <Coins className="h-4 w-4 mr-2" />
              Tip
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1"
              onClick={() => {
                const link = document.createElement('a');
                link.href = post.media_url;
                link.download = `media-${post.id}`;
                link.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

