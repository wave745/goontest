import { Home, TrendingUp, Star, Clock, Video, Image, Coins, MessageCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function MobileNav() {
  const navItems = [
    { icon: Home, label: 'Feed', href: '/', active: true },
    { icon: TrendingUp, label: 'Trending', href: '/trending' },
    { icon: Video, label: 'Videos', href: '/videos' },
    { icon: Image, label: 'Photos', href: '/photos' },
    { icon: Coins, label: 'GOON Coins', href: '/coins' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent/10 group">
              <item.icon className={`h-5 w-5 ${
                item.active 
                  ? 'text-accent' 
                  : 'text-muted-foreground group-hover:text-accent'
              }`} />
              <span className={`text-xs font-medium ${
                item.active 
                  ? 'text-accent' 
                  : 'text-muted-foreground group-hover:text-accent'
              }`}>
                {item.label}
              </span>
            </a>
          </Link>
        ))}
      </div>
    </nav>
  );
}
