import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReactionButtonsProps {
  postId: string;
  likes: number;
  isLiked?: boolean;
  onLike?: (postId: string) => void;
}

export default function ReactionButtons({ 
  postId, 
  likes, 
  isLiked = false, 
  onLike
}: ReactionButtonsProps) {
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      // Anonymous likes - no user tracking or API calls
      
      if (onLike) {
        onLike(postId);
      }
    } catch (error) {
      console.error('Failed to like post:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to like post",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };


  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={isLiking}
          className="flex items-center gap-1 text-muted-foreground hover:text-red-500"
        >
          {isLiking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          )}
          <span className="text-xs">{likes}</span>
        </Button>


      </div>

    </>
  );
}
