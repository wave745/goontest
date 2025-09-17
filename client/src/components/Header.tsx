import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Upload, Users, Settings, Play, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SearchBar from './SearchBar';
import UploadDialog from './UploadDialog';
import { getCurrentUser, getOrCreateUser, type GoonUser } from '@/lib/userManager';

export default function Header() {
  const [location] = useLocation();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<GoonUser | null>(null);

  useEffect(() => {
    // Initialize user on component mount
    const initializeUser = async () => {
      const user = await getOrCreateUser();
      setCurrentUser(user);
    };
    initializeUser();
  }, []);

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

          {/* User Info */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden md:flex items-center gap-1">
                <User className="h-3 w-3" />
                {currentUser.goon_username}
              </Badge>
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold text-sm">
                  {currentUser.goon_username.charAt(0)}
                </span>
              </div>
            </div>
          )}
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
