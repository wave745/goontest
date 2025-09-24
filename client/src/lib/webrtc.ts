import Hls from 'hls.js';

export interface StreamQuality {
  width: number;
  height: number;
  bitrate: number;
  label: string;
}

export const STREAM_QUALITIES: StreamQuality[] = [
  { width: 1920, height: 1080, bitrate: 3000000, label: '1080p' },
  { width: 1280, height: 720, bitrate: 1500000, label: '720p' },
  { width: 854, height: 480, bitrate: 800000, label: '480p' },
  { width: 640, height: 360, bitrate: 400000, label: '360p' },
];

export interface StreamStats {
  bitrate: number;
  frameRate: number;
  resolution: { width: number; height: number };
  packetsLost: number;
  latency: number;
}

// HLS Player setup for fallback streaming
export class HLSPlayer {
  private hls: Hls | null = null;
  private video: HTMLVideoElement;

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
  }

  loadStream(streamUrl: string): void {
    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(this.video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, starting playback');
        this.video.play().catch(console.error);
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, trying to recover...');
              this.hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, trying to recover...');
              this.hls?.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              this.destroy();
              break;
          }
        }
      });
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      this.video.src = streamUrl;
      this.video.addEventListener('loadedmetadata', () => {
        this.video.play().catch(console.error);
      });
    }
  }

  destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  setQuality(qualityIndex: number): void {
    if (this.hls) {
      this.hls.currentLevel = qualityIndex;
    }
  }

  getAvailableQualities(): string[] {
    if (this.hls) {
      return this.hls.levels.map(level => `${level.height}p`);
    }
    return [];
  }
}

// WebRTC stats collection
export async function getWebRTCStats(peerConnection: RTCPeerConnection): Promise<StreamStats> {
  const stats = await peerConnection.getStats();
  const statsData: StreamStats = {
    bitrate: 0,
    frameRate: 0,
    resolution: { width: 0, height: 0 },
    packetsLost: 0,
    latency: 0,
  };

  stats.forEach((report) => {
    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      statsData.bitrate = report.bytesReceived * 8 / report.timestamp * 1000;
      statsData.frameRate = report.framesPerSecond || 0;
      statsData.packetsLost = report.packetsLost || 0;
    }
    
    if (report.type === 'track' && report.kind === 'video') {
      statsData.resolution.width = report.frameWidth || 0;
      statsData.resolution.height = report.frameHeight || 0;
    }
    
    if (report.type === 'remote-candidate') {
      // Calculate latency if available
      // This is simplified - real latency calculation is more complex
    }
  });

  return statsData;
}

// Network quality detection
export function detectNetworkQuality(): Promise<'high' | 'medium' | 'low'> {
  return new Promise((resolve) => {
    // Simple network quality detection using navigator.connection
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      
      if (effectiveType === '4g' && downlink > 10) {
        resolve('high');
      } else if (effectiveType === '4g' || effectiveType === '3g') {
        resolve('medium');
      } else {
        resolve('low');
      }
    } else {
      // Fallback: measure actual download speed
      const imageAddr = '/ping-test.png';
      const downloadSize = 50000; // 50KB test image
      const startTime = Date.now();
      
      const img = new Image();
      img.onload = () => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000; // in seconds
        const bitsLoaded = downloadSize * 8;
        const speedBps = bitsLoaded / duration;
        const speedMbps = speedBps / (1024 * 1024);
        
        if (speedMbps > 5) {
          resolve('high');
        } else if (speedMbps > 1) {
          resolve('medium');
        } else {
          resolve('low');
        }
      };
      
      img.onerror = () => resolve('medium'); // Default to medium if test fails
      img.src = imageAddr + '?t=' + Date.now();
    }
  });
}

// Auto quality adjustment based on network conditions
export function getRecommendedQuality(networkQuality: 'high' | 'medium' | 'low'): StreamQuality {
  switch (networkQuality) {
    case 'high':
      return STREAM_QUALITIES[0]; // 1080p
    case 'medium':
      return STREAM_QUALITIES[1]; // 720p
    case 'low':
      return STREAM_QUALITIES[3]; // 360p
    default:
      return STREAM_QUALITIES[2]; // 480p
  }
}

// Screen sharing functionality
export async function startScreenShare(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: true,
    });
    
    return stream;
  } catch (error) {
    console.error('Error starting screen share:', error);
    throw new Error('Failed to start screen sharing');
  }
}

// Record stream functionality
export class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor() {}

  startRecording(stream: MediaStream, options?: MediaRecorderOptions): void {
    try {
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        ...options,
      });

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      });

      this.mediaRecorder.start();
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        resolve(blob);
      });

      this.mediaRecorder.stop();
      console.log('Recording stopped');
    });
  }

  downloadRecording(blob: Blob, filename: string = `stream-${Date.now()}.webm`): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Adaptive bitrate for publishers
export function adaptBitrate(stats: StreamStats, targetQuality: StreamQuality): StreamQuality {
  const { bitrate, packetsLost } = stats;
  const lossRate = packetsLost / (packetsLost + 100); // Simplified loss rate calculation
  
  // If packet loss is high or bitrate is much lower than target, step down quality
  if (lossRate > 0.05 || bitrate < targetQuality.bitrate * 0.7) {
    const currentIndex = STREAM_QUALITIES.findIndex(q => q.bitrate === targetQuality.bitrate);
    const newIndex = Math.min(currentIndex + 1, STREAM_QUALITIES.length - 1);
    return STREAM_QUALITIES[newIndex];
  }
  
  // If conditions are good, step up quality
  if (lossRate < 0.01 && bitrate > targetQuality.bitrate * 1.2) {
    const currentIndex = STREAM_QUALITIES.findIndex(q => q.bitrate === targetQuality.bitrate);
    const newIndex = Math.max(currentIndex - 1, 0);
    return STREAM_QUALITIES[newIndex];
  }
  
  return targetQuality;
}

// Browser compatibility checks
export interface BrowserCapabilities {
  webrtc: boolean;
  hls: boolean;
  mediaDevices: boolean;
  screenShare: boolean;
  recording: boolean;
}

export function getBrowserCapabilities(): BrowserCapabilities {
  return {
    webrtc: !!(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia),
    hls: Hls.isSupported() || document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '',
    mediaDevices: !!navigator.mediaDevices,
    screenShare: !!navigator.mediaDevices?.getDisplayMedia,
    recording: !!window.MediaRecorder,
  };
}