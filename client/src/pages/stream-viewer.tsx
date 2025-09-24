import { useState, useEffect, useRef, useMemo } from 'react';
import { useRoute } from 'wouter';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { 
  Users, 
  Heart, 
  Share2, 
  MessageCircle, 
  Send,
  DollarSign,
  Settings,
  Maximize,
  Volume2,
  VolumeX,
  Wifi,
  Loader2,
  Copy,
  ExternalLink,
  Crown,
  Zap
} from 'lucide-react';
import { Room } from 'livekit-client';
import { 
  connectAsViewer, 
  generateLiveKitToken, 
  setupRoomEventHandlers,
  disconnectRoom,
  type RoomEventHandlers 
} from '@/lib/livekit';
import { HLSPlayer, detectNetworkQuality } from '@/lib/webrtc';
import { StreamChat, StreamManager, type ChatMessage, type StreamMetadata } from '@/lib/supabaseStreaming';

export default function StreamViewer() {
  const [match, params] = useRoute('/stream/:id');
  const { connected, publicKey, sendTransaction } = useWallet();
  const streamId = params?.id;

  // Stream state
  const [streamData, setStreamData] = useState<StreamMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);

  // Video player state
  const [room, setRoom] = useState<Room | null>(null);
  const [hlsPlayer, setHlsPlayer] = useState<HLSPlayer | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'high' | 'medium' | 'low'>('medium');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [streamChat, setStreamChat] = useState<StreamChat | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Tip state
  const [tipAmount, setTipAmount] = useState('');
  const [isSendingTip, setIsSendingTip] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize stream data and chat
  useEffect(() => {
    if (!streamId) return;

    const initializeStream = async () => {
      setIsLoading(true);
      try {
        // Get stream metadata
        const stream = await StreamManager.getStream(streamId);
        if (!stream) {
          toast({
            title: "Stream Not Found",
            description: "This stream doesn't exist or has ended.",
            variant: "destructive",
          });
          return;
        }

        setStreamData(stream);
        setViewerCount(stream.viewer_count);
        setLikes(0); // TODO: Get actual likes from API

        // Initialize chat
        const chat = new StreamChat(streamId);
        setStreamChat(chat);

        // Load chat history
        const history = await chat.loadHistory();
        setChatMessages(history);

        // Subscribe to chat updates
        chat.subscribe({
          onMessage: (message) => {
            setChatMessages(prev => [...prev, message]);
            // Auto-scroll to bottom
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 100);
          },
          onViewerCount: (count) => {
            setViewerCount(count);
          },
        });

        // Detect network quality
        const quality = await detectNetworkQuality();
        setNetworkQuality(quality);

      } catch (error) {
        console.error('Error initializing stream:', error);
        toast({
          title: "Error",
          description: "Failed to load stream data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeStream();

    // Cleanup
    return () => {
      if (streamChat) {
        streamChat.unsubscribe();
      }
      if (room) {
        disconnectRoom(room);
      }
      if (hlsPlayer) {
        hlsPlayer.destroy();
      }
    };
  }, [streamId]);

  // Connect to LiveKit room or HLS fallback
  useEffect(() => {
    if (!streamData || !videoRef.current) return;

    const connectToStream = async () => {
      setIsConnecting(true);
      try {
        // Try WebRTC first for low latency
        if (viewerCount < 100 && networkQuality !== 'low') {
          try {
            const token = await generateLiveKitToken({
              streamId: streamData.id,
              participantName: userName || `Viewer_${Date.now()}`,
              isPublisher: false,
            });

            const liveKitRoom = await connectAsViewer({
              roomName: streamData.room_id,
              participantName: userName || `Viewer_${Date.now()}`,
              token,
            });

            // Set up event handlers
            const handlers: RoomEventHandlers = {
              onTrackSubscribed: (track, publication, participant) => {
                if (track.kind === 'video' && videoRef.current) {
                  track.attach(videoRef.current);
                  setIsVideoPlaying(true);
                }
              },
              onTrackUnsubscribed: (track) => {
                track.detach();
              },
              onDisconnected: () => {
                setIsVideoPlaying(false);
                // Fallback to HLS
                setupHLSFallback();
              },
            };

            setupRoomEventHandlers(liveKitRoom, handlers);
            setRoom(liveKitRoom);
            
          } catch (error) {
            console.error('WebRTC connection failed, falling back to HLS:', error);
            setupHLSFallback();
          }
        } else {
          // Use HLS for high viewer count or poor network
          setupHLSFallback();
        }
      } catch (error) {
        console.error('Error connecting to stream:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to the stream. Please try refreshing.",
          variant: "destructive",
        });
      } finally {
        setIsConnecting(false);
      }
    };

    const setupHLSFallback = () => {
      if (!videoRef.current) return;
      
      const player = new HLSPlayer(videoRef.current);
      // Construct HLS URL - this would normally come from your streaming service
      const hlsUrl = `https://your-cdn.com/live/${streamData.room_id}/index.m3u8`;
      player.loadStream(hlsUrl);
      setHlsPlayer(player);
      setIsVideoPlaying(true);
    };

    connectToStream();
  }, [streamData, networkQuality, viewerCount, userName]);

  // Auto-generate username
  useEffect(() => {
    if (!userName) {
      if (connected && publicKey) {
        setUserName(`${publicKey.toString().slice(0, 8)}`);
      } else {
        setUserName(`Anonymous_${Math.random().toString(36).substr(2, 6)}`);
      }
    }
  }, [connected, publicKey, userName]);

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim() || !streamChat || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      await streamChat.sendMessage({
        user_name: userName,
        message: newMessage.trim(),
        message_type: 'message',
        solana_address: connected ? publicKey?.toString() : undefined,
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Send tip
  const sendTip = async () => {
    if (!connected || !publicKey || !streamData || !tipAmount) {
      toast({
        title: "Wallet Required",
        description: "Connect your wallet to send tips.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid tip amount.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTip(true);
    try {
      // TODO: Implement actual Solana transaction
      // For now, just send a chat message about the tip
      if (streamChat) {
        await streamChat.sendMessage({
          user_name: userName,
          message: `Tipped ${amount} SOL! 💰`,
          message_type: 'tip',
          solana_address: publicKey.toString(),
          tip_amount: amount * 1e9, // Convert to lamports
        });
      }

      toast({
        title: "Tip Sent!",
        description: `You tipped ${amount} SOL to ${streamData.creator_name}`,
      });
      
      setTipAmount('');
    } catch (error) {
      console.error('Error sending tip:', error);
      toast({
        title: "Tip Failed",
        description: "Failed to send tip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingTip(false);
    }
  };

  // Toggle like
  const toggleLike = async () => {
    // TODO: Implement actual like API call
    setIsLiked(!isLiked);
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
  };

  // Share stream
  const shareStream = async () => {
    const url = `${window.location.origin}/stream/${streamId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Stream link copied to clipboard!",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (!isFullscreen) {
      videoRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (!match || !streamId) {
    return <div>Stream not found</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading stream...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!streamData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl font-semibold mb-2">Stream Not Found</p>
              <p className="text-muted-foreground">This stream doesn't exist or has ended.</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 md:p-6">
            {/* Video Player */}
            <div className="lg:col-span-3 space-y-4">
              {/* Video Container */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
                {isConnecting ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Connecting to stream...</p>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    data-testid="video-player"
                  />
                )}

                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="animate-pulse">
                        <Wifi className="h-3 w-3 mr-1" />
                        LIVE
                      </Badge>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white/20"
                      >
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Live indicator */}
                <div className="absolute top-4 left-4">
                  <Badge variant="destructive" className="animate-pulse">
                    <Wifi className="h-3 w-3 mr-1" />
                    LIVE
                  </Badge>
                </div>

                {/* Viewer count */}
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    <Users className="h-4 w-4" />
                    {formatViewerCount(viewerCount)}
                  </div>
                </div>
              </div>

              {/* Stream Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-xl font-bold mb-2" data-testid="text-stream-title">
                        {streamData.title}
                      </h1>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {streamData.creator_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold" data-testid="text-creator-name">
                            {streamData.creator_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {streamData.creator_wallet.slice(0, 8)}...{streamData.creator_wallet.slice(-8)}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          <Crown className="h-3 w-3 mr-1" />
                          Creator
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={isLiked ? "default" : "outline"}
                      size="sm"
                      onClick={toggleLike}
                      data-testid="button-like"
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                      {likes}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={shareStream}
                      data-testid="button-share"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>

                    <div className="flex gap-1 ml-auto">
                      <Input
                        placeholder="Tip amount (SOL)"
                        value={tipAmount}
                        onChange={(e) => setTipAmount(e.target.value)}
                        className="w-32"
                        type="number"
                        step="0.1"
                        min="0"
                        data-testid="input-tip-amount"
                      />
                      <Button
                        onClick={sendTip}
                        disabled={!connected || isSendingTip || !tipAmount}
                        className="bg-yellow-600 hover:bg-yellow-700"
                        data-testid="button-send-tip"
                      >
                        {isSendingTip ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <DollarSign className="h-4 w-4 mr-1" />
                            Tip
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Sidebar */}
            <div className="space-y-4">
              {/* Wallet Connection */}
              {!connected && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Connect your wallet to send tips and chat
                    </p>
                    <WalletMultiButton />
                  </CardContent>
                </Card>
              )}

              {/* Live Chat */}
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Live Chat
                    <Badge variant="outline" className="ml-auto">
                      {chatMessages.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>

                {/* Chat Messages */}
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea 
                    className="flex-1 p-4"
                    ref={chatContainerRef}
                  >
                    <div className="space-y-3">
                      {chatMessages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex gap-2 ${message.message_type === 'tip' ? 'bg-yellow-500/10 p-2 rounded' : ''}`}
                        >
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {message.user_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {message.user_name}
                              </span>
                              {message.message_type === 'tip' && (
                                <Badge variant="secondary" className="text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Tip
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground break-words">
                              {message.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Chat Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        data-testid="input-chat-message"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isSendingMessage}
                        size="sm"
                        data-testid="button-send-message"
                      >
                        {isSendingMessage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}