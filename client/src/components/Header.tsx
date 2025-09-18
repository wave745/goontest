import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Upload, Play, User, Bot, Settings } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UploadDialog from './UploadDialog';
import SetUsernameDialog from './SetUsernameDialog';
import { useUsername } from '@/hooks/useUsername';

export default function Header() {
  const [location] = useLocation();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const { displayName, isConnected, hasCustomUsername, getUserAvatar } = useUsername();

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
            <Link href="/live" className={`hover:text-accent transition-colors ${location === '/live' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-live">
              Live
            </Link>
            <Link href="/chat" className={`hover:text-accent transition-colors ${location === '/chat' ? 'text-foreground' : 'text-muted-foreground'}`} data-testid="link-chat">
              AI Chat
            </Link>
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            <Link href="/live" className="p-2 text-muted-foreground hover:text-accent transition-colors rounded-lg hover:bg-accent/10" data-testid="link-live-mobile">
              <Play className="h-5 w-5" />
            </Link>
            <Link href="/chat" className="p-2 text-muted-foreground hover:text-accent transition-colors rounded-lg hover:bg-accent/10" data-testid="link-chat-mobile">
              <Bot className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
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
            <Link href="/live">
              <Button
                size="sm"
                variant="ghost"
                className="p-2 h-9 w-9 bg-card border-border hover:bg-accent/10"
                data-testid="button-live-mobile"
              >
                <Play className="h-4 w-4" />
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

          <Link href="/live">
            <Button
              size="sm"
              className="hidden md:flex items-center gap-2 bg-accent hover:bg-accent/90"
              data-testid="button-live"
            >
              <Play className="h-4 w-4" />
              Go Live
            </Button>
          </Link>

          {/* Wallet and User Section */}
          <div className="flex items-center gap-2">
            {/* Wallet Button - Always visible */}
            <div className="wallet-adapter-button-trigger" data-testid="wallet-button">
              <WalletMultiButton />
            </div>

            {/* Set Username Button - Only show when disconnected */}
            {!isConnected && (
              <Button
                size="sm"
                variant="outline"
                className="hidden md:flex items-center gap-2"
                onClick={() => setIsUsernameDialogOpen(true)}
                data-testid="button-set-username"
              >
                <User className="h-4 w-4" />
                {hasCustomUsername ? 'Change Username' : 'Set Username'}
              </Button>
            )}

            {/* User Avatar and Display Name */}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8" data-testid="user-avatar">
                <AvatarImage src={getUserAvatar()} />
                <AvatarFallback className="text-xs bg-accent/20 text-accent">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Display Name Badge - Hidden on mobile */}
              <Badge 
                variant={isConnected ? "default" : "secondary"} 
                className="hidden md:flex items-center gap-1"
                data-testid="user-display-name"
              >
                {isConnected ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {displayName}
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3" />
                    {displayName}
                  </>
                )}
              </Badge>
            </div>

            {/* Mobile Set Username Button */}
            {!isConnected && (
              <Button
                size="sm"
                variant="ghost"
                className="md:hidden p-2 h-9 w-9 bg-card border-border hover:bg-accent/10"
                onClick={() => setIsUsernameDialogOpen(true)}
                data-testid="button-set-username-mobile"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Upload Dialog */}
      <UploadDialog 
        open={isUploadDialogOpen} 
        onOpenChange={setIsUploadDialogOpen} 
      />

      {/* Username Dialog */}
      <SetUsernameDialog
        open={isUsernameDialogOpen}
        onOpenChange={setIsUsernameDialogOpen}
      />
    </header>
  );
}