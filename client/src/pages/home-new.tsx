'use client';
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { getCurrentUser } from '@/lib/userManager';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { CategoryChips } from '@/components/CategoryChips';
import VideoCard from '@/components/VideoCard';
import PhotoCard from '@/components/PhotoCard';
import MasonryGrid from '@/components/MasonryGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus, Play, Users, Zap, Loader2, Coins } from 'lucide-react';
import { supabase, getPosts, getTokens, type Post, type Token, type User } from '@/lib/supabase';

type PostWithCreator = Post & { creator: User };
type TokenWithCreator = Token & { creator: User };

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [posts, setPosts] = useState<PostWithCreator[]>([]);
  const [streams, setStreams] = useState<PostWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Initialize user
  useEffect(() => {
    const initializeUser = async () => {
      const user = getCurrentUser();
      setCurrentUser(user);
    };
    initializeUser();
  }, []);

  // Fetch content based on category
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Determine API endpoint based on category
        let apiUrl = '/api/feed';
        if (selectedCategory === 'Videos') {
          apiUrl += '?type=video';
        } else if (selectedCategory === 'Photos') {
          apiUrl += '?type=photo';
        } else if (selectedCategory === 'Live') {
          apiUrl = '/api/posts?type=live';
        }
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.posts) {
          setPosts(data.posts);
          
          // Filter streams for live category
          if (selectedCategory === 'Live') {
            setStreams(data.posts);
          } else {
            const livePosts = data.posts.filter((post: any) => 
              post.is_live
            );
            setStreams(livePosts);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  // Set up real-time content updates (polling for now)
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh content every 30 seconds
      const fetchData = async () => {
        try {
          let apiUrl = '/api/feed';
          if (selectedCategory === 'Videos') {
            apiUrl += '?type=video';
          } else if (selectedCategory === 'Photos') {
            apiUrl += '?type=photo';
          } else if (selectedCategory === 'Live') {
            apiUrl = '/api/posts?type=live';
          }
          
          const response = await fetch(apiUrl);
          const data = await response.json();
          
          if (data.posts) {
            setPosts(data.posts);
            
            if (selectedCategory === 'Live') {
              setStreams(data.posts);
            } else {
              const livePosts = data.posts.filter((post: any) => 
                post.is_live
              );
              setStreams(livePosts);
            }
          }
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      };
      
      fetchData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedCategory]);

  // Removed handleCardClick - let cards use their built-in modal functionality

  const categories = ['All', 'Videos', 'Photos', 'Live'];

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
            {/* Live Streams Section */}
            {streams && streams.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Play className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-bold">Live Now</h2>
                  <Badge variant="destructive" className="animate-pulse">
                    LIVE
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {streams.map((stream) => (
                    <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative">
                        <div className="aspect-video bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center">
                          <Play className="h-12 w-12 text-accent" />
                        </div>
                        <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-500">
                          LIVE
                        </Badge>
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded text-xs">
                          <Users className="h-3 w-3" />
                          {stream.views || 0}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate">{stream.caption}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {((stream.creator as any)?.goon_username || stream.creator_id)?.slice(0, 2).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            @{(stream.creator as any)?.goon_username || stream.creator_id?.slice(0, 8) + '...' || 'Unknown'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}


            {/* All Content Section */}
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-4">All Content</h2>
            </div>
            <MasonryGrid>
              {posts?.map((post) => {
                const isVideo = post.media_url.includes('.mp4') || 
                               post.media_url.includes('.webm') || post.media_url.includes('.mov');
                const isPhoto = post.media_url.includes('.jpg') || 
                               post.media_url.includes('.jpeg') || post.media_url.includes('.png') || 
                               post.media_url.includes('.gif') || post.media_url.includes('.webp');

                if (isVideo) {
                  return (
                    <VideoCard
                      key={post.id}
                      id={post.id}
                      thumb={post.thumb_url}
                      duration="12:34"
                      title={post.caption}
                      creator={{
                        id: post.creator_id,
                        handle: (post.creator as any)?.goon_username || post.creator_id?.slice(0, 8) || 'Unknown',
                        avatar_url: post.creator?.avatar_url,
                        is_creator: post.creator?.is_creator || false
                      }}
                      views={post.views}
                      likes={post.likes}
                      price={post.price_lamports}
                      isGated={post.price_lamports > 0}
                      isVerified={post.creator?.age_verified || false}

                      solanaAddress={post.creator?.solana_address}
                    />
                  );
                } else if (isPhoto) {
                  return (
                    <PhotoCard
                      key={post.id}
                      id={post.id}
                      imageUrl={post.media_url}
                      title={post.caption}
                      creator={{ 
                        id: post.creator_id, 
                        handle: (post.creator as any)?.goon_username || post.creator_id?.slice(0, 8) || 'Unknown',
                        avatar_url: post.creator?.avatar_url,
                        is_creator: post.creator?.is_creator || false
                      }}
                      views={post.views}
                      likes={post.likes}
                      price={post.price_lamports}
                      isGated={post.price_lamports > 0}
                      isVerified={post.creator?.age_verified || false}

                      solanaAddress={post.creator?.solana_address}
                    />
                  );
                }
                return null;
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
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
      
    </div>
  );
}
