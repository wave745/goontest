
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Pre-generated vanity keypairs pool (in production, this would be stored in database)
const vanityKeypairs = [
  '2BxkGHtRjyZp3Q7vL8sM9XN4JeRaKjWzDxYpGqNvgoon',
  '7A3kMpLqRzJx4Q8vN2sP6XY9JeRaKjWzDxYpGqNvgoon',
  '9CzpRxMqTjLp5Q7vL8sM3XN4JeRaKjWzDxYpGqNvgoon',
  // Add more pre-generated addresses as needed
];

export function validateSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export async function generateGoonToken(): Promise<string> {
  // In a real implementation, this would:
  // 1. Check for available pre-generated keypairs in database
  // 2. Mark one as used
  // 3. Return the mint address
  
  // For now, return a mock vanity address
  const randomIndex = Math.floor(Math.random() * vanityKeypairs.length);
  return vanityKeypairs[randomIndex];
}

export async function verifyTransaction(signature: string): Promise<boolean> {
  try {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });
    return transaction !== null;
  } catch (error) {
    console.error('Failed to verify transaction:', error);
    return false;
  }
}

export async function getWalletBalance(publicKey: string): Promise<number> {
  try {
    const pubkey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubkey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return 0;
  }
}
