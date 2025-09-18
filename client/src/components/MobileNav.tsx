import { Home, Clock, Video, Image, Coins, MessageCircle } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function MobileNav() {
  const [location] = useLocation();
  
  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Clock, label: 'Recent', href: '/recent' },
    { icon: Image, label: 'Photos', href: '/photos' },
    { icon: Video, label: 'Videos', href: '/videos' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent/10 group">
                <item.icon className={`h-5 w-5 ${
                  isActive 
                    ? 'text-accent' 
                    : 'text-muted-foreground group-hover:text-accent'
                }`} />
                <span className={`text-xs font-medium ${
                  isActive 
                    ? 'text-accent' 
                    : 'text-muted-foreground group-hover:text-accent'
                }`}>
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
