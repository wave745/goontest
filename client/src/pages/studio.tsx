import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StudioModal from '@/components/modals/StudioModal';
import { Upload, Coins, BarChart3, Settings, Video, Radio, Play, Mic, MicOff, Camera, CameraOff, Users, Clock } from 'lucide-react';
import type { Post, Token, LiveStream } from '@shared/schema';

export default function Studio() {
  const { connected, publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showLiveStreamModal, setShowLiveStreamModal] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
  const [streamDuration, setStreamDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: myPosts } = useQuery<Post[]>({
    queryKey: ['/api/posts/my'],
    enabled: connected,
  });

  const { data: myTokens } = useQuery<Token[]>({
    queryKey: ['/api/tokens/my'],
    enabled: connected,
  });

  const { data: myStreams, isLoading: streamsLoading, error: streamsError } = useQuery<LiveStream[]>({
    queryKey: ['/api/streams', publicKey?.toBase58()],
    queryFn: async () => {
      const response = await fetch(`/api/streams?creatorId=${publicKey?.toBase58()}`);
      if (!response.ok) throw new Error('Failed to fetch streams');
      return response.json();
    },
    enabled: connected && !!publicKey,
  });

  const { data: activeStreams } = useQuery<LiveStream[]>({
    queryKey: ['/api/streams/active'],
    queryFn: async () => {
      const response = await fetch('/api/streams/active');
      if (!response.ok) throw new Error('Failed to fetch active streams');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const createStreamMutation = useMutation({
    mutationFn: async (streamData: { title: string; description: string }) => {
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: publicKey?.toBase58(),
          title: streamData.title,
          description: streamData.description,
        }),
      });
      if (!response.ok) throw new Error('Failed to create stream');
      return response.json();
    },
    onSuccess: (stream) => {
      setCurrentStream(stream);
      setIsLive(true);
      setShowLiveStreamModal(false);
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streams/active'] });
    },
  });

  const updateStreamMutation = useMutation({
    mutationFn: async ({ streamId, updates }: { streamId: string; updates: Partial<LiveStream> }) => {
      const response = await fetch(`/api/streams/${streamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update stream');
      return response.json();
    },
    onSuccess: (stream) => {
      setCurrentStream(stream);
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
    },
  });

  const endStreamMutation = useMutation({
    mutationFn: async (streamId: string) => {
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to end stream');
      return response.json();
    },
    onSuccess: () => {
      setCurrentStream(null);
      setIsLive(false);
      setStreamTitle('');
      setStreamDescription('');
      setStreamDuration(0);
      setViewerCount(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streams/active'] });
    },
  });

  // Real-time stream updates
  useEffect(() => {
    if (isLive && currentStream) {
      // Start duration timer
      intervalRef.current = setInterval(() => {
        setStreamDuration(prev => prev + 1);
      }, 1000);

      // Simulate viewer count changes
      const viewerInterval = setInterval(() => {
        setViewerCount(prev => {
          const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
          return Math.max(0, prev + change);
        });
      }, 3000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearInterval(viewerInterval);
      };
    }
  }, [isLive, currentStream]);

  // Update stream data periodically
  useEffect(() => {
    if (currentStream && isLive) {
      const updateInterval = setInterval(() => {
        updateStreamMutation.mutate({
          streamId: currentStream.id,
          updates: {
            viewer_count: viewerCount,
            duration: streamDuration,
            max_viewers: Math.max(currentStream.max_viewers, viewerCount),
            metadata: {
              ...currentStream.metadata,
              is_muted: isMuted,
              is_camera_on: isCameraOn,
            }
          }
        });
      }, 10000); // Update every 10 seconds

      return () => clearInterval(updateInterval);
    }
  }, [currentStream, isLive, viewerCount, streamDuration, isMuted, isCameraOn, updateStreamMutation]);

  const startLiveStream = async () => {
    if (!streamTitle.trim()) {
      alert('Please enter a stream title');
      return;
    }

    try {
      createStreamMutation.mutate({
        title: streamTitle,
        description: streamDescription,
      });
      
      // Create streaming activity notification
      if (publicKey) {
        try {
          await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'user_streaming',
              user_id: publicKey.toBase58(),
              title: `🔴 ${publicKey.toBase58().slice(0, 8)}... is now live!`,
              description: streamDescription || streamTitle,
              metadata: {
                stream_title: streamTitle,
                stream_description: streamDescription,
                viewer_count: 0
              }
            })
          });
        } catch (error) {
          console.error('Failed to create streaming activity:', error);
        }
      }
    } catch (error) {
      console.error('Failed to start live stream:', error);
      alert('Failed to start live stream. Please try again.');
    }
  };

  const stopLiveStream = () => {
    if (currentStream) {
      endStreamMutation.mutate(currentStream.id);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (currentStream) {
      updateStreamMutation.mutate({
        streamId: currentStream.id,
        updates: {
          metadata: {
            ...currentStream.metadata,
            is_muted: !isMuted,
          }
        }
      });
    }
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    if (currentStream) {
      updateStreamMutation.mutate({
        streamId: currentStream.id,
        updates: {
          metadata: {
            ...currentStream.metadata,
            is_camera_on: !isCameraOn,
          }
        }
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground mb-4">Creator Studio</h1>
              <p className="text-muted-foreground mb-6">Connect your wallet to access creator tools</p>
              <Button className="btn-goon">Connect Wallet</Button>
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
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Creator Studio</h1>
              <div className="flex flex-col sm:flex-row gap-3">
                {!isLive ? (
                  <Dialog open={showLiveStreamModal} onOpenChange={setShowLiveStreamModal}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                        data-testid="button-live-stream"
                      >
                        <Radio className="mr-2 h-4 w-4" />
                        Go Live
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Start Live Stream</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="stream-title">Stream Title *</Label>
                          <Input
                            id="stream-title"
                            value={streamTitle}
                            onChange={(e) => setStreamTitle(e.target.value)}
                            placeholder="Enter stream title"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="stream-description">Description</Label>
                          <Textarea
                            id="stream-description"
                            value={streamDescription}
                            onChange={(e) => setStreamDescription(e.target.value)}
                            placeholder="Enter stream description"
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={startLiveStream}
                            disabled={!streamTitle.trim()}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            Start Live Stream
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowLiveStreamModal(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button 
                    onClick={stopLiveStream}
                    className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                    data-testid="button-stop-stream"
                  >
                    <Radio className="mr-2 h-4 w-4" />
                    End Stream
                  </Button>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-foreground">{myPosts?.length || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Live Streams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-foreground">{myStreams?.length || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">GOON Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-foreground">{myTokens?.length || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-foreground">
                    {myPosts?.reduce((total, post) => total + post.views, 0).toLocaleString() || '0'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Stream Interface */}
            {isLive && currentStream && (
              <Card className="bg-red-900/20 border-red-500/50 mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <CardTitle className="text-red-400">LIVE: {currentStream.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={toggleMute}
                        className={`border-red-500/50 hover:bg-red-500/10 ${
                          isMuted ? 'bg-red-500/20 text-red-300' : 'text-red-400'
                        }`}
                      >
                        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={toggleCamera}
                        className={`border-red-500/50 hover:bg-red-500/10 ${
                          !isCameraOn ? 'bg-red-500/20 text-red-300' : 'text-red-400'
                        }`}
                      >
                        {isCameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative">
                    <div className="text-center text-white">
                      <Video className="h-16 w-16 mx-auto mb-4 text-red-500" />
                      <p className="text-lg font-semibold">Live Stream Preview</p>
                      <p className="text-sm text-gray-400">
                        {isMuted ? 'Audio muted' : 'Audio active'} • {isCameraOn ? 'Camera on' : 'Camera off'}
                      </p>
                    </div>
                    {/* Stream Key Display */}
                    <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Stream Key: {currentStream.stream_key}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-red-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {viewerCount} viewers
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(streamDuration)}
                      </span>
                    </div>
                    <div className="text-xs text-red-300">
                      Max viewers: {currentStream.max_viewers}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Tabs */}
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted/10">
                <TabsTrigger value="posts">My Posts</TabsTrigger>
                <TabsTrigger value="streams">Live Streams</TabsTrigger>
                <TabsTrigger value="tokens">GOON Tokens</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myPosts?.map((post) => (
                    <Card key={post.id} className="bg-card border-border">
                      <div className="aspect-video relative">
                        <img 
                          src={post.thumb_url} 
                          alt={post.caption} 
                          className="w-full h-full object-cover rounded-t-lg" 
                        />
                        {post.price_lamports > 0 && (
                          <div className="absolute top-2 right-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded">
                            {(post.price_lamports / 1e9).toFixed(3)} SOL
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-foreground mb-2 line-clamp-2">{post.caption}</h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{post.views} views</span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="streams" className="mt-6">
                <div className="space-y-4">
                  
                  {streamsLoading && (
                    <Card className="bg-card border-border">
                      <CardContent className="p-8 text-center">
                        <div className="text-muted-foreground">Loading streams...</div>
                      </CardContent>
                    </Card>
                  )}
                  {streamsError && (
                    <Card className="bg-card border-border">
                      <CardContent className="p-8 text-center">
                        <div className="text-red-500">Error loading streams: {streamsError.message}</div>
                      </CardContent>
                    </Card>
                  )}
                  {myStreams && myStreams.length > 0 ? (
                    myStreams.map((stream) => (
                      <Card key={stream.id} className="bg-card border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                stream.status === 'live' 
                                  ? 'bg-red-500 animate-pulse' 
                                  : 'bg-gray-400'
                              }`}></div>
                              <div>
                                <h3 className="font-semibold text-foreground">{stream.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {stream.description || 'No description'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {stream.max_viewers} max
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatDuration(stream.duration)}
                                </span>
                                <span className="capitalize">
                                  {stream.status}
                                </span>
                              </div>
                              <div className="text-xs mt-1">
                                {new Date(stream.created_at).toLocaleDateString()}
                                {stream.ended_at && ` - ${new Date(stream.ended_at).toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="bg-card border-border">
                      <CardContent className="p-8 text-center">
                        <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Live Streams Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Start your first live stream to connect with your audience in real-time.
                        </p>
                        <Button 
                          onClick={() => setShowLiveStreamModal(true)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Radio className="mr-2 h-4 w-4" />
                          Go Live
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tokens" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myTokens?.map((token) => (
                    <Card key={token.id} className="bg-gradient-to-br from-accent/20 to-accent-2/20 border-accent/30">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
                            <Coins className="h-6 w-6 text-accent-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-foreground">{token.name}</CardTitle>
                            <p className="text-xs text-muted-foreground font-mono">{token.mint_address}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Supply</span>
                            <span className="text-foreground">{token.supply.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Symbol</span>
                            <span className="text-foreground">{token.symbol}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Analytics Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Analytics features coming soon. Track your content performance, earnings, and audience engagement.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <StudioModal
        isOpen={showStudioModal}
        onClose={() => setShowStudioModal(false)}
      />
    </div>
  );
}
