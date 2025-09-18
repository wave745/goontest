import { useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import StreamSetupForm from '@/components/StreamSetupForm';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function StreamSetup() {
  // Set page title
  useEffect(() => {
    document.title = 'Start Live Stream | StreamApp';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Back Navigation */}
            <div className="mb-6">
              <Link 
                href="/live" 
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-back-to-live"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Live Streams
              </Link>
            </div>

            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Ready to Go Live?
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Set up your stream details and start connecting with your audience. 
                Viewers can send you tips directly to your Solana wallet during the stream.
              </p>
            </div>

            {/* Stream Setup Form */}
            <div className="flex justify-center">
              <StreamSetupForm />
            </div>

            {/* Help Section */}
            <div className="mt-12 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Need Help Getting Started?
              </h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Stream Tips</h4>
                  <ul className="space-y-1">
                    <li>• Use a catchy title that describes your content</li>
                    <li>• Make sure your camera and microphone work</li>
                    <li>• Have good lighting for the best stream quality</li>
                    <li>• Engage with your viewers in the chat</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Receiving Tips</h4>
                  <ul className="space-y-1">
                    <li>• Enter a valid Solana wallet address you control</li>
                    <li>• Tips are sent directly to your wallet</li>
                    <li>• Thank viewers who tip to encourage engagement</li>
                    <li>• You can update your address anytime in settings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}