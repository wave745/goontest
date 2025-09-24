import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  Settings, 
  Monitor,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Play
} from 'lucide-react';
import { 
  requestMediaPermissions, 
  getMediaDevices, 
  isWebRTCSupported 
} from '@/lib/livekit';
import { getBrowserCapabilities } from '@/lib/webrtc';
import { StreamManager } from '@/lib/supabaseStreaming';

interface MediaDevice {
  deviceId: string;
  label: string;
}

export default function StreamStart() {
  const { connected, publicKey } = useWallet();
  const [, setLocation] = useLocation();
  
  // Form state
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');
  
  // Media state
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [capabilities, setCapabilities] = useState(getBrowserCapabilities());
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check browser capabilities on mount
  useEffect(() => {
    setCapabilities(getBrowserCapabilities());
    if (!isWebRTCSupported()) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser doesn't support live streaming. Please use Chrome, Firefox, or Safari.",
        variant: "destructive",
      });
    }
  }, []);

  // Request permissions and load devices
  const setupMediaDevices = async () => {
    setIsCheckingDevices(true);
    try {
      // Request permissions
      const permissions = await requestMediaPermissions();
      setHasPermissions(permissions.camera && permissions.microphone);
      
      if (permissions.camera || permissions.microphone) {
        // Get available devices
        const devices = await getMediaDevices();
        setCameras(devices.cameras.map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 8)}` })));
        setMicrophones(devices.microphones.map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 8)}` })));
        
        // Select default devices
        if (devices.cameras.length > 0) {
          setSelectedCamera(devices.cameras[0].deviceId);
        }
        if (devices.microphones.length > 0) {
          setSelectedMicrophone(devices.microphones[0].deviceId);
        }
      }
    } catch (error) {
      console.error('Error setting up media devices:', error);
      toast({
        title: "Permission Error",
        description: "Failed to access camera or microphone. Please check your browser permissions.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingDevices(false);
    }
  };

  // Start preview
  const startPreview = async () => {
    if (!hasPermissions) {
      await setupMediaDevices();
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: isVideoEnabled && selectedCamera ? {
          deviceId: selectedCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: isAudioEnabled && selectedMicrophone ? {
          deviceId: selectedMicrophone,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      setIsPreviewActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error starting preview:', error);
      toast({
        title: "Preview Error",
        description: "Failed to start camera preview. Please check your device settings.",
        variant: "destructive",
      });
    }
  };

  // Stop preview
  const stopPreview = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setIsPreviewActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    } else {
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    } else {
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Handle go live
  const handleGoLive = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Required",
        description: "Please connect your Solana wallet to start streaming.",
        variant: "destructive",
      });
      return;
    }

    if (!streamTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a stream title.",
        variant: "destructive",
      });
      return;
    }

    if (!creatorName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your creator name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create stream metadata in Supabase
      const streamData = await StreamManager.createStream({
        title: streamTitle,
        creator_wallet: publicKey.toString(),
        creator_name: creatorName,
      });

      if (!streamData) {
        throw new Error('Failed to create stream');
      }

      // Navigate to the stream page with the media stream
      // We'll pass the stream ID and let the stream page handle LiveKit connection
      setLocation(`/stream/${streamData.id}`);
      
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Stream Error",
        description: "Failed to start your stream. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = streamTitle.trim() && creatorName.trim() && connected;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-accent/20">
                    <Video className="h-6 w-6 text-accent" />
                  </div>
                  <h1 className="text-3xl font-bold">Start Streaming</h1>
                </div>
                <Link href="/live">
                  <Button variant="outline">
                    Back to Live
                  </Button>
                </Link>
              </div>
              <p className="text-muted-foreground">
                Set up your live stream and start broadcasting to your audience
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stream Setup Form */}
              <div className="space-y-6">
                {/* Wallet Connection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Wallet Connection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {connected ? (
                      <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-green-500">Wallet Connected</p>
                          <p className="text-sm text-muted-foreground">
                            {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                          <p className="text-sm text-yellow-500">Connect your wallet to receive tips and start streaming</p>
                        </div>
                        <WalletMultiButton />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stream Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Stream Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="creator-name">Creator Name</Label>
                      <Input
                        id="creator-name"
                        placeholder="Enter your display name"
                        value={creatorName}
                        onChange={(e) => setCreatorName(e.target.value)}
                        data-testid="input-creator-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="stream-title">Stream Title</Label>
                      <Input
                        id="stream-title"
                        placeholder="What are you streaming today?"
                        value={streamTitle}
                        onChange={(e) => setStreamTitle(e.target.value)}
                        data-testid="input-stream-title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="stream-description">Description (Optional)</Label>
                      <Textarea
                        id="stream-description"
                        placeholder="Tell viewers what to expect..."
                        value={streamDescription}
                        onChange={(e) => setStreamDescription(e.target.value)}
                        rows={3}
                        data-testid="input-stream-description"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Device Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Device Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!hasPermissions ? (
                      <Button 
                        onClick={setupMediaDevices} 
                        disabled={isCheckingDevices}
                        className="w-full"
                        data-testid="button-setup-devices"
                      >
                        {isCheckingDevices ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Checking Devices...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Setup Camera & Microphone
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="camera-select">Camera</Label>
                          <select
                            id="camera-select"
                            className="w-full p-2 rounded border bg-background"
                            value={selectedCamera}
                            onChange={(e) => setSelectedCamera(e.target.value)}
                            data-testid="select-camera"
                          >
                            {cameras.map((camera) => (
                              <option key={camera.deviceId} value={camera.deviceId}>
                                {camera.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="microphone-select">Microphone</Label>
                          <select
                            id="microphone-select"
                            className="w-full p-2 rounded border bg-background"
                            value={selectedMicrophone}
                            onChange={(e) => setSelectedMicrophone(e.target.value)}
                            data-testid="select-microphone"
                          >
                            {microphones.map((mic) => (
                              <option key={mic.deviceId} value={mic.deviceId}>
                                {mic.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant={isVideoEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={toggleVideo}
                            data-testid="button-toggle-video"
                          >
                            {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant={isAudioEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={toggleAudio}
                            data-testid="button-toggle-audio"
                          >
                            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Preview & Go Live */}
              <div className="space-y-6">
                {/* Camera Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Camera Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                      {isPreviewActive ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                          data-testid="video-preview"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">Camera preview will appear here</p>
                            {hasPermissions && (
                              <Button onClick={startPreview} data-testid="button-start-preview">
                                <Play className="h-4 w-4 mr-2" />
                                Start Preview
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Preview Controls */}
                      {isPreviewActive && (
                        <div className="absolute bottom-3 left-3 flex gap-2">
                          <Button
                            size="sm"
                            variant={isVideoEnabled ? "default" : "destructive"}
                            onClick={toggleVideo}
                          >
                            {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant={isAudioEnabled ? "default" : "destructive"}
                            onClick={toggleAudio}
                          >
                            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={stopPreview}
                          >
                            Stop
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Browser Compatibility */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Check</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">WebRTC Support</span>
                        <Badge variant={capabilities.webrtc ? "default" : "destructive"}>
                          {capabilities.webrtc ? "✓ Supported" : "✗ Not Supported"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Media Devices</span>
                        <Badge variant={capabilities.mediaDevices ? "default" : "destructive"}>
                          {capabilities.mediaDevices ? "✓ Available" : "✗ Unavailable"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Screen Share</span>
                        <Badge variant={capabilities.screenShare ? "default" : "secondary"}>
                          {capabilities.screenShare ? "✓ Available" : "✗ Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Go Live Button */}
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      onClick={handleGoLive}
                      disabled={!isFormValid || isLoading}
                      className="w-full h-12 text-lg bg-red-600 hover:bg-red-700"
                      data-testid="button-go-live"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Starting Stream...
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 mr-2" />
                          Go Live
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </>
                      )}
                    </Button>
                    
                    {!isFormValid && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        {!connected ? "Connect wallet" : "Fill in required fields"} to start streaming
                      </p>
                    )}
                  </CardContent>
                </Card>
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