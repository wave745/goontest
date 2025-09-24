import { AccessToken } from 'livekit-server-sdk';
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
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;

export function generateLiveKitToken(
  streamId: string, 
  walletAddress: string, 
  participantName: string, 
  isPublisher: boolean
): string {
  // Create access token with wallet address as identity (prevents impersonation)
  const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
    identity: walletAddress, // Use wallet address as unique identity
    name: participantName,   // Display name can be different
    ttl: '5m',              // Short TTL for security (5 minutes)
    metadata: JSON.stringify({ // Add metadata for auditing
      streamId,
      role: isPublisher ? 'publisher' : 'viewer',
      issuedAt: Date.now()
    })
  });

  // Add grant with explicit token permissions (VideoGrant is now a plain object)
  at.addGrant({
    room: streamId,
    roomJoin: true,
    canPublish: isPublisher,
    canSubscribe: true,
    canPublishData: isPublisher,
  });

  return at.toJwt();
}