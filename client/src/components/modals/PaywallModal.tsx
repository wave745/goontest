import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Star, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Post } from '@shared/schema';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: Post & { creator: { handle: string; avatar_url?: string } };
  onUnlock?: () => void;
}

export default function PaywallModal({ isOpen, onClose, post, onUnlock }: PaywallModalProps) {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async () => {
    if (!connected || !publicKey || !post) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsUnlocking(true);
    try {
      // TODO: Implement actual Solana payment transaction
      const response = await fetch('/api/posts/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          userPubkey: publicKey.toBase58(),
        }),
      });

      if (!response.ok) throw new Error('Failed to unlock content');

      toast({
        title: "Content Unlocked!",
        description: `Successfully unlocked for ${(post.price_lamports / 1e9).toFixed(3)} SOL`,
      });
      
      onUnlock?.();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlock content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  if (!post) return null;

  const priceSOL = post.price_lamports / 1e9;
  const priceUSD = priceSOL * 47; // Mock exchange rate

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md" data-testid="modal-paywall">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-2 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-accent-foreground h-8 w-8" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-foreground mb-2">Unlock Premium Content</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Get access to exclusive content from this creator</p>
        </div>

        {/* Content Preview */}
        <div className="rounded-lg overflow-hidden mb-4 relative">
          <img 
            src={post.thumb_url} 
            alt="Content preview" 
            className="w-full h-32 object-cover blur-sm" 
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-semibold">Unlock to view</span>
          </div>
        </div>

        {/* Pricing Options */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 bg-accent/10 border border-accent/30 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Single Purchase</p>
              <p className="text-xs text-muted-foreground">One-time access</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-accent">{priceSOL.toFixed(3)} SOL</p>
              <p className="text-xs text-muted-foreground">≈ ${priceUSD.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/10 border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">Creator Subscription</p>
              <p className="text-xs text-muted-foreground">All content + perks</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">0.5 SOL/month</p>
              <p className="text-xs text-muted-foreground">≈ $23.50</p>
            </div>
          </div>
        </div>

        {/* Payment Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleUnlock}
            disabled={!connected || isUnlocking}
            className="w-full btn-goon"
            data-testid="button-unlock-content"
          >
            <Lock className="mr-2 h-4 w-4" />
            {isUnlocking ? 'Unlocking...' : `Unlock for ${priceSOL.toFixed(3)} SOL`}
          </Button>
          
          <Button
            variant="outline"
            className="w-full bg-card border-border text-card-foreground hover:bg-accent/10"
            data-testid="button-subscribe-creator"
          >
            <Star className="mr-2 h-4 w-4" />
            Subscribe to Creator
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          <Coins className="inline h-3 w-3 mr-1" />
          Secure payment via Solana blockchain
        </p>
      </DialogContent>
    </Dialog>
  );
}
