import { useState } from 'react';
import { Download, MoreVertical, Check, Play, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import ReactionButtons from './ReactionButtons';
import { getCurrentUser } from '@/lib/userManager';

interface VideoCardProps {
  id: string;
  thumb: string;
  duration: string;
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
  solanaAddress?: string;
  onClick?: () => void;
}

export default function VideoCard({
  id,
  thumb,
  duration,
  title,
  creator,
  views,
  likes,
  price,
  isGated,
  isVerified,
  tags,
  solanaAddress,
  onClick
}: VideoCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [currentUser] = useState(getCurrentUser());

  // View mutation
  const viewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${id}/view`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to record view');
      return response.json();
    },
    onError: (error: any) => {
      console.error('View tracking error:', error);
    },
  });

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      
      if (response.ok) {
        setIsLiked(!isLiked);
        setCurrentLikes(prev => isLiked ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleTip = async (postId: string, amount: number) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/tips/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user: currentUser.id,
          to_user: creator.id,
          amount_lamports: Math.round(amount * 1e9), // Convert SOL to lamports
          message: `Tip for ${title}`,
          txn_sig: `tip_${Date.now()}`,
        }),
      });
      
      if (response.ok) {
        console.log('Tip sent successfully');
      }
    } catch (error) {
      console.error('Failed to send tip:', error);
    }
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
        {/* Video Thumbnail Container */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={thumb}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="h-6 w-6 text-black ml-1" />
              </div>
            </div>
          </div>
          
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="bg-black/70 text-white text-xs">
              {duration}
            </Badge>
          </div>

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
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = thumb;
                  link.download = `video-${id}`;
                  link.click();
                }}
              >
                <Download className="h-4 w-4" />
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

          {/* Reaction Buttons */}
          <div className="flex items-center justify-end">
            <ReactionButtons
              postId={id}
              likes={currentLikes}
              isLiked={isLiked}
              solanaAddress={solanaAddress}
              onLike={handleLike}
              onTip={handleTip}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}