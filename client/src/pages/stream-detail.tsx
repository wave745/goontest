'use client';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRoute } from 'wouter';
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
  ArrowLeft
} from 'lucide-react';
import { supabase, type Post, type User } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

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

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  avatar?: string;
};

export default function StreamDetail() {
  const { connected, publicKey } = useWallet();
  const [, params] = useRoute('/live/:streamId');
  const [stream, setStream] = useState<StreamWithCreator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [donationData, setDonationData] = useState<DonationData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const streamId = params?.streamId;

  useEffect(() => {
    if (!streamId) return;

    const fetchStream = async () => {
      try {
        setIsLoading(true);
        
        // Fetch stream data
        const response = await fetch(`/api/posts/${streamId}`);
        if (!response.ok) throw new Error('Stream not found');
        
        const streamData = await response.json();
        
        // Generate mock donation data
        const donations: DonationData = {
          totalDonated: Math.floor(Math.random() * 100000) + 10000,
          streamersSupported: Math.floor(Math.random() * 200) + 50,
          topDonors: Array.from({ length: 20 }, (_, i) => ({
            name: `Donor${i + 1}`,
            amount: Math.floor(Math.random() * 5000) + 100,
            rank: i + 1
          })).sort((a, b) => b.amount - a.amount)
        };
        
        // Generate mock market data
        const streamWithData = {
          ...streamData,
          marketCap: Math.floor(Math.random() * 20000000) + 1000000,
          allTimeHigh: Math.floor(Math.random() * 30000000) + 2000000,
          tokenSymbol: ((streamData.creator as any)?.goon_username || streamData.creator?.handle)?.toUpperCase() || 'TOKEN'
        };
        
        setStream(streamWithData);
        setDonationData(donations);
        setViewerCount(Math.floor(Math.random() * 1000) + 10);
        
        // Generate mock chat messages
        const mockMessages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
          id: `msg-${i}`,
          username: `User${i + 1}`,
          message: `This is message ${i + 1} in the chat`,
          timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`
        }));
        setChatMessages(mockMessages);
        
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

  // Simulate viewer count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 20) - 10;
        return Math.max(0, prev + change);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    
    // Simulate sending message
    setTimeout(() => {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        username: publicKey?.toBase58().slice(0, 8) || 'Anonymous',
        message: newMessage,
        timestamp: new Date().toLocaleTimeString(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`
      };
      
      setChatMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setIsSendingMessage(false);
    }, 1000);
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
                      <h1 className="text-xl font-bold text-foreground">{stream.tokenSymbol || 'STREAMERCOIN'}</h1>
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
                <div className="flex-1 lg:max-w-2xl">
                  {/* Video Player - Small Size */}
                  <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden relative mb-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-3 mx-auto">
                          <Play className="h-8 w-8 text-red-500" data-testid="button-play-video" />
                        </div>
                        <p className="text-white/80 text-lg">Live Stream</p>
                      </div>
                    </div>
                    
                    {/* Live Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge variant="destructive" className="animate-pulse" data-testid="badge-live-status">
                        <Wifi className="h-3 w-3 mr-1" />
                        LIVE
                      </Badge>
                    </div>
                    
                    {/* Viewer Count */}
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded text-sm" data-testid="display-viewer-count">
                        <Users className="h-4 w-4" />
                        {formatViewerCount(viewerCount)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Stream Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card border border-border rounded-lg p-4 mb-4 gap-4 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      {/* Like Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-accent hover:text-accent hover:bg-accent/10"
                        data-testid="button-like-stream"
                      >
                        <Heart className="h-5 w-5" />
                        <span className="font-semibold">{stream.likes || 0}</span>
                      </Button>
                      
                      {/* Tip Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-accent hover:text-accent hover:bg-accent/10"
                        data-testid="button-tip-stream"
                      >
                        <DollarSign className="h-5 w-5" />
                        <span className="font-semibold">Tip</span>
                      </Button>
                      
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
                          <div className="text-sm text-muted-foreground">Market Cap</div>
                          <div className="font-semibold text-accent">{formatMarketCap(stream.marketCap || 0)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Donation Leaderboard - Compact */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-center text-lg">
                        {stream.tokenSymbol || 'STREAMERCOIN'} DONATION LEADERBOARD
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

                {/* Right Side - Live Chat Card */}
                <div className="w-full lg:w-80">
                  <Card className="h-[400px] lg:h-[600px] flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-accent" />
                        <span>Live Global Chat</span>
                        <Badge variant="outline" className="ml-auto" data-testid="badge-chat-users">
                          {chatMessages.length} online
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    {/* Chat Messages */}
                    <CardContent className="flex-1 overflow-y-auto p-4 pt-0 space-y-3">
                      {chatMessages.map((message) => (
                        <div key={message.id} className="flex gap-2" data-testid={`chat-message-${message.id}`}>
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarImage src={message.avatar} alt={message.username} />
                            <AvatarFallback className="text-xs">
                              {message.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-accent truncate">
                                {message.username}
                              </span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {message.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-foreground mt-1 break-words">{message.message}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </CardContent>
                    
                    {/* Chat Input */}
                    <CardContent className="pt-0">
                      {connected ? (
                        <div className="flex gap-2">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={isSendingMessage}
                            className="flex-1"
                            data-testid="input-chat-message"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || isSendingMessage}
                            size="icon"
                            className="bg-accent hover:bg-accent/90"
                            data-testid="button-send-message"
                          >
                            {isSendingMessage ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                            <Lock className="h-4 w-4" />
                            <span className="text-sm">Connect wallet to chat</span>
                          </div>
                          <Button size="sm" className="w-full bg-accent hover:bg-accent/90" data-testid="button-connect-wallet">
                            Connect Wallet
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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







