import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/components/WalletProvider";
import Home from "@/pages/home";
import Recent from "@/pages/recent";
import Videos from "@/pages/videos";
import Photos from "@/pages/photos";
import CreatorProfile from "@/pages/creator-profile";
import PostDetail from "@/pages/post-detail";
import Studio from "@/pages/studio";
import Chat from "@/pages/chat";
import ChatWithHandle from "@/pages/chat-with-handle";
import Coins from "@/pages/coins";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Creators from "@/pages/creators";
import Search from "@/pages/search";
import AIProfile from "@/pages/ai-profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recent" component={Recent} />
      <Route path="/videos" component={Videos} />
      <Route path="/photos" component={Photos} />
      <Route path="/creators" component={Creators} />
      <Route path="/search" component={Search} />
      <Route path="/c/:handle" component={CreatorProfile} />
      <Route path="/ai/:handle" component={AIProfile} />
      <Route path="/p/:id" component={PostDetail} />
      <Route path="/studio" component={Studio} />
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:handle" component={ChatWithHandle} />
      <Route path="/coins" component={Coins} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
