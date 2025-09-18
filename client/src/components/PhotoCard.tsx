import { useState } from 'react';
import { Download, Check, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import ReactionButtons from './ReactionButtons';
import ContentModal from './modals/ContentModal';

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
  solanaAddress?: string;
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
  solanaAddress,
  onClick
}: PhotoCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    // Anonymous likes - no user tracking
    setIsLiked(!isLiked);
    setCurrentLikes(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleTip = async (postId: string, amount: number) => {
    // Tip handling is now done through ReactionButtons component with real wallet transactions
    console.log('Tip request handled by ReactionButtons:', { postId, amount });
  };

  const handleView = () => {
    viewMutation.mutate();
    setIsModalOpen(true);
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
    <>
      <Card 
        className="group cursor-pointer overflow-hidden bg-card border-border hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 hover:scale-[1.02] animate-pulse-glow"
        onClick={handleView}
        data-testid={`photo-card-${id}`}
      >
      <CardContent className="p-0">
        {/* Image Container */}
        <div className="relative aspect-video overflow-hidden">
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
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = imageUrl;
                  link.download = `photo-${id}`;
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
            <Link href={`/c/${(creator as any).goon_username || creator.handle || 'unknown'}`}>
              <Avatar className="h-6 w-6 cursor-pointer">
                <AvatarImage src={creator.avatar_url} />
                <AvatarFallback className="text-xs">
                  {((creator as any).goon_username || creator.handle)?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Link href={`/c/${(creator as any).goon_username || creator.handle || 'unknown'}`} className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground truncate hover:text-accent">
                  @{(creator as any).goon_username || creator.handle || 'unknown'}
                </span>
                {isVerified && (
                  <Check className="h-3 w-3 text-accent" />
                )}
              </div>
            </Link>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {title}
          </h3>


          {/* Reaction Buttons */}
          <div className="flex items-center justify-end">
            <ReactionButtons
              postId={id}
              likes={currentLikes}
              isLiked={isLiked}
              solanaAddress={solanaAddress}
              creatorId={creator.id}
              onLike={handleLike}
              onTip={handleTip}
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <ContentModal
      postId={id}
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
    />
    </>
  );
}
