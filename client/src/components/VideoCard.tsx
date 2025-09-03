import { useState } from 'react';
import { Lock, Play, Expand, Heart, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface VideoCardProps {
  id: string;
  thumb: string;
  duration?: string;
  title: string;
  creator: string;
  creatorAvatar?: string;
  views: string;
  likes: string;
  price?: number;
  isGated?: boolean;
  isVerified?: boolean;
  isLive?: boolean;
  type?: 'video' | 'photo' | 'collection' | 'coin' | 'live';
  mintEndsGoon?: boolean;
  onClick?: () => void;
}

export default function VideoCard({ 
  id,
  thumb, 
  duration, 
  title, 
  creator, 
  creatorAvatar,
  views, 
  likes,
  price = 0,
  isGated = false, 
  isVerified = false,
  isLive = false,
  type = 'video',
  mintEndsGoon = false,
  onClick 
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const aspectRatio = type === 'video' && !isLive ? 'aspect-video' : 
                     type === 'collection' ? 'aspect-square' : 
                     'aspect-[4/5]';

  return (
    <div 
      className="masonry-item hover-scale cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      data-testid={`card-content-${id}`}
    >
      <Card className="rounded-xl overflow-hidden bg-card border-border">
        <div className={`relative ${aspectRatio}`}>
          <img 
            src={thumb} 
            alt={title} 
            className="w-full h-full object-cover" 
          />
          
          <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors ${isGated ? 'bg-black/40' : ''}`}>
            {/* Top badges */}
            <div className="absolute top-2 right-2 flex gap-1">
              {type === 'video' && (
                <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">HD</span>
              )}
              {type === 'photo' && (
                <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">PHOTO</span>
              )}
              {type === 'collection' && (
                <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">COLLECTION</span>
              )}
              {mintEndsGoon && (
                <span className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded font-mono">…goon</span>
              )}
              {isLive && (
                <div className="flex items-center gap-1 bg-danger text-white text-xs px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              )}
            </div>

            {/* Duration or viewer count */}
            {duration && !isLive && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                {duration}
              </div>
            )}
            {isLive && (
              <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                1.2K watching
              </div>
            )}

            {/* Play/expand overlay */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              {isGated ? (
                <div className="text-center">
                  <div className="bg-black/80 rounded-full p-4 mb-2">
                    <Lock className="text-accent h-6 w-6" />
                  </div>
                  <p className="text-white text-sm font-medium">
                    Unlock for {(price / 1e9).toFixed(3)} SOL
                  </p>
                </div>
              ) : (
                <div className="bg-black/80 rounded-full p-3">
                  {type === 'photo' ? (
                    <Expand className="text-accent h-5 w-5" />
                  ) : (
                    <Play className="text-accent h-5 w-5" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-3">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2">
            {title}
          </h3>
          
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={creatorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator}`} 
              alt={creator} 
              className="w-6 h-6 rounded-full" 
            />
            <span className="text-xs text-muted-foreground">@{creator}</span>
            {isVerified && (
              <div className="w-3 h-3 bg-accent rounded-full flex items-center justify-center">
                <span className="text-accent-foreground text-[8px]">✓</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{views}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>{likes}</span>
              </div>
            </div>
            
            {price > 0 ? (
              <div className="flex items-center gap-1 text-accent font-medium">
                <Coins className="h-3 w-3" />
                <span>{(price / 1e9).toFixed(3)} SOL</span>
              </div>
            ) : (
              <span className="text-success font-medium">FREE</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
