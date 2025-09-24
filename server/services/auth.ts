import { randomBytes } from 'crypto';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { storage } from '../storage/index.js';
import { type Request } from 'express';

// In-memory stores (use Redis in production for distributed systems)
const nonceStore = new Map<string, { nonce: string; expiresAt: number; streamId: string }>();

// Enhanced rate limiting with IP tracking
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface NonceRequest {
  walletAddress: string;
  streamId: string;
}

export interface NonceResponse {
  nonce: string;
  expiresAt: number;
}

// Get client IP for rate limiting
function getClientIP(req: Request): string {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

// Generate a nonce for wallet authentication with enhanced rate limiting
export function generateNonce(request: NonceRequest, clientIP: string): NonceResponse {
  const { walletAddress, streamId } = request;
  
  // Dual rate limiting: IP-based and wallet-based
  checkNonceRateLimit(clientIP, walletAddress);
  
  // Generate cryptographically secure nonce
  const nonce = randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + 300000; // 5 minutes
  
  // Store nonce with metadata
  const nonceKey = `${walletAddress}:${streamId}`;
  nonceStore.set(nonceKey, { nonce, expiresAt, streamId });
  
  // Clean up expired nonces
  cleanupExpiredNonces();
  
  return { nonce, expiresAt };
}

// Enhanced rate limiting with IP and wallet tracking
function checkNonceRateLimit(clientIP: string, walletAddress: string): void {
  const now = Date.now();
  
  // Rate limit by IP (5 per minute to prevent DoS)
  const ipKey = `nonce_ip:${clientIP}`;
  const ipLimit = rateLimitStore.get(ipKey);
  
  if (ipLimit) {
    if (now < ipLimit.resetAt) {
      if (ipLimit.count >= 5) {
        throw new Error('Rate limit exceeded. Too many requests from this IP.');
      }
      ipLimit.count++;
    } else {
      rateLimitStore.set(ipKey, { count: 1, resetAt: now + 60000 });
    }
  } else {
    rateLimitStore.set(ipKey, { count: 1, resetAt: now + 60000 });
  }
  
  // Rate limit by wallet (10 per minute per wallet)
  const walletKey = `nonce_wallet:${walletAddress}`;
  const walletLimit = rateLimitStore.get(walletKey);
  
  if (walletLimit) {
    if (now < walletLimit.resetAt) {
      if (walletLimit.count >= 10) {
        throw new Error('Rate limit exceeded. Too many nonce requests for this wallet.');
      }
      walletLimit.count++;
    } else {
      rateLimitStore.set(walletKey, { count: 1, resetAt: now + 60000 });
    }
  } else {
    rateLimitStore.set(walletKey, { count: 1, resetAt: now + 60000 });
  }
}

// Verify wallet signature against nonce
export function verifyWalletSignature(
  walletAddress: string, 
  streamId: string, 
  signedMessage: string
): boolean {
  try {
    // Retrieve and validate nonce
    const nonceKey = `${walletAddress}:${streamId}`;
    const nonceData = nonceStore.get(nonceKey);
    
    if (!nonceData) {
      throw new Error('No nonce found for this wallet and stream');
    }
    
    if (Date.now() > nonceData.expiresAt) {
      nonceStore.delete(nonceKey);
      throw new Error('Nonce has expired');
    }
    
    if (nonceData.streamId !== streamId) {
      throw new Error('Nonce not valid for this stream');
    }
    
    // Validate wallet address format
    const publicKey = new PublicKey(walletAddress);
    
    // Construct message that should have been signed
    const message = `Authenticate for stream: ${streamId}\nNonce: ${nonceData.nonce}\nTimestamp: ${nonceData.expiresAt}`;
    const messageBytes = new TextEncoder().encode(message);
    
    // Convert signature from base64 to bytes (standardized encoding)
    const signatureBytes = Buffer.from(signedMessage, 'base64');
    
    // Verify signature using ed25519
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
    
    if (isValid) {
      // Consume nonce (one-time use)
      nonceStore.delete(nonceKey);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// Check if user can publish to stream using canonical ownership
export async function canUserPublish(streamId: string, walletAddress: string): Promise<boolean> {
  try {
    // Fetch stream by ID to get canonical ownership
    const stream = await storage.getPost(streamId);
    
    if (!stream || !stream.is_live) {
      return false; // Stream doesn't exist or isn't a live stream
    }
    
    // Check canonical owner_wallet field (server-set, trusted)
    return stream.owner_wallet === walletAddress;
    
  } catch (error) {
    console.error('Error checking stream ownership:', error);
    return false;
  }
}

// Validate stream access using proper post lookup
export async function validateStreamAccess(streamId: string, walletAddress?: string): Promise<boolean> {
  try {
    // Fetch post/stream by ID for proper access control
    const stream = await storage.getPost(streamId);
    
    if (!stream) {
      return false; // Stream doesn't exist
    }
    
    // Only allow access to claimed streams (with owner_wallet set) to prevent spam/abuse
    if (!stream.owner_wallet) {
      return false; // Prevent access to unclaimed streams
    }
    
    // If stream has ended, only allow access if user owns it
    if (stream.ended_at) {
      return walletAddress === stream.owner_wallet;
    }
    
    // If stream is live, accessible to all (but only for claimed streams)
    if (stream.is_live) {
      return true;
    }
    
    // Non-live streams also require ownership
    return walletAddress === stream.owner_wallet;
    
  } catch (error) {
    console.error('Error validating stream access:', error);
    return false;
  }
}

// Clean up expired nonces (should run periodically)
function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [key, data] of nonceStore.entries()) {
    if (now > data.expiresAt) {
      nonceStore.delete(key);
    }
  }
}

// Rate limiting for token requests (wallet-based)
export function checkTokenRateLimit(walletAddress: string): boolean {
  const rateLimitKey = `token_wallet:${walletAddress}`;
  const now = Date.now();
  const limit = rateLimitStore.get(rateLimitKey);
  
  if (limit) {
    if (now < limit.resetAt) {
      if (limit.count >= 20) { // 20 tokens per minute per wallet
        return false;
      }
      limit.count++;
    } else {
      rateLimitStore.set(rateLimitKey, { count: 1, resetAt: now + 60000 });
    }
  } else {
    rateLimitStore.set(rateLimitKey, { count: 1, resetAt: now + 60000 });
  }
  
  return true;
}

// Rate limiting for token requests (IP-based)
export function checkTokenRateLimitByIP(clientIP: string): boolean {
  const rateLimitKey = `token_ip:${clientIP}`;
  const now = Date.now();
  const limit = rateLimitStore.get(rateLimitKey);
  
  if (limit) {
    if (now < limit.resetAt) {
      if (limit.count >= 30) { // 30 tokens per minute per IP
        return false;
      }
      limit.count++;
    } else {
      rateLimitStore.set(rateLimitKey, { count: 1, resetAt: now + 60000 });
    }
  } else {
    rateLimitStore.set(rateLimitKey, { count: 1, resetAt: now + 60000 });
  }
  
  return true;
}