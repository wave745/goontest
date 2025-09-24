import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapter } from '@solana/wallet-adapter-base';

// Solana network configuration
const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export interface TipTransaction {
  amount: number; // in SOL
  fromWallet: string;
  toWallet: string;
  signature?: string;
  streamId?: string;
  message?: string;
}

export interface TipResult {
  success: boolean;
  signature?: string;
  error?: string;
}

// Create Solana connection
export function createConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed');
}

// Convert SOL to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

// Convert lamports to SOL
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

// Send a tip transaction
export async function sendTip(
  wallet: WalletAdapter,
  recipientAddress: string,
  amountSOL: number,
  connection?: Connection
): Promise<TipResult> {
  try {
    if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) {
      throw new Error('Wallet not connected');
    }

    // Validate recipient address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipientAddress);
    } catch (error) {
      throw new Error('Invalid recipient address');
    }

    // Validate amount
    if (amountSOL <= 0) {
      throw new Error('Tip amount must be greater than 0');
    }

    const conn = connection || createConnection();
    const lamports = solToLamports(amountSOL);

    // Check sender balance
    const balance = await conn.getBalance(wallet.publicKey);
    if (balance < lamports) {
      throw new Error('Insufficient balance');
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    // Get latest blockhash
    const { blockhash } = await conn.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Send transaction
    const signature = await wallet.sendTransaction(transaction, conn);

    // Wait for confirmation
    await conn.confirmTransaction(signature, 'confirmed');

    return {
      success: true,
      signature,
    };

  } catch (error) {
    console.error('Error sending tip:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send tip',
    };
  }
}

// Get wallet balance
export async function getWalletBalance(
  publicKey: PublicKey,
  connection?: Connection
): Promise<number> {
  try {
    const conn = connection || createConnection();
    const balance = await conn.getBalance(publicKey);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
}

// Validate Solana address
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// Get transaction details
export async function getTransactionDetails(
  signature: string,
  connection?: Connection
): Promise<any> {
  try {
    const conn = connection || createConnection();
    const transaction = await conn.getTransaction(signature, {
      commitment: 'confirmed',
    });
    return transaction;
  } catch (error) {
    console.error('Error getting transaction details:', error);
    return null;
  }
}

// Format SOL amount for display
export function formatSOL(amount: number, decimals: number = 4): string {
  return amount.toFixed(decimals);
}

// Common tip amounts (in SOL)
export const COMMON_TIP_AMOUNTS = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];

// Estimate transaction fee
export async function estimateTransactionFee(
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  lamports: number,
  connection?: Connection
): Promise<number> {
  try {
    const conn = connection || createConnection();
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );

    const { blockhash } = await conn.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const fee = await conn.getFeeForMessage(transaction.compileMessage());
    return fee?.value || 5000; // Default fee if estimation fails
  } catch (error) {
    console.error('Error estimating transaction fee:', error);
    return 5000; // Default fee in lamports
  }
}

// Create tip memo instruction (optional - for tracking tips)
export function createTipMemo(streamId: string, message?: string): string {
  const memo = {
    type: 'tip',
    streamId,
    message: message || '',
    timestamp: Date.now(),
  };
  return JSON.stringify(memo);
}

// Shortcut function for common tipping scenarios
export async function quickTip(
  wallet: WalletAdapter,
  recipientAddress: string,
  amount: number
): Promise<TipResult> {
  return sendTip(wallet, recipientAddress, amount);
}

// Batch multiple tips (advanced feature)
export async function sendBatchTips(
  wallet: WalletAdapter,
  tips: Array<{ recipient: string; amount: number }>,
  connection?: Connection
): Promise<TipResult[]> {
  const results: TipResult[] = [];
  
  for (const tip of tips) {
    const result = await sendTip(wallet, tip.recipient, tip.amount, connection);
    results.push(result);
    
    // Add small delay between transactions to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}