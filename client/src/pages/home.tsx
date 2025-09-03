import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { CategoryChips } from '@/components/CategoryChips';
import VideoCard from '@/components/VideoCard';
import MasonryGrid from '@/components/MasonryGrid';
import TipModal from '@/components/modals/TipModal';
import PaywallModal from '@/components/modals/PaywallModal';
import StudioModal from '@/components/modals/StudioModal';
import WalletModal from '@/components/modals/WalletModal';
import { Button } from '@/components/ui/button';
import { MessageCircle, Plus, Coins } from 'lucide-react';
import type { Post, User } from '@shared/schema';

type PostWithCreator = Post & { creator: User };

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPost, setSelectedPost] = useState<PostWithCreator | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<User | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const { data: posts, isLoading } = useQuery<PostWithCreator[]>({
    queryKey: ['/api/posts', selectedCategory],
  });

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
        <div className="flex">
          <Sidebar />
          <main className="flex-1">
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
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <CategoryChips onCategoryChange={setSelectedCategory} />
          <div className="p-2 md:p-4 pb-20 md:pb-4">
            <MasonryGrid>
              {posts?.map((post) => (
                <VideoCard
                  key={post.id}
                  id={post.id}
                  thumb={post.thumb_url}
                  duration="12:34"
                  title={post.caption}
                  creator={post.creator.handle}
                  creatorAvatar={post.creator.avatar_url}
                  views={`${(post.views / 1000).toFixed(1)}K`}
                  likes={`${(post.likes / 1000).toFixed(1)}K`}
                  price={post.price_lamports}
                  isGated={post.price_lamports > 0}
                  isVerified={post.creator.is_creator}
                  onClick={() => handleCardClick(post)}
                />
              ))}
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
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Floating Action Buttons - Hidden on mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 hidden md:flex">
        <Button
          size="icon"
          className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-lg hover:shadow-xl transition-all"
          onClick={() => setShowStudioModal(true)}
          data-testid="button-open-chat"
        >
          <MessageCircle className="h-5 w-5 text-white" />
        </Button>
        
        <Link href="/coins">
          <Button
            size="icon"
            className="w-12 h-12 btn-goon rounded-full shadow-lg hover:shadow-xl transition-all"
            data-testid="button-open-coins"
          >
            <Coins className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Modals */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        creator={selectedCreator}
      />
      
      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        post={selectedPost}
        onUnlock={() => setShowPaywallModal(false)}
      />
      
      <StudioModal
        isOpen={showStudioModal}
        onClose={() => setShowStudioModal(false)}
      />
      
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </div>
  );
}
