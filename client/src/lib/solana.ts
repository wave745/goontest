import { PublicKey } from '@solana/web3.js';

// Simple validation utility for Solana addresses  
export function validateSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// Create a simple solanaService object that matches the interface used by components
export const solanaService = {
  validateAddress: validateSolanaAddress
};

