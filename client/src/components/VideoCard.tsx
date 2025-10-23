import { useState } from "react";
import { Download, Play, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import ReactionButtons from "./ReactionButtons";
import ContentModal from "./modals/ContentModal";

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
  solanaAddress,
  onClick,
}: VideoCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const viewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${id}/view`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to record view");
      return response.json();
    },
    onError: (error: any) => {
      console.error("View tracking error:", error);
    },
  });

  const handleLike = async (postId: string) => {
    setIsLiked(!isLiked);
    setCurrentLikes((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleTip = async (postId: string, amount: number) => {
    console.log("Tip request handled by ReactionButtons:", { postId, amount });
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
    if (lamports === 0) return "Free";
    return `${(lamports / 1000000).toFixed(2)} GOON`;
  };

  return (
    <>
      <Card
        className="group cursor-pointer overflow-hidden bg-transparent border-0 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 hover:scale-[1.02] animate-pulse-glow"
        onClick={handleView}
        data-testid={`video-card-${id}`}
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
            {/* Subtle Play Button Overlay - No Dark Background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Play className="h-6 w-6 text-black ml-1" />
                </div>
              </div>
            </div>
            {/* Duration Badge */}
            <div className="absolute bottom-2 right-2">
              <Badge
                variant="secondary"
                className="bg-transparent backdrop-blur-sm text-white text-xs border-0"
              >
                {duration}
              </Badge>
            </div>
            {/* Price Badge */}
            {isGated && (
              <div className="absolute top-2 right-2">
                <Badge
                  variant="secondary"
                  className="bg-transparent text-accent-foreground border-0"
                >
                  <Coins className="h-3 w-3 mr-1" />
                  {formatPrice(price)}
                </Badge>
              </div>
            )}
          </div>
          {/* Content */}
          <div className="p-1.5 bg-transparent">
            {/* Compact Info */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-foreground line-clamp-1 flex-1 mr-2">
                {title}
              </h3>
              <div className="flex gap-2 text-xs text-muted-foreground shrink-0">
                <span>{formatNumber(views)}v</span>
                <span>{formatNumber(currentLikes)}♥</span>
              </div>
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
