import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Coins, Wallet, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { solanaService } from '@/lib/solana';
import { getCurrentUser } from '@/lib/userManager';

interface ReactionButtonsProps {
  postId: string;
  likes: number;
  isLiked?: boolean;
  solanaAddress?: string;
  onLike?: (postId: string) => void;
  onTip?: (postId: string, amount: number) => void;
}

export default function ReactionButtons({ 
  postId, 
  likes, 
  isLiked = false, 
  solanaAddress,
  onLike,
  onTip 
}: ReactionButtonsProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isTipping, setIsTipping] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (onLike) {
        onLike(postId);
      }
      
      toast({
        title: "Liked!",
        description: "Thanks for the like!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleTip = async () => {
    if (!solanaAddress) {
      toast({
        title: "No tip address",
        description: "This creator hasn't set up a tip address",
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

    setIsTipping(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Connect wallet if not connected
      if (!solanaService.isConnected()) {
        await solanaService.connectWallet();
      }

      // Send tip via Solana
      const transactionSignature = await solanaService.sendTip({
        fromAddress: solanaService.getPublicKey()!,
        toAddress: solanaAddress,
        amount: parseFloat(tipAmount),
        message: `Tip for post ${postId}`
      });

      // Record tip in backend
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user: currentUser.id,
          to_user: solanaAddress, // This should be the creator's user ID, not address
          amount_lamports: Math.round(parseFloat(tipAmount) * 1e9),
          message: `Tip for post ${postId}`,
          txn_sig: transactionSignature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record tip');
      }
      
      if (onTip) {
        onTip(postId, parseFloat(tipAmount));
      }
      
      toast({
        title: "Tip sent!",
        description: `You tipped ${tipAmount} SOL to the creator`,
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTipModal(true)}
          className="flex items-center gap-1 text-muted-foreground hover:text-accent"
        >
          <Coins className="h-4 w-4" />
          <span className="text-xs">Tip</span>
        </Button>

      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Send Tip</h3>
            <div className="space-y-4">
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
                <p>You'll need to sign the transaction with your wallet</p>
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
