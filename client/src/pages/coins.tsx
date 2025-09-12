import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Coins as CoinsIcon, Copy, ExternalLink, CheckCircle, TrendingUp, TrendingDown, Wallet, Plus, ArrowUpDown, History, Star } from 'lucide-react';

interface MintDisplayProps {
  mintAddress: string;
}

interface TokenBalance {
  mint: string;
  name: string;
  symbol: string;
  balance: number;
  price: number;
  change24h: number;
  imageUrl?: string;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'transfer';
  token: string;
  amount: number;
  price: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

// Real data from API - temporarily disabled until API endpoints are ready
const tokenBalances: TokenBalance[] = [];
const transactions: Transaction[] = [];
const balancesLoading = false;
const transactionsLoading = false;

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
  const { publicKey, signTransaction, connected } = useWallet();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [symbol] = useState('GOON');
  const [supply, setSupply] = useState(1000000);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('portfolio');

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
      
      // Get real mint address from API response
      const response = await fetch('/api/tokens/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, symbol, description, imageUrl })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMintAddress(data.mintAddress);
      } else {
        throw new Error('Failed to create token');
      }

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

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent to-accent-2 rounded-full mb-4">
                <CoinsIcon className="h-8 w-8 text-accent-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">GOON Coins</h1>
              <p className="text-muted-foreground mb-6">Connect your wallet to manage your GOON tokens</p>
              <Button className="btn-goon">Connect Wallet</Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">GOON Coins</h1>
                <p className="text-sm md:text-base text-muted-foreground">Manage your GOON tokens and trading</p>
              </div>
              <Button 
                onClick={() => setActiveTab('launch')}
                className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Launch New Token
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto">
                <TabsList className="grid w-full grid-cols-4 bg-muted/10 min-w-[400px]">
                  <TabsTrigger value="portfolio" className="text-xs sm:text-sm">Portfolio</TabsTrigger>
                  <TabsTrigger value="trading" className="text-xs sm:text-sm">Trading</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
                  <TabsTrigger value="launch" className="text-xs sm:text-sm">Launch</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="portfolio" className="mt-4 md:mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-6 w-6 md:h-8 md:w-8 text-accent" />
                        <div>
                          <p className="text-xl md:text-2xl font-bold text-foreground">{tokenBalances || [].length}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">Tokens Owned</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                        <div>
                          <p className="text-xl md:text-2xl font-bold text-foreground">
                            ${tokenBalances || [].reduce((total, token) => total + (token.balance * token.price), 0).toFixed(2)}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">Total Value</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border sm:col-span-2 lg:col-span-1">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3">
                        <Star className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
                        <div>
                          <p className="text-xl md:text-2xl font-bold text-foreground">
                            {tokenBalances || [].reduce((total, token) => total + token.balance, 0).toLocaleString()}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">Total Tokens</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Your Token Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tokenBalances || [].map((token) => (
                        <div key={token.mint} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
                              <CoinsIcon className="h-6 w-6 text-accent-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{token.name}</h3>
                              <p className="text-sm text-muted-foreground">{token.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {token.balance.toLocaleString()} {token.symbol}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">
                                ${(token.balance * token.price).toFixed(2)}
                              </p>
                              <Badge variant={token.change24h >= 0 ? "default" : "destructive"} className="text-xs">
                                {token.change24h >= 0 ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {Math.abs(token.change24h).toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trading" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <ArrowUpDown className="h-5 w-5" />
                      Token Trading
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <ArrowUpDown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Trading Interface</h3>
                      <p className="text-muted-foreground">Token trading features coming soon!</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Transaction History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {transactions || [].map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              {tx.type === 'buy' ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground capitalize">{tx.type} {tx.token}</p>
                              <p className="text-sm text-muted-foreground">
                                {tx.timestamp.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {tx.amount.toLocaleString()} {tx.token.split('Goon')[0]}GOON
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ${(tx.amount * tx.price).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="launch" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <CoinsIcon className="h-5 w-5 text-accent" />
                      Launch New GOON Token
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

                    {mintAddress && <MintDisplay mintAddress={mintAddress} />}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
