'use client';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRoute } from 'wouter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import VideoStreamer from '@/components/VideoStreamer';
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

type StreamData = {
  id: string;
  title: string;
  description?: string;
  media_url: string;
  thumb_url: string;
  caption: string;
  views: number;
  likes: number;
  created_at: Date;
  is_live: boolean;
  metadata?: {
    streamer_name?: string;
    solana_address?: string;
    start_time?: string;
    viewer_count?: number;
  };
  creator: {
    id: string;
    handle: string;
    is_creator: boolean;
  };
};

type DonationData = {
  totalDonated: number;
  streamersSupported: number;
  topDonors: Array<{
    name: string;
    amount: number;
    rank: number;
  }>;
};

export default function StreamDetail() {
  const { connected, publicKey } = useWallet();
  const [, params] = useRoute('/live/:streamId');
  const [stream, setStream] = useState<StreamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreamingLive, setIsStreamingLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [donationData, setDonationData] = useState<DonationData | null>(null);
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
        
        // Generate mock donation data for demo
        const donations: DonationData = {
          totalDonated: Math.floor(Math.random() * 100000) + 10000,
          streamersSupported: Math.floor(Math.random() * 200) + 50,
          topDonors: Array.from({ length: 10 }, (_, i) => ({
            name: `Supporter${i + 1}`,
            amount: Math.floor(Math.random() * 2000) + 100,
            rank: i + 1
          })).sort((a, b) => b.amount - a.amount)
        };
        
        setDonationData(donations);
        setViewerCount(streamData.metadata?.viewer_count || Math.floor(Math.random() * 500) + 50);
        
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
  }, [streamId]);

  // Handle stream actions
  const handleStreamStart = () => {
    setIsStreamingLive(true);
    toast({
      title: "Stream started",
      description: "You are now live!",
    });
  };

  const handleStreamEnd = () => {
    setIsStreamingLive(false);
    toast({
      title: "Stream ended",
      description: "Your stream has ended",
    });
  };

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
                      <h1 className="text-xl font-bold text-foreground">{stream.title}</h1>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">LIVE</span>
                        <Badge variant="destructive" className="animate-pulse text-xs">
                          LIVE
                        </Badge>
                      </div>
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
                  {/* Video Streamer Component */}
                  <VideoStreamer 
                    streamId={streamId}
                    onStreamStart={handleStreamStart}
                    onStreamEnd={handleStreamEnd}
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
                  
                  {/* Donation Leaderboard - Compact */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-center text-lg">
                        DONATION LEADERBOARD
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <div className="text-green-400 font-bold text-xl">
                            {formatCurrency(donationData?.totalDonated || 0)}
                          </div>
                          <div className="text-muted-foreground text-sm">TOTAL DONATED</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <div className="text-blue-400 font-bold text-xl">
                            {donationData?.streamersSupported || 0}
                          </div>
                          <div className="text-muted-foreground text-sm">STREAMERS SUPPORTED</div>
                        </div>
                      </div>
                      
                      {/* Top Donors - Compact List */}
                      <div className="max-h-32 overflow-y-auto">
                        <div className="text-foreground text-sm font-semibold mb-2">TOP DONORS</div>
                        {donationData?.topDonors.slice(0, 5).map((donor, index) => (
                          <div key={index} className="flex justify-between items-center py-1 text-sm">
                            <span className="text-muted-foreground">#{donor.rank} {donor.name}</span>
                            <span className="text-green-400 font-semibold">
                              {formatCurrency(donor.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side - Live Chat */}
                <div className="w-full lg:w-80">
                  <LiveChat 
                    streamId={streamId!}
                    streamTitle={stream.title}
                    className="h-[400px] lg:h-[600px]"
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







