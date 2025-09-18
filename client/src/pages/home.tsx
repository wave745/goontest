import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { CategoryChips } from '@/components/CategoryChips';
import VideoCard from '@/components/VideoCard';
import LiveStreamCard from '@/components/LiveStreamCard';
import MasonryGrid from '@/components/MasonryGrid';
import TipModal from '@/components/modals/TipModal';
import PaywallModal from '@/components/modals/PaywallModal';
import StudioModal from '@/components/modals/StudioModal';
import WalletModal from '@/components/modals/WalletModal';
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
  const { connected } = useWallet();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPost, setSelectedPost] = useState<PostWithCreator | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<User | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Fetch regular posts
  const { data: posts, isLoading: postsLoading } = useQuery<PostWithCreator[]>({
    queryKey: ['/api/posts', selectedCategory],
  });

  // Fetch live streams
  const { data: liveStreams, isLoading: streamsLoading } = useQuery<PostWithCreator[]>({
    queryKey: ['/api/streams'],
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time updates
  });

  const isLoading = postsLoading || streamsLoading;

  // Combine and filter content based on selected category
  const getFilteredContent = () => {
    // Filter streams to only show live ones
    const streams = (liveStreams || []).filter(stream => stream.is_live === true);
    const regularPosts = posts || [];
    
    switch (selectedCategory) {
      case 'Live':
        return { liveStreams: streams, posts: [] };
      case 'All':
        return { liveStreams: streams, posts: regularPosts };
      case 'Videos':
        // Filter for video posts only
        const videoPosts = regularPosts.filter(post => 
          post.media_url.includes('.mp4') || 
          post.media_url.includes('.webm') || 
          post.media_url.includes('.mov')
        );
        return { liveStreams: [], posts: videoPosts };
      case 'Photos':
        // Filter for photo posts only
        const photoPosts = regularPosts.filter(post => 
          post.media_url.includes('.jpg') || 
          post.media_url.includes('.jpeg') || 
          post.media_url.includes('.png') || 
          post.media_url.includes('.gif') || 
          post.media_url.includes('.webp')
        );
        return { liveStreams: [], posts: photoPosts };
      default:
        return { liveStreams: streams, posts: regularPosts };
    }
  };

  const { liveStreams: filteredStreams, posts: filteredPosts } = getFilteredContent();

  const handleCardClick = (post: PostWithCreator) => {
    if (post.price_lamports > 0) {
      setSelectedPost(post);
      setShowPaywallModal(true);
    } else {
      // Navigate to post detail or play content
      window.location.href = `/p/${post.id}`;
    }
  };

  const handleLiveStreamClick = (streamId: string) => {
    // Navigate to live stream detail
    window.location.href = `/live/${streamId}`;
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
              {/* Render Live Streams First */}
              {filteredStreams?.map((stream) => (
                <LiveStreamCard
                  key={stream.id}
                  id={stream.id}
                  title={stream.metadata?.stream_title || stream.caption}
                  streamerName={stream.metadata?.streamer_name || stream.creator.handle}
                  streamerAvatar={stream.creator.avatar_url}
                  thumbnailUrl={stream.thumb_url}
                  mediaUrl={stream.media_url}
                  viewerCount={stream.metadata?.viewer_count || stream.views || 0}
                  isLive={stream.is_live}
                  category={stream.metadata?.category || 'Just Chatting'}
                  onClick={() => handleLiveStreamClick(stream.id)}
                  post={stream}
                />
              ))}
              
              {/* Render Regular Posts */}
              {filteredPosts?.map((post) => (
                <VideoCard
                  key={post.id}
                  id={post.id}
                  thumb={post.thumb_url}
                  duration="12:34"
                  title={post.caption}
                  creator={post.creator.handle}
                  creatorAvatar={post.creator.avatar_url}
                  views={post.views || 0}
                  likes={post.likes || 0}
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
      {connected && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 hidden md:flex">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg"
            onClick={() => setShowStudioModal(true)}
            data-testid="button-upload"
          >
            <Upload className="h-6 w-6" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-12 rounded-full bg-card border-border text-card-foreground hover:bg-accent/10 shadow-lg"
            data-testid="button-coins"
          >
            <Coins className="h-5 w-5" />
          </Button>
        </div>
      )}

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
