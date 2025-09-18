'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
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
  WifiOff,
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
  Wallet
} from 'lucide-react';
import { supabase, getPosts, type Post, type User } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import ReactionButtons from '@/components/ReactionButtons';

type StreamWithCreator = Post & { 
  creator: User;
  donations?: DonationData;
  marketCap?: number;
  allTimeHigh?: number;
  tokenSymbol?: string;
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

export default function Live() {
  const [streams, setStreams] = useState<StreamWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [donationData, setDonationData] = useState<Record<string, DonationData>>({});
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    username: string;
    message: string;
    timestamp: Date;
    isTip: boolean;
    tipAmount?: number;
  }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setIsLoading(true);
        
        // Get live streams from API
        const response = await fetch('/api/streams');
        const data = await response.json();
        const liveStreams = data.streams || [];
        
        // Simulate viewer counts and donation data
        const counts: Record<string, number> = {};
        const donations: Record<string, DonationData> = {};
        
        liveStreams?.forEach(stream => {
          counts[stream.id] = Math.floor(Math.random() * 1000) + 10;
          
          // Generate mock donation data
          const totalDonated = Math.floor(Math.random() * 100000) + 10000;
          const streamersSupported = Math.floor(Math.random() * 200) + 50;
          
          // Generate top donors
          const topDonors = Array.from({ length: 10 }, (_, i) => ({
            name: `Donor${i + 1}`,
            amount: Math.floor(Math.random() * 5000) + 100,
            rank: i + 1
          })).sort((a, b) => b.amount - a.amount);
          
          donations[stream.id] = {
            totalDonated,
            streamersSupported,
            topDonors
          };
        });
        
        // Add market cap and token data to streams
        const streamsWithData = liveStreams?.map(stream => ({
          ...stream,
          marketCap: Math.floor(Math.random() * 20000000) + 1000000,
          allTimeHigh: Math.floor(Math.random() * 30000000) + 2000000,
          tokenSymbol: 'ANONYMOUS'
        })) || [];
        
        setStreams(streamsWithData);
        setViewerCounts(counts);
        setDonationData(donations);
        
      } catch (error) {
        console.error('Error fetching live streams:', error);
        toast({
          title: "Error",
          description: "Failed to load live streams",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreams();
  }, []);

  // Set up Realtime subscription for live streams
  useEffect(() => {
    const channel = supabase
      .channel('live-streams')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.new.is_live) {
            setStreams(prev => [payload.new as StreamWithCreator, ...prev]);
            setViewerCounts(prev => ({
              ...prev,
              [payload.new.id]: Math.floor(Math.random() * 100) + 5
            }));
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.new.is_live !== payload.old.is_live) {
            if (payload.new.is_live) {
              setStreams(prev => [payload.new as StreamWithCreator, ...prev]);
            } else {
              setStreams(prev => prev.filter(stream => stream.id !== payload.new.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Simulate viewer count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCounts(prev => {
        const newCounts = { ...prev };
        Object.keys(newCounts).forEach(streamId => {
          const currentCount = newCounts[streamId];
          const change = Math.floor(Math.random() * 20) - 10; // -10 to +10
          newCounts[streamId] = Math.max(0, currentCount + change);
        });
        return newCounts;
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleJoinStream = (streamId: string) => {
    // Navigate to stream detail page
    window.location.href = `/live/${streamId}`;
  };

  const handleLikeStream = (streamId: string) => {
    // TODO: Implement like functionality
  };

  const handleTipStream = (streamId: string, amount: number) => {
    // TODO: Implement tip functionality
    toast({
      title: "Tip sent!",
      description: `You tipped ${amount} SOL to the streamer`,
    });
  };

  const handleShareStream = (streamId: string) => {
    // TODO: Implement share functionality
    navigator.clipboard.writeText(`${window.location.origin}/live/${streamId}`);
    toast({
      title: "Link Copied",
      description: "Stream link copied to clipboard",
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Anonymous chat - just add to local state
    setChatMessages(prev => [...prev, {
      id: `msg_${Date.now()}`,
      username: 'Anonymous',
      message: newMessage.trim(),
      timestamp: new Date(),
      isTip: false
    }]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-muted-foreground">Loading live streams...</p>
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
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto flex gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <Play className="h-6 w-6 text-red-500" />
                  </div>
                  <h1 className="text-3xl font-bold text-foreground">Live Streams</h1>
                  <Badge variant="destructive" className="animate-pulse">
                    LIVE
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Watch creators go live and interact with them in real-time
                </p>
              </div>

            {/* Live Streams Grid */}
            {streams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams.map((stream) => {
                  const donations = donationData[stream.id];
                  return (
                    <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                      {/* Stream Preview with Donation Leaderboard */}
                      <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800">
                        {/* Donation Leaderboard Overlay */}
                        <div className="absolute inset-0 bg-black/60 flex">
                          <div className="flex-1 p-4">
                            <div className="text-center mb-4">
                              <h3 className="text-white font-bold text-lg mb-2">
                                {stream.tokenSymbol || 'STREAMERCOIN'} LIVE DONATION LEADERBOARD
                              </h3>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-white/10 rounded-lg p-3">
                                  <div className="text-green-400 font-bold text-xl">
                                    {formatCurrency(donations?.totalDonated || 0)}
                                  </div>
                                  <div className="text-white/80 text-sm">TOTAL DONATED</div>
                                </div>
                                <div className="bg-white/10 rounded-lg p-3">
                                  <div className="text-blue-400 font-bold text-xl">
                                    {donations?.streamersSupported || 0}
                                  </div>
                                  <div className="text-white/80 text-sm">STREAMERS SUPPORTED</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Top Donors List */}
                            <div className="max-h-32 overflow-y-auto">
                              <div className="text-white/90 text-sm font-semibold mb-2">STREAMER AMOUNT</div>
                              {donations?.topDonors.slice(0, 5).map((donor, index) => (
                                <div key={index} className="flex justify-between items-center py-1 text-xs">
                                  <span className="text-white/80">#{donor.rank} {donor.name}</span>
                                  <span className="text-green-400 font-semibold">
                                    {formatCurrency(donor.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Video Preview Area */}
                          <div className="w-1/3 bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-2 mx-auto">
                                <Play className="h-6 w-6 text-red-500" />
                              </div>
                              <p className="text-white/80 text-xs">LIVE</p>
                            </div>
                          </div>
                        </div>

                        {/* Live Badge */}
                        <div className="absolute top-3 left-3">
                          <Badge variant="destructive" className="animate-pulse">
                            <Wifi className="h-3 w-3 mr-1" />
                            LIVE
                          </Badge>
                        </div>

                        {/* Viewer Count */}
                        <div className="absolute top-3 right-3">
                          <div className="flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded text-sm">
                            <Users className="h-4 w-4" />
                            {formatViewerCount(viewerCounts[stream.id] || 0)}
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        {/* Creator Info with Market Data */}
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={'/placeholder-avatar.jpg'} alt="Anonymous Creator" />
                            <AvatarFallback>
                              A
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground truncate">
@Anonymous
                              </h4>
                              {stream.creator?.age_verified && (
                                <Badge variant="secondary" className="text-xs">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {stream.creator?.bio || 'No bio available'}
                            </p>
                          </div>
                        </div>

                        {/* Market Cap and ATH */}
                        <div className="flex items-center justify-between text-sm mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span className="text-muted-foreground">mcap</span>
                              <span className="font-semibold text-foreground">
                                {formatMarketCap(stream.marketCap || 0)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-muted-foreground">ATH</span>
                              <span className="font-semibold text-foreground">
                                {formatMarketCap(stream.allTimeHigh || 0)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-green-500">
                            <Wifi className="h-4 w-4" />
                            {formatViewerCount(viewerCounts[stream.id] || 0)} watching
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleJoinStream(stream.id)}
                            className="flex-1 bg-accent hover:bg-accent/90"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Join Stream
                          </Button>
                          
                          <ReactionButtons
                            postId={stream.id}
                            likes={stream.likes || 0}
                            onLike={handleLikeStream}
                          />
                          
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleShareStream(stream.id)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <WifiOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Live Streams</h3>
                  <p className="text-muted-foreground mb-4">
                    No creators are currently live. Check back later or start your own stream!
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button className="bg-accent hover:bg-accent/90">
                      <Play className="h-4 w-4 mr-2" />
                      Start Streaming
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Featured Streams Section */}
            {streams.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-2 mb-6">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-xl font-bold text-foreground">Featured Streams</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {streams.slice(0, 2).map((stream) => (
                    <Card key={`featured-${stream.id}`} className="overflow-hidden">
                      <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4 mx-auto">
                              <Play className="h-10 w-10 text-red-500" />
                            </div>
                            <p className="text-white/80">Featured Stream</p>
                          </div>
                        </div>
                        <div className="absolute top-3 left-3">
                          <Badge variant="destructive" className="animate-pulse">
                            <Zap className="h-3 w-3 mr-1" />
                            FEATURED
                          </Badge>
                        </div>
                        <div className="absolute top-3 right-3">
                          <div className="flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded text-sm">
                            <Users className="h-4 w-4" />
                            {formatViewerCount(viewerCounts[stream.id] || 0)}
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                          {stream.caption || 'Untitled Stream'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={'/placeholder-avatar.jpg'} alt="Anonymous Creator" />
                            <AvatarFallback className="text-xs">
                              A
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
Anonymous Creator
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

              {/* Load More */}
              {streams.length > 0 && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline" className="bg-card border-border text-card-foreground hover:bg-accent/10">
                    Load More Streams
                  </Button>
                </div>
              )}
            </div>

            {/* Global Chat Panel */}
            {showChat && (
              <div className="w-80 bg-card border border-border rounded-lg flex flex-col h-[600px]">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Global Chat</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChat(false)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                </div>
                
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-accent font-bold text-xs">
                            {message.username.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {message.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground break-words">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Chat Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={false}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Anonymous chat enabled
                  </p>
                </div>
              </div>
            )}

            {/* Chat Toggle Button */}
            {!showChat && (
              <Button
                onClick={() => setShowChat(true)}
                className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 bg-accent hover:bg-accent/90"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
