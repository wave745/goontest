
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

export async function verifyTransaction(
  signature: string, 
  expectedSender: string, 
  expectedRecipient: string, 
  expectedAmountLamports: number
): Promise<boolean> {
  try {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });
    
    if (!transaction) {
      console.error(`Transaction not found: ${signature}`);
      return false;
    }

    // Check if transaction is confirmed
    if (transaction.meta?.err) {
      console.error(`Transaction failed: ${signature}`, transaction.meta.err);
      return false;
    }

    // Find the SystemProgram transfer instruction
    const instruction = transaction.transaction.message.instructions.find(ix => {
      const programId = transaction.transaction.message.accountKeys[ix.programIdIndex];
      return programId.equals(new PublicKey('11111111111111111111111111111111')); // SystemProgram ID (correct)
    });

    if (!instruction) {
      console.error(`No SystemProgram transfer found in transaction: ${signature}`);
      return false;
    }

    // Get account keys from transaction
    const accountKeys = transaction.transaction.message.accountKeys;
    const fromAccount = accountKeys[instruction.accounts[0]];
    const toAccount = accountKeys[instruction.accounts[1]];

    // Verify sender and recipient
    if (fromAccount.toString() !== expectedSender) {
      console.error(`Sender mismatch: expected ${expectedSender}, got ${fromAccount.toString()}`);
      return false;
    }

    if (toAccount.toString() !== expectedRecipient) {
      console.error(`Recipient mismatch: expected ${expectedRecipient}, got ${toAccount.toString()}`);
      return false;
    }

    // Verify amount (check balance changes)
    const balanceChanges = transaction.meta?.postBalances.map((post, i) => 
      post - (transaction.meta?.preBalances[i] || 0)
    );
    
    const recipientIndex = accountKeys.findIndex(key => key.toString() === expectedRecipient);
    const senderIndex = accountKeys.findIndex(key => key.toString() === expectedSender);
    
    if (recipientIndex === -1 || senderIndex === -1) {
      console.error(`Account not found in transaction: ${signature}`);
      return false;
    }

    const recipientChange = balanceChanges[recipientIndex] || 0;
    const senderChange = balanceChanges[senderIndex] || 0;

    // Recipient should gain the expected amount, sender should lose more (due to fees)
    if (recipientChange !== expectedAmountLamports || senderChange >= 0) {
      console.error(`Amount mismatch: expected recipient +${expectedAmountLamports}, got +${recipientChange}`);
      return false;
    }

    return true;
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
