import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Camera,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VideoStreamerProps {
  streamId?: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  className?: string;
}

type StreamSource = 'camera' | 'screen' | 'none';

export default function VideoStreamer({ streamId, onStreamStart, onStreamEnd, className }: VideoStreamerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [streamSource, setStreamSource] = useState<StreamSource>('none');
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Start camera stream
  const startCameraStream = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setPermissionDenied(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      streamRef.current = stream;
      setStreamSource('camera');
      setIsStreaming(true);
      onStreamStart?.();

      toast({
        title: "Camera started",
        description: "Your camera is now live",
      });

    } catch (err) {
      console.error('Error accessing camera:', err);
      const error = err as Error;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera access denied. Please enable camera permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError') {
        setError('Camera is being used by another application. Please close other apps and try again.');
      } else {
        setError('Failed to access camera. Please check your device and try again.');
      }

      toast({
        title: "Camera error",
        description: error.message || "Failed to access camera",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start screen capture
  const startScreenStream = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      streamRef.current = stream;
      setStreamSource('screen');
      setIsStreaming(true);
      onStreamStart?.();

      // Handle when user stops screen sharing via browser UI
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopStream();
      });

      toast({
        title: "Screen sharing started",
        description: "Your screen is now being shared",
      });

    } catch (err) {
      console.error('Error accessing screen:', err);
      const error = err as Error;
      
      if (error.name === 'NotAllowedError') {
        setError('Screen sharing permission denied.');
      } else {
        setError('Failed to start screen sharing. Please try again.');
      }

      toast({
        title: "Screen sharing error",
        description: error.message || "Failed to start screen sharing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Stop streaming
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setStreamSource('none');
    setError(null);
    onStreamEnd?.();

    toast({
      title: "Stream stopped",
      description: "Your stream has ended",
    });
  };

  // Toggle video
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted={!audioEnabled}
            data-testid="video-stream"
          />

          {/* Stream Status Overlay */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            {isStreaming && (
              <Badge variant="destructive" className="bg-red-500 text-white">
                <Wifi className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
            )}
            {streamSource === 'camera' && (
              <Badge variant="secondary">
                <Camera className="h-3 w-3 mr-1" />
                Camera
              </Badge>
            )}
            {streamSource === 'screen' && (
              <Badge variant="secondary">
                <Monitor className="h-3 w-3 mr-1" />
                Screen
              </Badge>
            )}
          </div>

          {/* Controls Overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-lg p-3">
              {!isStreaming ? (
                <>
                  <Button
                    onClick={startCameraStream}
                    disabled={isLoading}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-start-camera"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </Button>
                  <Button
                    onClick={startScreenStream}
                    disabled={isLoading}
                    size="sm"
                    variant="outline"
                    data-testid="button-start-screen"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Monitor className="h-4 w-4 mr-2" />
                    Screen
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={toggleVideo}
                    size="sm"
                    variant={videoEnabled ? "secondary" : "destructive"}
                    data-testid="button-toggle-video"
                  >
                    {videoEnabled ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <VideoOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={toggleAudio}
                    size="sm"
                    variant={audioEnabled ? "secondary" : "destructive"}
                    data-testid="button-toggle-audio"
                  >
                    {audioEnabled ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={stopStream}
                    size="sm"
                    variant="destructive"
                    data-testid="button-stop-stream"
                  >
                    <WifiOff className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center text-white p-6">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold mb-2">Stream Error</h3>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                {permissionDenied && (
                  <p className="text-xs text-gray-400 mb-4">
                    Please allow camera access in your browser settings and refresh the page.
                  </p>
                )}
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => setError(null)}
                    size="sm"
                    variant="outline"
                    data-testid="button-dismiss-error"
                  >
                    Dismiss
                  </Button>
                  {!permissionDenied && (
                    <Button
                      onClick={streamSource === 'camera' ? startCameraStream : startScreenStream}
                      size="sm"
                      data-testid="button-retry-stream"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-500" />
                <p className="text-sm">Starting stream...</p>
              </div>
            </div>
          )}

          {/* Default State - No Stream */}
          {!isStreaming && !isLoading && !error && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
              <div className="text-center text-white p-6">
                <div className="bg-gray-800 rounded-full p-6 mx-auto mb-4 w-fit">
                  <Video className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Stream</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Choose your video source to start streaming
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={startCameraStream}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-start-camera-default"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
                  </Button>
                  <Button
                    onClick={startScreenStream}
                    variant="outline"
                    data-testid="button-start-screen-default"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Share Screen
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}