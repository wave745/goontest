import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Monitor, Mic, MicOff, Video, VideoOff, Users, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Room, RoomEvent, createLocalVideoTrack, createLocalAudioTrack, LocalTrack, Track } from 'livekit-client';

interface StreamPublisherProps {
  streamId: string;
  streamerName: string;
  walletAddress: string;
  onViewerCountChange?: (count: number) => void;
}

export default function StreamPublisher({ 
  streamId, 
  streamerName, 
  walletAddress, 
  onViewerCountChange 
}: StreamPublisherProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalTrack | null>(null);
  const audioTrackRef = useRef<LocalTrack | null>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  // Initialize LiveKit room connection
  const connectToRoom = async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);

      // Get LiveKit token from backend
      const tokenResponse = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          participantName: streamerName,
          walletAddress,
          signedMessage: 'publisher' // Simplified for now
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get streaming token');
      }

      const { token } = await tokenResponse.json();

      // Connect to LiveKit room
      const room = new Room();
      roomRef.current = room;

      // Room event handlers
      room.on(RoomEvent.Connected, () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        toast({ title: "Connected to stream!", description: "You're now live" });
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setIsPublishing(false);
        toast({ title: "Disconnected", description: "Stream ended" });
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        setViewerCount(prev => {
          const newCount = prev + 1;
          onViewerCountChange?.(newCount);
          return newCount;
        });
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount(prev => {
          const newCount = Math.max(0, prev - 1);
          onViewerCountChange?.(newCount);
          return newCount;
        });
      });

      room.on(RoomEvent.RoomMetadataChanged, (metadata) => {
        try {
          const data = JSON.parse(metadata);
          if (data.viewerCount !== undefined) {
            setViewerCount(data.viewerCount);
            onViewerCountChange?.(data.viewerCount);
          }
        } catch (e) {
          // Ignore metadata parsing errors
        }
      });

      // Connect to room
      const wsUrl = process.env.LIVEKIT_URL || 'wss://your-livekit-server.com';
      await room.connect(wsUrl, token);

    } catch (error) {
      console.error('Failed to connect to room:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
      setConnectionStatus('disconnected');
      toast({
        title: "Connection failed",
        description: "Could not connect to streaming service",
        variant: "destructive"
      });
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      if (!roomRef.current) {
        await connectToRoom();
      }

      const videoTrack = await createLocalVideoTrack({
        resolution: { width: 1280, height: 720 },
        facingMode: 'user'
      });

      videoTrackRef.current = videoTrack;
      
      if (videoElementRef.current) {
        videoTrack.attach(videoElementRef.current);
      }

      if (roomRef.current) {
        await roomRef.current.localParticipant.publishTrack(videoTrack);
        setIsPublishing(true);
      }

      setIsCameraOn(true);
      toast({ title: "Camera started", description: "Your video is now live" });

    } catch (error) {
      console.error('Failed to start camera:', error);
      setError('Camera access failed');
      toast({
        title: "Camera failed",
        description: "Could not access camera. Check permissions.",
        variant: "destructive"
      });
    }
  };

  // Start screen share
  const startScreenShare = async () => {
    try {
      if (!roomRef.current) {
        await connectToRoom();
      }

      const videoTrack = await createLocalVideoTrack({
        // @ts-ignore - LiveKit types may not match exactly
        video: { mediaSource: 'screen' }
      });

      // Stop existing camera if active
      if (videoTrackRef.current) {
        await roomRef.current?.localParticipant.unpublishTrack(videoTrackRef.current);
        videoTrackRef.current.stop();
      }

      videoTrackRef.current = videoTrack;
      
      if (videoElementRef.current) {
        videoTrack.attach(videoElementRef.current);
      }

      if (roomRef.current) {
        await roomRef.current.localParticipant.publishTrack(videoTrack);
        setIsPublishing(true);
      }

      setIsCameraOn(true);
      toast({ title: "Screen share started", description: "Your screen is now being shared" });

    } catch (error) {
      console.error('Failed to start screen share:', error);
      toast({
        title: "Screen share failed", 
        description: "Could not share screen",
        variant: "destructive"
      });
    }
  };

  // Start microphone
  const startMicrophone = async () => {
    try {
      const audioTrack = await createLocalAudioTrack();
      audioTrackRef.current = audioTrack;

      if (roomRef.current) {
        await roomRef.current.localParticipant.publishTrack(audioTrack);
      }

      setIsMicOn(true);
      toast({ title: "Microphone started", description: "Your audio is now live" });

    } catch (error) {
      console.error('Failed to start microphone:', error);
      toast({
        title: "Microphone failed",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  // Stop video
  const stopVideo = async () => {
    if (videoTrackRef.current && roomRef.current) {
      await roomRef.current.localParticipant.unpublishTrack(videoTrackRef.current);
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
    setIsCameraOn(false);
    setIsPublishing(false);
  };

  // Stop audio  
  const stopAudio = async () => {
    if (audioTrackRef.current && roomRef.current) {
      await roomRef.current.localParticipant.unpublishTrack(audioTrackRef.current);
      audioTrackRef.current.stop();
      audioTrackRef.current = null;
    }
    setIsMicOn(false);
  };

  // Disconnect from room
  const disconnect = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
    
    if (audioTrackRef.current) {
      audioTrackRef.current.stop();
      audioTrackRef.current = null;
    }

    setIsConnected(false);
    setIsPublishing(false);
    setIsCameraOn(false);
    setIsMicOn(false);
    setConnectionStatus('disconnected');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <div>
                <p className="font-medium text-card-foreground">
                  {connectionStatus === 'connected' ? 'Live' :
                   connectionStatus === 'connecting' ? 'Connecting...' :
                   'Offline'}
                </p>
                <p className="text-sm text-muted-foreground">Stream ID: {streamId}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{viewerCount}</span>
              </div>
              
              {isPublishing && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Publishing
                </Badge>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Preview */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            <video
              ref={videoElementRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            
            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-gray-400">
                  <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Camera off</p>
                </div>
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <Button
                size="sm"
                variant={isCameraOn ? "destructive" : "default"}
                onClick={isCameraOn ? stopVideo : startCamera}
                data-testid="button-camera-toggle"
              >
                {isCameraOn ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={startScreenShare}
                data-testid="button-screen-share"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant={isMicOn ? "destructive" : "default"}
                onClick={isMicOn ? stopAudio : startMicrophone}
                data-testid="button-mic-toggle"
              >
                {isMicOn ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Controls */}
      <div className="flex justify-center gap-4">
        {!isConnected ? (
          <Button 
            onClick={connectToRoom}
            disabled={connectionStatus === 'connecting'}
            className="bg-accent hover:bg-accent/90"
            data-testid="button-connect"
          >
            {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Broadcasting'}
          </Button>
        ) : (
          <Button 
            onClick={disconnect}
            variant="destructive"
            data-testid="button-disconnect"
          >
            End Stream
          </Button>
        )}
      </div>
    </div>
  );
}