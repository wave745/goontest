import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Video, Image, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
// Removed User type import for anonymization

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  
  // Removed subscription query for anonymization

  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
  ];

  const categoryItems = [
    { icon: Image, label: 'Photos', href: '/photos' },
    { icon: Video, label: 'Videos', href: '/videos' },
    { icon: Play, label: 'Live', href: '/live' },
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
                  <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                    isActive 
                      ? 'text-accent bg-accent/10 border border-accent/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                  }`} data-testid={`link-${item.label.toLowerCase()}`}>
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && item.label}
                  </div>
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
                  <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                    isActive 
                      ? 'text-accent bg-accent/10 border border-accent/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                  }`} data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}>
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>


      </div>
    </aside>
  );
}
