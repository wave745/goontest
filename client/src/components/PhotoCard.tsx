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
        <div className="relative h-[600px] overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          
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
