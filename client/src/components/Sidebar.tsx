import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Clock, Video, Image, Coins, MessageCircle, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@shared/schema';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  
  const { data: subscriptions } = useQuery<User[]>({
    queryKey: ['/api/subscriptions'],
    enabled: false, // Enable when user is authenticated
  });

  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Clock, label: 'Recent', href: '/recent' },
  ];

  const categoryItems = [
    { icon: Image, label: 'Photos', href: '/photos' },
    { icon: Video, label: 'Videos', href: '/videos' },
    { icon: Coins, label: 'GOON Coins', href: '/coins' },
    { icon: MessageCircle, label: 'AI Chat', href: '/chat' },
  ];

  return (
    <aside 
      className={`${isCollapsed ? 'w-16' : 'w-64'} min-h-screen bg-card border-r border-border transition-all duration-300 hidden md:block`}
      data-testid="sidebar"
    >
      <div className="p-4 space-y-6">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex justify-end text-muted-foreground hover:text-foreground"
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>

        <div>
          {!isCollapsed && <h3 className="text-sm font-semibold text-foreground mb-3">Browse</h3>}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive 
                      ? 'text-accent bg-accent/10 border border-accent/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                  }`} data-testid={`link-${item.label.toLowerCase()}`}>
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && item.label}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          {!isCollapsed && <h3 className="text-sm font-semibold text-foreground mb-3">Categories</h3>}
          <nav className="space-y-2">
            {categoryItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive 
                      ? 'text-accent bg-accent/10 border border-accent/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                  }`} data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}>
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && item.label}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile Link - Under AI Chat but not in categories */}
        <div>
          <nav className="space-y-2">
            <Link href="/profile">
              <a className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                location === '/profile'
                  ? 'text-accent bg-accent/10 border border-accent/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
              }`} data-testid="link-profile">
                <UserIcon className="h-4 w-4" />
                {!isCollapsed && 'Profile'}
              </a>
            </Link>
          </nav>
        </div>

        {!isCollapsed && subscriptions && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Subscriptions</h3>
            <div className="space-y-3">
              {subscriptions.slice(0, 5).map((creator) => (
                <Link key={creator.id} href={`/c/${creator.handle}`}>
                  <a className="flex items-center gap-3 hover:bg-accent/10 rounded-lg p-2 transition-colors" data-testid={`link-creator-${creator.handle}`}>
                    <img 
                      src={creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.handle}`} 
                      alt={creator.handle} 
                      className="w-8 h-8 rounded-full" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">@{creator.handle}</p>
                      <p className="text-xs text-muted-foreground">Online</p>
                    </div>
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
