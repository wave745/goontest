'use client';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRoute, useLocation } from 'wouter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import StreamViewer from '@/components/StreamViewer';
import LiveChat from '@/components/LiveChat';
import TipButton from '@/components/TipButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical,
  Wifi,
  Loader2,
  Crown,
  Star,
  Zap,
  DollarSign,
  TrendingUp,
  Eye,
  Clock,
  Gift,
  Send,
  Lock,
  ArrowLeft,
  ThumbsUp
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Post } from '@shared/schema';

type User = {
  id: string;
  handle: string;
  avatar_url?: string;
  is_creator: boolean;
};

type StreamData = Post & { creator: User };


export default function StreamDetail() {
  const { connected, publicKey } = useWallet();
  const [, params] = useRoute('/live/:streamId');
  const [, navigate] = useLocation();
  const [stream, setStream] = useState<StreamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreamingLive, setIsStreamingLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  const streamId = params?.streamId;

  useEffect(() => {
    if (!streamId) return;

    const fetchStream = async () => {
      try {
        setIsLoading(true);
        
        // Fetch stream data from API
        const response = await fetch(`/api/streams/${streamId}`);
        if (!response.ok) throw new Error('Stream not found');
        
        const streamData = await response.json();
        setStream(streamData);
        
        setViewerCount(streamData.metadata?.viewer_count || streamData.views || 0);
        setIsStreamingLive(streamData.is_live || false);
        
      } catch (error) {
        console.error('Error fetching stream:', error);
        toast({
          title: "Error",
          description: "Failed to load stream",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStream();

    // Set up real-time updates for stream status and viewer count every 5 seconds
    const updateInterval = setInterval(async () => {
      if (!streamId) return;
      
      try {
        const response = await fetch(`/api/streams/${streamId}`);
        if (response.ok) {
          const updatedStream = await response.json();
          setStream(updatedStream);
          setViewerCount(updatedStream.metadata?.viewer_count || updatedStream.views || 0);
          setIsStreamingLive(updatedStream.is_live || false);
          
          // If stream ended, show notification and handle navigation
          if (!updatedStream.is_live && isStreamingLive) {
            toast({
              title: "Stream ended",
              description: "The stream has ended. Redirecting to home...",
              variant: "default",
            });
            // Navigate back to home after 2 seconds
            setTimeout(() => {
              navigate('/');
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error updating stream status:', error);
      }
    }, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(updateInterval);
  }, [streamId, isStreamingLive]);


  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${streamId}/like`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setIsLiked(!isLiked);
        setStream(prev => prev ? {
          ...prev,
          likes: prev.likes + (isLiked ? -1 : 1)
        } : null);
      }
    } catch (error) {
      console.error('Error liking stream:', error);
    }
  };

  const handleTipSent = (amount: number, signature: string) => {
    toast({
      title: "Tip sent successfully! 🎉",
      description: `Sent ${amount} SOL to ${stream?.metadata?.streamer_name || 'streamer'}`,
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatMarketCap = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-muted-foreground">Loading stream...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Stream Not Found</h1>
              <p className="text-muted-foreground">The stream you're looking for doesn't exist.</p>
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
          <div className="flex h-screen">
            {/* Main Stream Area */}
            <div className="flex-1 flex flex-col">
              {/* Stream Header */}
              <div className="bg-card border-b border-border p-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-500/20">
                      <Wifi className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">{stream.caption}</h1>
                      {isStreamingLive ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">LIVE</span>
                          <Badge variant="destructive" className="animate-pulse text-xs">
                            LIVE
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">OFFLINE</span>
                          <Badge variant="secondary" className="text-xs">
                            ENDED
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" data-testid="button-share-header">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" size="icon" data-testid="button-favorite">
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stream Content */}
              <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
                {/* Left Side - Video Player and Controls */}
                <div className="flex-1 lg:max-w-3xl">
                  {/* Stream Viewer Component */}
                  <StreamViewer 
                    streamId={streamId!}
                    mediaUrl={stream.media_url}
                    isLive={isStreamingLive}
                    viewerCount={viewerCount}
                    className="mb-4"
                  />
                  
                  {/* Stream Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card border border-border rounded-lg p-4 mb-4 gap-4 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      {/* Like Button */}
                      <Button
                        variant="ghost"
                        onClick={handleLike}
                        size="sm"
                        className={`flex items-center gap-2 hover:bg-accent/10 ${isLiked ? "text-red-500" : "text-accent hover:text-accent"}`}
                        data-testid="button-like-stream"
                      >
                        <Heart className="h-5 w-5" />
                        <span className="font-semibold">{stream.likes || 0}</span>
                      </Button>
                      
                      {/* Tip Button */}
                      <TipButton
                        streamerId={streamId}
                        streamerAddress={stream.metadata?.solana_address}
                        streamerName={stream.metadata?.streamer_name || 'Anonymous'}
                        onTipSent={handleTipSent}
                      />
                      
                      {/* Views Count */}
                      <div className="flex items-center gap-2 text-muted-foreground" data-testid="display-views-count">
                        <Eye className="h-5 w-5" />
                        <span className="font-semibold">{stream.views || 0} views</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Share Button */}
                      <Button variant="outline" size="sm" data-testid="button-share-stream">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      
                      {/* More Options */}
                      <Button variant="outline" size="icon" data-testid="button-more-options">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Creator Info */}
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src="/placeholder-avatar.jpg" alt="Anonymous Creator" />
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">@Anonymous</h3>
                          <p className="text-sm text-muted-foreground">{stream.caption || 'Live streaming now'}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Streamer</div>
                          <div className="font-semibold text-accent">{stream.metadata?.streamer_name || 'Anonymous'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                </div>

                {/* Right Side - Live Chat */}
                <div className="w-full lg:w-72 flex flex-col h-full">
                  <LiveChat 
                    streamId={streamId!}
                    streamTitle={stream.caption}
                    className="flex-1 min-h-0 overflow-y-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}







