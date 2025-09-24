import { AccessToken, VideoGrant } from 'livekit-server-sdk';
import { z } from 'zod';

// LiveKit configuration - require environment variables for security
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  throw new Error('Missing required LiveKit environment variables: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL');
}

// Validated token request schema
export const tokenRequestSchema = z.object({
  streamId: z.string().min(1, 'Stream ID is required'),
  participantName: z.string().min(1, 'Participant name is required'),
  walletAddress: z.string().min(1, 'Wallet address is required'),
  signedMessage: z.string().min(1, 'Signed message is required'), // For authentication
  role: z.enum(['viewer']).default('viewer'), // Only viewers can be requested from client
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;

// Server-side function to determine if user can publish (must be called server-side only)
export async function canUserPublish(streamId: string, walletAddress: string): Promise<boolean> {
  // TODO: Implement proper authorization logic
  // Check if walletAddress owns this stream or has permission to publish
  // This could check against your stream metadata in Supabase
  
  // For now, this is a placeholder - you would implement:
  // 1. Check if walletAddress created this stream
  // 2. Check if walletAddress is authorized to publish to this stream
  // 3. Verify the signed message to prevent spoofing
  
  return false; // Default to viewer-only for security
}

export function generateLiveKitToken(streamId: string, participantName: string, isPublisher: boolean): string {
  // Create access token with proper VideoGrant
  const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
    identity: participantName,
    name: participantName,
  });

  // Use VideoGrant for explicit token permissions
  const grant = new VideoGrant({
    room: streamId,
    roomJoin: true,
    canPublish: isPublisher,
    canSubscribe: true,
    canPublishData: isPublisher,
  });

  at.addGrant(grant);
  return at.toJwt();
}