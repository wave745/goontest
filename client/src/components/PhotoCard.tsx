import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { Heart, Eye, MessageCircle, Share2, MoreVertical, Coins, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface PhotoCardProps {
  id: string;
  imageUrl: string;
  title: string;
  creator: {
    id: string;
    handle: string;
    avatar_url?: string;
    is_creator: boolean;
  };
  views: number;
  likes: number;
  price: number;
  isGated: boolean;
  isVerified: boolean;
  tags: string[];
  onClick?: () => void;
}

export default function PhotoCard({
  id,
  imageUrl,
  title,
  creator,
  views,
  likes,
  price,
  isGated,
  isVerified,
  tags,
  onClick
}: PhotoCardProps) {
  const { connected, publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);

  // Check if user has liked this post
  const { data: likeStatus } = useQuery({
    queryKey: ['/api/posts', id, 'like'],
    queryFn: async () => {
      if (!connected || !publicKey) return false;
      const response = await fetch(`/api/posts/${id}/like?userId=${publicKey.toBase58()}`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.isLiked || false;
    },
    enabled: connected && !!publicKey,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!connected || !publicKey) throw new Error('Please connect your wallet');
      const response = await fetch(`/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: publicKey.toBase58() }),
      });
      if (!response.ok) throw new Error('Failed to like post');
      return response.json();
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: isLiked ? "Post unliked" : "Post liked!",
        description: isLiked ? "You unliked this post" : "You liked this post",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // View mutation
  const viewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${id}/view`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to record view');
      return response.json();
    },
    onError: (error) => {
      console.error('View tracking error:', error);
    },
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    likeMutation.mutate();
  };

  const handleView = () => {
    viewMutation.mutate();
    onClick?.();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPrice = (lamports: number) => {
    if (lamports === 0) return 'Free';
    return `${(lamports / 1000000).toFixed(2)} GOON`;
  };

  return (
    <Card 
      className="group cursor-pointer overflow-hidden bg-card border-border hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
      onClick={handleView}
    >
      <CardContent className="p-0">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          
          {/* Price Badge */}
          {isGated && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-accent/90 text-accent-foreground">
                <Coins className="h-3 w-3 mr-1" />
                {formatPrice(price)}
              </Badge>
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={handleLike}
                disabled={likeMutation.isPending}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Creator Info */}
          <div className="flex items-center gap-2">
            <Link href={`/c/${creator.handle || 'unknown'}`}>
              <Avatar className="h-6 w-6 cursor-pointer">
                <AvatarImage src={creator.avatar_url} />
                <AvatarFallback className="text-xs">
                  {creator.handle?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Link href={`/c/${creator.handle || 'unknown'}`} className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground truncate hover:text-accent">
                  @{creator.handle || 'unknown'}
                </span>
                {isVerified && (
                  <Check className="h-3 w-3 text-accent" />
                )}
              </div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Report</DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuItem>Save</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {title}
          </h3>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatNumber(views)}
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {formatNumber(likes)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>0</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
