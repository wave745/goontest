import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlaneTakeoff, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Tipping disabled - component kept for compatibility but non-functional
}

export default function TipModal({ isOpen, onClose, creator }: TipModalProps) {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const predefinedAmounts = [0.01, 0.05, 0.1];

  const handleTip = async () => {
    if (!connected || !publicKey || !creator) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid tip amount",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement actual Solana transaction
      toast({
        title: "Tip Sent!",
        description: `Tipping is disabled on this anonymous platform`,
        variant: "destructive",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send tip. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md" data-testid="modal-tip">
        <DialogHeader>
          <DialogTitle className="text-foreground">Send Tip</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-4">
          <img
            src="/placeholder-avatar.jpg"
            alt="Anonymous Creator"
            className="w-12 h-12 rounded-full"
          />
          <div>
            <p className="font-medium text-foreground">@Anonymous</p>
            <p className="text-sm text-muted-foreground">Tipping Disabled</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-foreground mb-2">Amount</Label>
            <div className="flex gap-2 mb-3">
              {predefinedAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  className={selectedAmount === amount ? 'bg-accent/20 border-accent/30 text-accent' : ''}
                  data-testid={`button-tip-${amount}`}
                >
                  {amount} SOL
                </Button>
              ))}
            </div>
            
            <div className="relative">
              <Input
                type="number"
                step="0.001"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                className="bg-input border-border text-foreground pr-12"
                data-testid="input-custom-tip"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                SOL
              </span>
            </div>
          </div>

          <div>
            <Label className="text-foreground mb-2">Message (Optional)</Label>
            <Textarea
              placeholder="Say something nice..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-input border-border text-foreground resize-none"
              rows={3}
              data-testid="textarea-tip-message"
            />
          </div>

          <Button 
            onClick={() => toast({ title: "Tipping Disabled", description: "Tipping is not available on this anonymous platform", variant: "destructive" })}
            className="w-full btn-goon"
            disabled={true}
            data-testid="button-send-tip"
          >
            <PlaneTakeoff className="mr-2 h-4 w-4" />
            Tipping Disabled
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          <Coins className="inline h-3 w-3 mr-1" />
          Secure payment via Solana blockchain
        </p>
      </DialogContent>
    </Dialog>
  );
}
