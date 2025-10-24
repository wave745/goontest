import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Upload, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UploadDialog from './UploadDialog';

export default function Header() {
  const [location] = useLocation();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 relative">
        {/* Left: Logo */}
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
        </div>

        {/* Center: GoonAI - Mobile shifted right, Desktop centered */}
        <div className="absolute left-[65%] md:left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link 
            href="/chat" 
            className={`text-base md:text-2xl font-black transition-all duration-300 ${
              location === '/chat' ? 'text-accent' : 'text-accent/80 hover:text-accent'
            }`}
            style={{
              textShadow: '0 0 10px rgba(255, 165, 0, 0.8), 0 0 20px rgba(255, 165, 0, 0.6), 0 0 30px rgba(255, 165, 0, 0.4)'
            }}
            data-testid="link-chat"
          >
            goonai
          </Link>
        </div>

        {/* Right: Action Buttons */}
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