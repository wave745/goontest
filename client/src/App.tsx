import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Recent from "@/pages/recent-real";
import Videos from "@/pages/videos";
import Photos from "@/pages/photos";
import PostDetail from "@/pages/post-detail";
import Studio from "@/pages/studio-real";
import Chat from "@/pages/chat";
import Coins from "@/pages/coins";
import NotFound from "@/pages/not-found";
import AIProfile from "@/pages/ai-profile";
import Upload from "@/pages/upload";
import Live from "@/pages/live-real";
import StreamSetup from "@/pages/stream-setup";
import StreamDetail from "@/pages/stream-detail";
import StreamStart from "@/pages/stream-start";
import StreamViewer from "@/pages/stream-viewer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recent" component={Recent} />
      <Route path="/videos" component={Videos} />
      <Route path="/photos" component={Photos} />
      <Route path="/ai/:handle" component={AIProfile} />
      <Route path="/p/:id" component={PostDetail} />
      <Route path="/studio" component={Studio} />
      <Route path="/chat" component={Chat} />
      <Route path="/coins" component={Coins} />
      <Route path="/upload" component={Upload} />
      <Route path="/live" component={Live} />
      <Route path="/live/setup" component={StreamSetup} />
      <Route path="/live/:streamId" component={StreamDetail} />
      <Route path="/stream/start" component={StreamStart} />
      <Route path="/stream/:id" component={StreamViewer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
