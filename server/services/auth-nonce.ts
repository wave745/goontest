import { z } from 'zod';

// Zod schema for nonce requests
export const nonceRequestSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
  streamId: z.string().min(1, 'Stream ID is required'),
});

export type NonceRequest = z.infer<typeof nonceRequestSchema>;