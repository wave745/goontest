import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export interface TipTransaction {
  fromAddress: string;
  toAddress: string;
  amount: number; // in SOL
  message?: string;
}

// Real Solana integration using existing wallet adapter
export class SolanaService {
  private static instance: SolanaService;
  private connection: Connection;

  constructor() {
    // Use the same network as WalletProvider
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    this.connection = new Connection(endpoint, 'confirmed');
  }

  static getInstance(): SolanaService {
    if (!SolanaService.instance) {
      SolanaService.instance = new SolanaService();
    }
    return SolanaService.instance;
  }

  async sendTip(tipData: TipTransaction, wallet: any): Promise<string> {
    if (!wallet?.publicKey || !wallet?.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Validate addresses
      const fromPubkey = new PublicKey(wallet.publicKey.toString());
      const toPubkey = new PublicKey(tipData.toAddress);
      
      // Convert SOL to lamports
      const lamports = Math.round(tipData.amount * LAMPORTS_PER_SOL);
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Sign transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
    } catch (error) {
      console.error('Failed to send tip:', error);
      throw error;
    }
  }

  async getBalance(publicKey: string): Promise<number> {
    try {
      const pubkey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

export const solanaService = SolanaService.getInstance();

