import { Room, RemoteParticipant, RemoteTrack, RemoteTrackPublication, createLocalTracks } from 'livekit-client';

// LiveKit configuration
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://goonhub-a1b2c3d4.livekit.cloud';

export interface StreamConfig {
  roomName: string;
  participantName: string;
  token: string;
}

export interface LiveKitTokenRequest {
  streamId: string;
  participantName: string;
  walletAddress: string;
  signedMessage: string;
}

// Generate a LiveKit access token via server API
export async function generateLiveKitToken(request: LiveKitTokenRequest): Promise<string> {
  try {
    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to generate LiveKit token');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    throw new Error('Failed to generate authentication token for streaming');
  }
}

// Connect to a LiveKit room as a publisher (streamer)
export async function connectAsPublisher(streamConfig: StreamConfig): Promise<Room> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
      simulcast: true,
      videoCodec: 'vp8',
    },
  });

  await room.connect(LIVEKIT_URL, streamConfig.token, {
    autoSubscribe: true,
  });

  return room;
}

// Connect to a LiveKit room as a viewer
export async function connectAsViewer(streamConfig: StreamConfig): Promise<Room> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  await room.connect(LIVEKIT_URL, streamConfig.token, {
    autoSubscribe: true,
  });

  return room;
}

// Start publishing camera and microphone
export async function startPublishing(room: Room): Promise<void> {
  try {
    // Create local tracks
    const tracks = await createLocalTracks({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        resolution: { width: 1920, height: 1080 },
        frameRate: 30,
      },
    });

    // Publish tracks to the room
    await Promise.all(
      tracks.map(track => room.localParticipant.publishTrack(track))
    );

    console.log('Successfully started publishing audio and video');
  } catch (error) {
    console.error('Error starting to publish:', error);
    throw error;
  }
}

// Stop publishing (mute/unpublish tracks)
export async function stopPublishing(room: Room): Promise<void> {
  try {
    // Unpublish all tracks
    room.localParticipant.audioTrackPublications.forEach(pub => {
      room.localParticipant.unpublishTrack(pub.track!);
    });
    
    room.localParticipant.videoTrackPublications.forEach(pub => {
      room.localParticipant.unpublishTrack(pub.track!);
    });

    console.log('Successfully stopped publishing');
  } catch (error) {
    console.error('Error stopping publishing:', error);
    throw error;
  }
}

// Get media devices
export async function getMediaDevices(): Promise<{
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      cameras: devices.filter(device => device.kind === 'videoinput'),
      microphones: devices.filter(device => device.kind === 'audioinput'),
    };
  } catch (error) {
    console.error('Error getting media devices:', error);
    return { cameras: [], microphones: [] };
  }
}

// Check if browser supports WebRTC
export function isWebRTCSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    window.RTCPeerConnection
  );
}

// Request camera and microphone permissions
export async function requestMediaPermissions(): Promise<{
  camera: boolean;
  microphone: boolean;
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    
    // Stop all tracks to release the devices
    stream.getTracks().forEach(track => track.stop());
    
    return { camera: true, microphone: true };
  } catch (error) {
    console.error('Error requesting media permissions:', error);
    
    // Try to get individual permissions
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoStream.getTracks().forEach(track => track.stop());
      
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => track.stop());
        return { camera: true, microphone: true };
      } catch {
        return { camera: true, microphone: false };
      }
    } catch {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => track.stop());
        return { camera: false, microphone: true };
      } catch {
        return { camera: false, microphone: false };
      }
    }
  }
}

// Room event handlers
export interface RoomEventHandlers {
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onTrackSubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onTrackUnsubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onConnectionStateChanged?: (state: string) => void;
  onDisconnected?: () => void;
}

export function setupRoomEventHandlers(room: Room, handlers: RoomEventHandlers): void {
  if (handlers.onParticipantConnected) {
    room.on('participantConnected', handlers.onParticipantConnected);
  }
  
  if (handlers.onParticipantDisconnected) {
    room.on('participantDisconnected', handlers.onParticipantDisconnected);
  }
  
  if (handlers.onTrackSubscribed) {
    room.on('trackSubscribed', handlers.onTrackSubscribed);
  }
  
  if (handlers.onTrackUnsubscribed) {
    room.on('trackUnsubscribed', handlers.onTrackUnsubscribed);
  }
  
  if (handlers.onConnectionStateChanged) {
    room.on('connectionStateChanged', (state) => handlers.onConnectionStateChanged!(state.toString()));
  }
  
  if (handlers.onDisconnected) {
    room.on('disconnected', handlers.onDisconnected);
  }
}

// Cleanup room and disconnect
export async function disconnectRoom(room: Room): Promise<void> {
  try {
    await room.disconnect();
    console.log('Successfully disconnected from room');
  } catch (error) {
    console.error('Error disconnecting from room:', error);
  }
}