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
          tokenSymbol: streamData.creator?.handle?.toUpperCase() || 'TOKEN'
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
                  <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
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
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" size="icon">
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stream Content */}
              <div className="flex-1 flex">
                {/* Left Side - Stream and Donation Leaderboard */}
                <div className="flex-1 flex flex-col">
                  {/* Donation Leaderboard */}
                  <div className="bg-card border-b border-border p-4">
                    <h2 className="text-lg font-bold text-foreground mb-4 text-center">
                      {stream.tokenSymbol || 'STREAMERCOIN'} LIVE DONATION LEADERBOARD
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-green-400 font-bold text-2xl">
                          {formatCurrency(donationData?.totalDonated || 0)}
                        </div>
                        <div className="text-muted-foreground text-sm">TOTAL DONATED</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-blue-400 font-bold text-2xl">
                          {donationData?.streamersSupported || 0}
                        </div>
                        <div className="text-muted-foreground text-sm">STREAMERS SUPPORTED</div>
                      </div>
                    </div>
                    
                    {/* Top Donors Table */}
                    <div className="max-h-40 overflow-y-auto">
                      <div className="text-foreground text-sm font-semibold mb-2">STREAMER AMOUNT</div>
                      {donationData?.topDonors.slice(0, 10).map((donor, index) => (
                        <div key={index} className="flex justify-between items-center py-1 text-sm">
                          <span className="text-muted-foreground">#{donor.rank} {donor.name}</span>
                          <span className="text-green-400 font-semibold">
                            {formatCurrency(donor.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Video Player Area */}
                  <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4 mx-auto">
                        <Play className="h-10 w-10 text-red-500" />
                      </div>
                      <p className="text-white/80 text-lg">Live Stream</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-black/50 text-white px-3 py-1 rounded text-sm">
                          <Users className="h-4 w-4" />
                          {formatViewerCount(viewerCount)} watching
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Live Chat */}
                <div className="w-80 bg-card border-l border-border flex flex-col">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">Live Chat</h3>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.avatar} alt={message.username} />
                          <AvatarFallback className="text-xs">
                            {message.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {message.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1">{message.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  
                  {/* Chat Input */}
                  <div className="p-4 border-t border-border">
                    {connected ? (
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          disabled={isSendingMessage}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isSendingMessage}
                          size="icon"
                        >
                          {isSendingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm">Read-only mode</span>
                        </div>
                        <Button size="sm" className="w-full">
                          Log in to send messages
                        </Button>
                      </div>
                    )}
                  </div>
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







