import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import VideoCard from '@/components/VideoCard';
import MasonryGrid from '@/components/MasonryGrid';
import { CategoryChips } from '@/components/CategoryChips';
import ActivityFeed from '@/components/ActivityFeed';
import { Button } from '@/components/ui/button';
import { Clock, Upload, Coins, Bell } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Post } from '@shared/schema';

export default function Recent() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'content' | 'activity'>('content');
  const [, setLocation] = useLocation();
  const { connected, publicKey } = useWallet();

  const { data: posts, isLoading, error } = useQuery<Post[]>({
    queryKey: ['/api/posts/recent', selectedCategory],
    staleTime: 1000 * 60 * 2, // 2 minutes (more frequent updates for recent content)
  });

  const handleCardClick = (post: Post) => {
    setLocation(`/p/${post.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold">Recent</h1>
              </div>
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold">Recent</h1>
              </div>
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Failed to load recent content</p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                    className="bg-card border-border text-card-foreground hover:bg-accent/10"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
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
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                <h1 className="text-xl md:text-2xl font-bold">Recent</h1>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground">
                {activeTab === 'content' ? 'Latest uploads from creators' : 'Platform updates and notifications'}
              </span>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
              <Button
                variant={activeTab === 'content' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('content')}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                Content
              </Button>
              <Button
                variant={activeTab === 'activity' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('activity')}
                className="text-xs"
              >
                <Bell className="h-3 w-3 mr-1" />
                Activity
              </Button>
            </div>
          </div>
          
          {activeTab === 'content' ? (
            <>
              <CategoryChips onCategoryChange={setSelectedCategory} />
              
              <div className="p-2 md:p-4 pb-20 md:pb-4">
                {posts && posts.length > 0 ? (
                  <>
                    <MasonryGrid>
                      {posts.map((post) => (
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
                        Load More Recent Content
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent content available</p>
                      <p className="text-sm text-muted-foreground mt-2">Be the first to upload content!</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-2 md:p-4 pb-20 md:pb-4">
              <ActivityFeed 
                userId={connected ? publicKey?.toBase58() : undefined}
                limit={20}
                showHeader={false}
              />
            </div>
          )}
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
    </div>
  );
}
