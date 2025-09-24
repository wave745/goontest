import { useState } from 'react';
import { Download, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        className="group cursor-pointer overflow-hidden bg-transparent border-0 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 hover:scale-[1.02] animate-pulse-glow"
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
          
          {/* Subtle View Indicator - No Dark Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <span className="text-black text-xs font-medium">View</span>
            </div>
          </div>
          
          {/* Price Badge */}
          {isGated && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-transparent text-accent-foreground border-0">
                <Coins className="h-3 w-3 mr-1" />
                {formatPrice(price)}
              </Badge>
            </div>
          )}

        </div>

        {/* Content */}
        <div className="p-3 space-y-2 bg-transparent">
          {/* Creator Info */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {creator.handle ? creator.handle.slice(0, 1).toUpperCase() : 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-muted-foreground">
                {creator.handle || "Anonymous Creator"}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {title}
          </h3>


          {/* View Stats Only - Interactive elements moved to modal */}
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs">{formatNumber(views)} views</span>
            <span className="text-xs">{formatNumber(currentLikes)} likes</span>
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
