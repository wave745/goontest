import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import { CategoryChips } from '@/components/CategoryChips';
import VideoCard from '@/components/VideoCard';
import PhotoCard from '@/components/PhotoCard';
import MasonryGrid from '@/components/MasonryGrid';
import TipModal from '@/components/modals/TipModal';
import PaywallModal from '@/components/modals/PaywallModal';
import StudioModal from '@/components/modals/StudioModal';
import { Button } from '@/components/ui/button';
import { MessageCircle, Plus, Coins, Upload } from 'lucide-react';
import type { Post } from '@shared/schema';

type User = {
  id: string;
  handle: string;
  avatar_url?: string;
  is_creator: boolean;
};

type PostWithCreator = Post & { creator: User };

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPost, setSelectedPost] = useState<PostWithCreator | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<User | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);

  // Fetch regular posts with proper URL construction
  const getPostsUrl = () => {
    switch (selectedCategory) {
      case 'Videos':
        return '/api/posts?type=video';
      case 'Photos':
        return '/api/posts?type=photo';
      case 'All':
      default:
        return '/api/posts';
    }
  };

  const { data: posts, isLoading } = useQuery<PostWithCreator[]>({
    queryKey: ['/api/posts', selectedCategory],
    queryFn: async () => {
      const response = await fetch(getPostsUrl());
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    }
  });

  const filteredPosts = posts || [];

  const handleCardClick = (post: PostWithCreator) => {
    if (post.price_lamports > 0) {
      setSelectedPost(post);
      setShowPaywallModal(true);
    } else {
      // Navigate to post detail or play content
      window.location.href = `/p/${post.id}`;
    }
  };

  const handleTipCreator = (creator: User) => {
    setSelectedCreator(creator);
    setShowTipModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <CategoryChips onCategoryChange={setSelectedCategory} />
        <div className="p-4">
          <MasonryGrid>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="masonry-item">
                <div className="rounded-xl overflow-hidden bg-card border-border">
                  <div className="aspect-[4/5] loading-skeleton"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 loading-skeleton rounded"></div>
                    <div className="h-3 loading-skeleton rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </MasonryGrid>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CategoryChips onCategoryChange={setSelectedCategory} />
      <div className="p-2 md:p-4 pb-20 md:pb-4">
        <MasonryGrid>
          {/* Render Posts */}
          {filteredPosts?.map((post) => {
            // Check if post is a video or photo based on media_url
            const isVideo = post.media_url?.match(/\.(mp4|webm|ogg|mov)$/i);
            
            if (isVideo) {
              return (
                <VideoCard
                  key={post.id}
                  id={post.id}
                  thumb={post.thumb_url}
                  duration="12:34"
                  title={post.caption}
                  creator={post.creator}
                  views={post.views || 0}
                  likes={post.likes || 0}
                  price={post.price_lamports}
                  isGated={post.price_lamports > 0}
                  isVerified={post.creator.is_creator}
                  onClick={() => handleCardClick(post)}
                />
              );
            } else {
              return (
                <PhotoCard
                  key={post.id}
                  id={post.id}
                  imageUrl={post.media_url}
                  title={post.caption}
                  creator={post.creator}
                  views={post.views || 0}
                  likes={post.likes || 0}
                  price={post.price_lamports}
                  isGated={post.price_lamports > 0}
                  isVerified={post.creator.is_creator}
                  onClick={() => handleCardClick(post)}
                />
              );
            }
          })}
        </MasonryGrid>

        {/* Load More */}
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            className="bg-card border-border text-card-foreground hover:bg-accent/10"
            data-testid="button-load-more"
          >
            Load More Content
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Modals */}
      {selectedCreator && (
        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
        />
      )}
      
      {selectedPost && (
        <PaywallModal
          isOpen={showPaywallModal}
          onClose={() => setShowPaywallModal(false)}
          post={selectedPost}
          onUnlock={() => setShowPaywallModal(false)}
        />
      )}
      
      <StudioModal
        isOpen={showStudioModal}
        onClose={() => setShowStudioModal(false)}
      />
    </div>
  );
}
