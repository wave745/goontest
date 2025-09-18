import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Coins, Wallet, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { solanaService } from '@/lib/solana';
import { getCurrentUser } from '@/lib/userManager';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey
} from '@solana/web3.js';

interface ReactionButtonsProps {
  postId: string;
  likes: number;
  isLiked?: boolean;
  solanaAddress?: string;
  creatorId?: string;
  onLike?: (postId: string) => void;
  onTip?: (postId: string, amount: number) => void;
}

export default function ReactionButtons({ 
  postId, 
  likes, 
  isLiked = false, 
  solanaAddress,
  creatorId,
  onLike,
  onTip 
}: ReactionButtonsProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isTipping, setIsTipping] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('Please refresh the page to continue');
      }

      // Make actual API call to like/unlike the post
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/posts/${postId}/like`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to like post');
      }
      
      if (onLike) {
        onLike(postId);
      }
    } catch (error) {
      console.error('Failed to like post:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to like post",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleTip = async () => {
    if (!connected || !publicKey || !sendTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to send tips",
        variant: "destructive",
      });
      return;
    }

    if (!creatorId) {
      toast({
        title: "Creator not found",
        description: "Unable to identify the creator for tipping",
        variant: "destructive",
      });
      return;
    }

    if (!solanaAddress) {
      toast({
        title: "No tip address",
        description: "This creator hasn't set up a tip address",
        variant: "destructive",
      });
      return;
    }

    if (!solanaService.validateAddress(solanaAddress)) {
      toast({
        title: "Invalid address",
        description: "Creator has an invalid Solana address",
        variant: "destructive",
      });
      return;
    }

    if (!tipAmount || parseFloat(tipAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid tip amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(tipAmount);
    if (amount < 0.001) {
      toast({
        title: "Amount too small",
        description: "Minimum tip is 0.001 SOL",
        variant: "destructive",
      });
      return;
    }

    setIsTipping(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Check wallet balance first
      const balance = await connection.getBalance(publicKey);
      const balanceInSOL = balance / LAMPORTS_PER_SOL;
      
      if (balanceInSOL < amount + 0.001) { // Account for transaction fee
        throw new Error(`Insufficient balance. You have ${balanceInSOL.toFixed(4)} SOL`);
      }

      // Create transaction
      const fromPubkey = publicKey;
      const toPubkey = new PublicKey(solanaAddress);
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Send transaction using wallet adapter
      const transactionSignature = await sendTransaction(transaction, connection, {
        preflightCommitment: 'confirmed'
      });

      // Confirm transaction
      await connection.confirmTransaction({
        signature: transactionSignature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');
      
      // Record tip in backend
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user: currentUser.id,
          to_user: creatorId, // Use creator's user ID, not Solana address
          amount_lamports: lamports,
          message: `Tip for post ${postId}`,
          txn_sig: transactionSignature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record tip');
      }
      
      if (onTip) {
        onTip(postId, amount);
      }
      
      toast({
        title: "Tip sent!",
        description: `Successfully sent ${tipAmount} SOL to the creator`,
      });
      
      setShowTipModal(false);
      setTipAmount('');
    } catch (error) {
      console.error('Tip error:', error);
      toast({
        title: "Tip failed",
        description: error instanceof Error ? error.message : "Failed to send tip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={isLiking}
          className="flex items-center gap-1 text-muted-foreground hover:text-red-500"
        >
          {isLiking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          )}
          <span className="text-xs">{likes}</span>
        </Button>

        {connected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTipModal(true)}
            className="flex items-center gap-1 text-muted-foreground hover:text-accent"
          >
            <Coins className="h-4 w-4" />
            <span className="text-xs">Tip</span>
          </Button>
        ) : (
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="flex items-center gap-1 text-muted-foreground opacity-50"
            >
              <Coins className="h-4 w-4" />
              <span className="text-xs">Tip</span>
            </Button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Connect wallet to tip
            </div>
          </div>
        )}

      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Send Tip</h3>
            <div className="space-y-4">
              {!connected ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">Connect your wallet to send tips</p>
                  <WalletMultiButton className="!bg-accent !text-accent-foreground hover:!bg-accent/90" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium">Amount (SOL)</label>
                    <input
                      type="number"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      placeholder="0.01"
                      step="0.01"
                      min="0.001"
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Recipient: {solanaAddress?.slice(0, 8)}...{solanaAddress?.slice(-8)}</p>
                    <p>Network: Devnet (for testing)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTip}
                      disabled={isTipping || !tipAmount}
                      className="flex-1"
                    >
                      {isTipping ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Tip'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTipModal(false);
                        setTipAmount('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
