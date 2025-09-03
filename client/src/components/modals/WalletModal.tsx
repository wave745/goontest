import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { select, wallets, connected } = useWallet();
  const [ageVerified, setAgeVerified] = useState(false);

  const handleWalletSelect = (walletName: string) => {
    if (!ageVerified) return;
    
    const wallet = wallets.find(w => w.adapter.name === walletName);
    if (wallet) {
      select(wallet.adapter.name);
      onClose();
    }
  };

  if (connected) {
    onClose();
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md" data-testid="modal-wallet">
        <DialogHeader>
          <DialogTitle className="text-foreground mb-2">Connect Your Wallet</DialogTitle>
          <p className="text-sm text-muted-foreground">Choose your preferred Solana wallet</p>
        </DialogHeader>

        <div className="space-y-3 mb-6">
          {wallets.map((wallet) => (
            <Button
              key={wallet.adapter.name}
              onClick={() => handleWalletSelect(wallet.adapter.name)}
              disabled={!ageVerified}
              variant="outline"
              className="w-full flex items-center gap-4 p-4 bg-muted/10 border-border hover:bg-accent/10 hover:border-accent/30 h-auto"
              data-testid={`button-connect-${wallet.adapter.name.toLowerCase()}`}
            >
              <img 
                src={wallet.adapter.icon} 
                alt={wallet.adapter.name} 
                className="w-10 h-10 rounded-lg" 
              />
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">{wallet.adapter.name}</p>
                <p className="text-xs text-muted-foreground">Connect with {wallet.adapter.name}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Button>
          ))}
        </div>

        {/* Age Verification */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Age Verification Required</p>
              <p className="text-xs text-muted-foreground">
                You must be 18+ to access this platform. By connecting your wallet, you confirm you meet the age requirement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <Checkbox
            id="ageVerification"
            checked={ageVerified}
            onCheckedChange={(checked) => setAgeVerified(checked as boolean)}
            className="mt-1"
            data-testid="checkbox-age-verification"
          />
          <Label htmlFor="ageVerification" className="text-xs text-muted-foreground">
            I confirm that I am 18 years or older and agree to the{' '}
            <a href="#" className="text-accent hover:underline">Terms of Service</a> and{' '}
            <a href="#" className="text-accent hover:underline">Privacy Policy</a>
          </Label>
        </div>

        <Button
          disabled={!ageVerified}
          className="w-full bg-muted/20 text-muted-foreground cursor-not-allowed"
          data-testid="button-wallet-continue"
        >
          {ageVerified ? 'Select a wallet to continue' : 'Please verify your age to continue'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
