import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { Play, Eye, Users, Circle, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMutation } from '@tanstack/react-query';
import ReactionButtons from './ReactionButtons';
import type { Post } from '@shared/schema';

interface LiveStreamCardProps {
  id: string;
  title: string;
  streamerName: string;
  streamerAvatar?: string;
  thumbnailUrl: string;
  mediaUrl?: string; // For auto-playing preview
  viewerCount: number;
  isLive: boolean;
  duration?: string; // How long they've been streaming
  category?: string;
  onClick?: () => void;
  post?: Post;
}

export default function LiveStreamCard({
  id,
  title,
  streamerName,
  streamerAvatar,
  thumbnailUrl,
  mediaUrl,
  viewerCount,
  isLive = true,
  duration = "1:23:45",
  category = "Just Chatting",
  onClick,
  post
}: LiveStreamCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(post?.likes || 0);
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Video auto-play manager - global limit of 3 concurrent videos
  const maxConcurrentVideos = 3;
  
  // View mutation for tracking
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

  // IntersectionObserver for viewport detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.3, // Play when 30% visible
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  // Auto-play management with concurrent video limits
  const manageVideoPlayback = useCallback(async () => {
    if (!videoRef.current || !mediaUrl || previewError) return;

    const video = videoRef.current;
    const playingVideos = document.querySelectorAll('video[data-auto-playing="true"]');

    if (isInView && isLive) {
      // Check if we're under the concurrent video limit
      if (playingVideos.length >= maxConcurrentVideos && !isPlaying) {
        // Pause oldest playing video
        const oldestVideo = playingVideos[0] as HTMLVideoElement;
        if (oldestVideo && oldestVideo !== video) {
          oldestVideo.pause();
          oldestVideo.removeAttribute('data-auto-playing');
        }
      }

      try {
        video.setAttribute('data-auto-playing', 'true');
        await video.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Auto-play failed:', error);
        setPreviewError(true);
      }
    } else {
      video.pause();
      video.currentTime = 0;
      video.removeAttribute('data-auto-playing');
      setIsPlaying(false);
    }
  }, [isInView, isLive, mediaUrl, previewError, isPlaying]);

  useEffect(() => {
    manageVideoPlayback();
  }, [manageVideoPlayback]);

  const handleClick = () => {
    viewMutation.mutate();
    onClick?.();
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    setCurrentLikes(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleLikeFromReactions = (postId: string) => {
    setIsLiked(!isLiked);
    setCurrentLikes(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Watch ${streamerName} live on GoonHub!`,
          url: `${window.location.origin}/live/${id}`,
        });
      } catch (error) {
        // User cancelled the share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${window.location.origin}/live/${id}`);
    }
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Link href={`/live/${id}`}>
      <Card 
        ref={cardRef}
        className="group cursor-pointer overflow-hidden bg-card border-border hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 hover:scale-[1.02] animate-pulse-glow"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-testid={`live-stream-card-${id}`}
      >
        <CardContent className="p-0">
          {/* Stream Preview Container */}
          <div className="relative aspect-video overflow-hidden bg-black">
            {/* Auto-playing video preview or thumbnail */}
            {mediaUrl && !previewError ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                poster={thumbnailUrl}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                muted
                loop
                playsInline
                preload="metadata"
                onError={() => setPreviewError(true)}
                data-stream-id={id}
              />
            ) : (
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            )}
            
            {/* Dark overlay for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20" />
            
            {/* LIVE Badge - Bottom Left (matching user example) */}
            {isLive && (
              <div className="absolute bottom-2 left-2">
                <Badge 
                  variant="secondary" 
                  className="bg-green-600 text-white font-bold px-3 py-1 text-sm"
                >
                  LIVE
                </Badge>
              </div>
            )}

            {/* Viewer Count - Top Right */}
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-black/70 text-white">
                <Eye className="h-3 w-3 mr-1" />
                {formatViewerCount(viewerCount)}
              </Badge>
            </div>

            {/* Stream Duration - Top Right, second row */}
            <div className="absolute top-10 right-2">
              <Badge variant="secondary" className="bg-black/70 text-white text-xs">
                {duration}
              </Badge>
            </div>

            {/* Play Button Overlay - Center */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-16 h-16 rounded-full bg-black/70 flex items-center justify-center backdrop-blur-sm">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </div>

            {/* Quick Action Buttons - Bottom Right */}
            <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={handleLike}
                data-testid={`button-like-${id}`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current text-red-500' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={handleShare}
                data-testid={`button-share-${id}`}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

          </div>

          {/* Stream Info */}
          <div className="p-3 space-y-2">
            {/* Streamer Info */}
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage 
                  src={streamerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamerName}`} 
                  alt={streamerName} 
                />
                <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                  {streamerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                {/* Stream Title */}
                <h3 className="text-sm font-medium text-card-foreground line-clamp-2 group-hover:text-accent-foreground transition-colors">
                  {title}
                </h3>
                
                {/* Streamer Name */}
                <p className="text-xs text-muted-foreground mt-1">
                  {streamerName}
                </p>
                
                {/* Category & Stats */}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{category}</span>
                  <span>•</span>
                  <span>{formatViewerCount(viewerCount)} viewers</span>
                </div>
              </div>
            </div>

            {/* Reaction Buttons */}
            <div className="pt-1">
              <ReactionButtons
                postId={id}
                likes={currentLikes}
                isLiked={isLiked}
                onLike={handleLikeFromReactions}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}