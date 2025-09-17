'use client';
import { Button } from '@/components/ui/button';
import { Bot, Heart, Sparkles, Flame, User } from 'lucide-react';

interface ChatSelectorProps {
  activeAI: string;
  setActiveAI: (ai: string) => void;
  personas?: Record<string, any>;
}

export default function ChatSelector({ activeAI, setActiveAI, personas }: ChatSelectorProps) {
  const ais = [
    { 
      id: 'amy', 
      name: 'Amy', 
      image: '/amy-goonhub.jpg',
      personality: 'Playful & Flirty',
      icon: Heart,
      color: 'from-pink-500 to-rose-500'
    },
    { 
      id: 'mia', 
      name: 'Mia', 
      image: '/mia-goonhub.jpg',
      personality: 'Sultry & Mysterious',
      icon: Sparkles,
      color: 'from-purple-500 to-indigo-500'
    },
    { 
      id: 'una', 
      name: 'Una', 
      image: '/una-goonhub.jpg',
      personality: 'Passionate & Bold',
      icon: Flame,
      color: 'from-orange-500 to-red-500'
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      {ais.map((ai) => {
        const IconComponent = ai.icon;
        const isActive = activeAI === ai.id;
        
        
        return (
          <Button
            key={ai.id}
            onClick={() => setActiveAI(ai.id)}
            className={`relative group rounded-lg p-2 h-auto min-h-[60px] flex flex-col sm:flex-row items-center gap-2 transition-all duration-300 ${
              isActive 
                ? 'bg-gradient-to-r from-accent to-accent-2 text-black shadow-lg scale-105' 
                : 'bg-card/50 hover:bg-card border border-border hover:border-accent/30 hover:shadow-lg hover:scale-102'
            }`}
          >
            {/* AI Image */}
            <div className="relative">
              <img 
                src={ai.image}
                alt={ai.name}
                className={`w-8 h-8 rounded-full object-cover border-2 transition-all duration-300 ${
                  isActive ? 'border-black shadow-lg' : 'border-border group-hover:border-accent/50'
                }`}
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div 
                className={`w-8 h-8 rounded-full bg-muted border-2 flex items-center justify-center hidden ${
                  isActive ? 'border-black' : 'border-border'
                }`}
              >
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              {/* Online indicator */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                isActive ? 'border-black bg-success' : 'border-card bg-success'
              }`} />
            </div>
            
            {/* AI Info */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="flex items-center gap-1">
                <h3 className={`font-semibold text-xs ${isActive ? 'text-black' : 'text-foreground'}`}>
                  {ai.name}
                </h3>
                <IconComponent className={`w-3 h-3 ${isActive ? 'text-black' : 'text-accent'}`} />
              </div>
              <p className={`text-xs ${isActive ? 'text-black/70' : 'text-muted-foreground'}`}>
                {ai.personality}
              </p>
            </div>
            
            {/* Active indicator */}
            {isActive && (
              <div className="absolute top-1 right-1">
                <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
              </div>
            )}
          </Button>
        );
      })}
    </div>
  );
}

