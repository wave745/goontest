import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Link, useLocation } from 'wouter';
import { Upload, Coins, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from './SearchBar';
import UploadDialog from './UploadDialog';

export default function Header() {
  const { connected, publicKey } = useWallet();
  const [location] = useLocation();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-xs">GH</span>
            </div>
            <div className="flex items-center text-xl font-bold">
              <span className="text-white font-black">Goon</span>
              <span className="bg-accent text-black px-3 py-1 rounded-md font-black ml-1">Hub</span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center gap-4">
            <Link href="/creators" className={`hover:text-accent transition-colors ${location === '/creators' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-creators">
              Creators
            </Link>
            <Link href="/studio" className={`hover:text-accent transition-colors ${location === '/studio' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-studio">
              Studio
            </Link>
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            <Link href="/creators" className="p-2 text-muted-foreground hover:text-accent transition-colors rounded-lg hover:bg-accent/10" data-testid="link-creators-mobile">
              <Users className="h-5 w-5" />
            </Link>
            <Link href="/studio" className="p-2 text-muted-foreground hover:text-accent transition-colors rounded-lg hover:bg-accent/10" data-testid="link-studio-mobile">
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Search Bar */}
          <div className="hidden md:block">
            <SearchBar 
              className="w-64" 
              placeholder="Search creators, posts..."
            />
          </div>
          
          {/* Mobile Search */}
          <div className="md:hidden">
            <SearchBar 
              className="w-32" 
              placeholder="Search..."
            />
          </div>

          {connected && (
            <>
              {/* Mobile Action Buttons */}
              <div className="md:hidden flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2 h-9 w-9 bg-card border-border hover:bg-accent/10"
                  data-testid="button-upload-mobile"
                  onClick={() => setIsUploadDialogOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Link href="/coins">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-9 w-9 btn-goon"
                    data-testid="button-launch-coin-mobile"
                  >
                    <Coins className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              {/* Desktop Action Buttons */}
              <Button
                variant="default"
                size="sm"
                className="hidden md:flex items-center gap-2"
                data-testid="button-upload"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>

              <Link href="/coins">
                <Button
                  size="sm"
                  className="hidden md:flex items-center gap-2 btn-goon"
                  data-testid="button-launch-coin"
                >
                  <Coins className="h-4 w-4" />
                  Launch GOON Coin
                </Button>
              </Link>
            </>
          )}

          <div className="wallet-connect">
            <WalletMultiButton 
              className="!bg-[#121212] !border-[#27272A] !text-[#EAEAEA] !rounded-lg !text-sm !font-medium !min-h-[40px] !shadow-sm !transition-all !duration-200 !px-3 !py-2 md:!px-4 md:!py-2"
            />
          </div>
        </div>
      </div>
      
      {/* Upload Dialog */}
      <UploadDialog 
        open={isUploadDialogOpen} 
        onOpenChange={setIsUploadDialogOpen} 
      />
    </header>
  );
}
