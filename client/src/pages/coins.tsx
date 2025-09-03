import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { Coins as CoinsIcon, Copy, ExternalLink, CheckCircle } from 'lucide-react';

interface MintDisplayProps {
  mintAddress: string;
}

function MintDisplay({ mintAddress }: MintDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mintAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 p-4 bg-card border border-border rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <p className="text-sm font-medium text-foreground">GOON Coin Launched Successfully!</p>
      </div>
      <p className="text-sm text-muted-foreground mb-3">Mint Address:</p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-mono break-all bg-muted px-3 py-2 rounded-lg flex-1">
          {mintAddress}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={copyToClipboard}
          className="text-accent hover:text-accent-2"
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>
      <a 
        href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-2 transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        View on Solana Explorer
      </a>
    </div>
  );
}

export default function Coins() {
  const { publicKey, signTransaction } = useWallet();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [symbol] = useState('GOON');
  const [supply, setSupply] = useState(1000000);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [mintAddress, setMintAddress] = useState<string | null>(null);

  const launchCoin = async () => {
    if (!publicKey || !signTransaction) {
      toast({ 
        title: 'Error', 
        description: 'Please connect your wallet first!',
        variant: 'destructive'
      });
      return;
    }

    if (!name.trim()) {
      toast({ 
        title: 'Error', 
        description: 'Please enter a token name',
        variant: 'destructive'
      });
      return;
    }

    if (!name.toUpperCase().endsWith('GOON')) {
      toast({ 
        title: 'Error', 
        description: 'Token name must end with "GOON"',
        variant: 'destructive'
      });
      return;
    }

    if (supply <= 0) {
      toast({ 
        title: 'Error', 
        description: 'Supply must be greater than 0',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    toast({ 
      title: 'Launching GOON Coin', 
      description: 'Assigning pre-generated goon address...' 
    });

    try {
      // For now, we'll simulate the API call since we need to set up the backend
      // In a real implementation, this would call your API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      // Generate a mock mint address ending in "goon" for demonstration
      const mockMintAddress = `BkgPQZirJDceEp82JmguB7WFvomwqMwxdSSM9XfXgoon`;
      setMintAddress(mockMintAddress);

      toast({
        title: 'Success!',
        description: 'GOON coin launched successfully!',
      });

      // Reset form
      setName('');
      setSupply(1000000);
      setImageUrl('');

    } catch (error) {
      console.error('Error launching coin:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to launch GOON coin. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto p-6 pt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent to-accent-2 rounded-full mb-4">
            <CoinsIcon className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Launch GOON Coin</h1>
          <p className="text-muted-foreground">
            Create your own GOON token with a mint address ending in "goon"
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <CoinsIcon className="h-5 w-5 text-accent" />
              Token Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Token Name *
              </label>
              <Input
                placeholder="e.g., MyAwesomeGoon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-accent"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must end with "GOON"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Symbol
              </label>
              <Input
                value={symbol}
                disabled
                className="bg-muted border-border text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Fixed as "GOON"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Total Supply
              </label>
              <Input
                type="number"
                value={supply}
                onChange={(e) => setSupply(Number(e.target.value))}
                className="bg-input border-border text-foreground focus:border-accent"
                disabled={loading}
                min="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total number of tokens to mint
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Image URL (Optional)
              </label>
              <Input
                placeholder="https://example.com/token-image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-accent"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL to your token's logo or image
              </p>
            </div>

            <Button
              onClick={launchCoin}
              disabled={loading || !name.trim() || !publicKey}
              className="w-full btn-goon h-12 text-base font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Launching GOON Coin...
                </>
              ) : (
                <>
                  <CoinsIcon className="h-4 w-4 mr-2" />
                  Launch GOON Coin
                </>
              )}
            </Button>

            {!publicKey && (
              <p className="text-center text-sm text-muted-foreground">
                Connect your wallet to launch a GOON coin
              </p>
            )}
          </CardContent>
        </Card>

        {mintAddress && <MintDisplay mintAddress={mintAddress} />}
      </div>
    </div>
  );
}
