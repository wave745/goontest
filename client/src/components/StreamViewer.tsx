import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Wifi,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface StreamViewerProps {
  streamId: string;
  mediaUrl?: string;
  isLive?: boolean;
  viewerCount?: number;
  className?: string;
}

export default function StreamViewer({ 
  streamId, 
  mediaUrl, 
  isLive = false, 
  viewerCount = 0,
  className 
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Handle play/pause
  const togglePlayback = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        // Try to play - handle autoplay restrictions
        try {
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (playError: any) {
          // If autoplay failed due to policy, try muted playback
          if (playError.name === 'NotAllowedError') {
            videoRef.current.muted = true;
            setIsMuted(true);
            await videoRef.current.play();
            setIsPlaying(true);
            toast({
              title: "Autoplay started muted",
              description: "Click the volume button to unmute",
            });
          } else {
            throw playError;
          }
        }
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play stream. Please try again.');
    }
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Handle fullscreen
  const toggleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (!isFullscreen) {
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Handle retry stream
  const retryStream = () => {
    if (!videoRef.current || !mediaUrl) return;
    
    setError(null);
    setIsLoading(true);
    
    // Force reload the video source
    videoRef.current.load();
  };

  // Video event handlers
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setError(null);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setIsPlaying(false);
    setError('Stream unavailable. The stream may have ended or there may be a connection issue.');
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  // Fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Reset controls hide timer
  const resetControlsTimer = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Handle mouse movement to reset timer
  const handleMouseMove = () => {
    resetControlsTimer();
  };

  // Handle mouse leave to hide controls immediately
  const handleMouseLeave = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    setShowControls(false);
  };

  // Initialize controls timer
  useEffect(() => {
    resetControlsTimer(); // Show controls initially
    
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, []);

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format viewer count
  const formatViewerCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div 
          className="relative bg-black rounded-lg overflow-hidden aspect-video group cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={togglePlayback}
          data-testid="stream-viewer-container"
        >
          {/* Video Element */}
          {mediaUrl && (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              src={mediaUrl}
              autoPlay={isLive}
              muted={isMuted}
              playsInline
              onLoadStart={handleLoadStart}
              onLoadedData={handleLoadedData}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onError={handleError}
              onTimeUpdate={handleTimeUpdate}
              data-testid="video-player"
            />
          )}

          {/* Stream Status Overlays */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            {isLive && (
              <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">
                <Wifi className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
            )}
            {viewerCount > 0 && (
              <Badge variant="secondary" className="bg-black/60 text-white">
                <Users className="h-3 w-3 mr-1" />
                {formatViewerCount(viewerCount)}
              </Badge>
            )}
          </div>

          {/* Loading Overlay */}
          {isLoading && !error && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-500" />
                <p className="text-sm">Loading stream...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center text-white p-6 max-w-md">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold mb-2">Stream Error</h3>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                <Button
                  onClick={retryStream}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-retry-stream"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* No Stream Placeholder */}
          {!mediaUrl && !error && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
              <div className="text-center text-white p-6">
                <div className="bg-gray-800 rounded-full p-6 mx-auto mb-4 w-fit">
                  <Wifi className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Stream Available</h3>
                <p className="text-sm text-gray-400">
                  The stream is currently offline or the media URL is not available.
                </p>
              </div>
            </div>
          )}

          {/* Video Controls */}
          {mediaUrl && (
            <div 
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Bar (for non-live streams) */}
              {!isLive && duration > 0 && (
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={(e) => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Number(e.target.value);
                      }
                    }}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    data-testid="progress-bar"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <Button
                  onClick={togglePlayback}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                {/* Volume Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    data-testid="button-mute"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    data-testid="volume-slider"
                  />
                </div>

                {/* Time Display (for non-live streams) */}
                {!isLive && duration > 0 && (
                  <div className="text-white text-sm" data-testid="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                )}

                <div className="flex-1" />

                {/* Fullscreen Button */}
                <Button
                  onClick={toggleFullscreen}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  data-testid="button-fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}