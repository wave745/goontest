import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Gift, 
  Wallet, 
  DollarSign, 
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TipButtonProps {
  streamerId?: string;
  streamerAddress?: string;
  streamerName?: string;
  onTipSent?: (amount: number, signature: string) => void;
  className?: string;
}

const QUICK_TIP_AMOUNTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0];

export default function TipButton({ 
  streamerId, 
  streamerAddress, 
  streamerName = 'Streamer',
  onTipSent,
  className 
}: TipButtonProps) {
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [lastTipSignature, setLastTipSignature] = useState<string | null>(null);

  // Solana connection (using devnet for demo)
  const connection = new Connection('https://api.devnet.solana.com');

  const validateStreamerAddress = (address?: string): boolean => {
    if (!address) return false;
    
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const sendTip = async (amount: number) => {
    if (!connected || !publicKey || !signTransaction || !sendTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your Solana wallet to send tips",
        variant: "destructive",
      });
      return;
    }

    if (!validateStreamerAddress(streamerAddress)) {
      toast({
        title: "Invalid streamer address",
        description: "The streamer's Solana address is not valid",
        variant: "destructive",
      });
      return;
    }

    if (amount <= 0 || amount > 10) {
      toast({
        title: "Invalid amount",
        description: "Tip amount must be between 0.01 and 10 SOL",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const recipientPublicKey = new PublicKey(streamerAddress!);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPublicKey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign and send transaction
      const signedTransaction = await signTransaction(transaction);
      const signature = await sendTransaction(signedTransaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      setLastTipSignature(signature);
      onTipSent?.(amount, signature);

      toast({
        title: "Tip sent successfully! 🎉",
        description: `Sent ${amount} SOL to ${streamerName}`,
      });

      // Close dialog and reset form
      setIsOpen(false);
      setCustomAmount('');
      setSelectedAmount(null);

    } catch (error) {
      console.error('Error sending tip:', error);
      
      let errorMessage = 'Failed to send tip. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient SOL balance to send this tip.';
        } else if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was cancelled.';
        }
      }

      toast({
        title: "Tip failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickTip = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getFinalAmount = (): number | null => {
    if (selectedAmount !== null) return selectedAmount;
    if (customAmount) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const isValidAmount = (): boolean => {
    const amount = getFinalAmount();
    return amount !== null && amount > 0 && amount <= 10;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className={`bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white ${className}`}
          data-testid="button-open-tip-dialog"
        >
          <Gift className="h-4 w-4 mr-2" />
          Send Tip
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-500" />
            Send Tip to {streamerName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Wallet Status */}
          <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">
              {connected ? (
                <span className="text-green-600 dark:text-green-400">
                  Wallet Connected: {publicKey?.toBase58().slice(0, 8)}...
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  Wallet Not Connected
                </span>
              )}
            </span>
          </div>

          {/* Streamer Address Validation */}
          {streamerAddress && (
            <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
              {validateStreamerAddress(streamerAddress) ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Valid recipient address
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Invalid recipient address
                  </span>
                </>
              )}
            </div>
          )}

          {/* Quick Amounts */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quick Amounts (SOL)</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_TIP_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickTip(amount)}
                  disabled={isSending}
                  data-testid={`button-quick-tip-${amount}`}
                >
                  {amount} SOL
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <Label htmlFor="custom-amount" className="text-sm font-medium mb-2 block">
              Custom Amount (SOL)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="custom-amount"
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="pl-9"
                min="0.01"
                max="10"
                step="0.01"
                disabled={isSending}
                data-testid="input-custom-tip-amount"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Minimum: 0.01 SOL • Maximum: 10 SOL
            </p>
          </div>

          {/* Summary */}
          {getFinalAmount() && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Tip Amount:</span>
                  <span className="font-medium">{getFinalAmount()} SOL</span>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Network fees:</span>
                  <span>~0.00025 SOL</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSending}
              className="flex-1"
              data-testid="button-cancel-tip"
            >
              Cancel
            </Button>
            <Button
              onClick={() => getFinalAmount() && sendTip(getFinalAmount()!)}
              disabled={!connected || !isValidAmount() || isSending || !validateStreamerAddress(streamerAddress)}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              data-testid="button-confirm-tip"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Send Tip
                </>
              )}
            </Button>
          </div>

          {/* Last Transaction */}
          {lastTipSignature && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Last tip sent successfully!</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Transaction:</span>
                <code className="text-xs bg-background px-1 rounded">
                  {lastTipSignature.slice(0, 8)}...{lastTipSignature.slice(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => window.open(`https://explorer.solana.com/tx/${lastTipSignature}?cluster=devnet`, '_blank')}
                  data-testid="button-view-transaction"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}