import { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Heart, Sparkles, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, getOrCreateUser } from '@/lib/userManager';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatSimple() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedAI, setSelectedAI] = useState('amy');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const initializeUser = async () => {
      const user = await getOrCreateUser();
      setCurrentUser(user);
    };
    initializeUser();
  }, []);

  // AI personas data
  const aiPersonas = {
    amy: {
      id: 'amy',
      name: 'Amy',
      avatar: '/amy-goonhub.jpg',
      personality: 'Playful & Flirty',
      icon: Heart,
      responses: [
        "Oh my! 😘 You're so sweet! Tell me more, darling!",
        "Hehe, you're making me blush! 💕 What else is on your mind?",
        "You're such a charmer! 😍 I love talking with you!",
        "Aww, you're so cute! 🥰 Keep the compliments coming!",
        "You know just what to say to make me smile! 😊✨"
      ]
    },
    mia: {
      id: 'mia',
      name: 'Mia',
      avatar: '/mia-goonhub.jpg',
      personality: 'Sultry & Mysterious',
      icon: Sparkles,
      responses: [
        "Mmm... you have my attention, love. What secrets are you hiding?",
        "How intriguing... I wonder what else you're thinking about...",
        "You speak with such confidence... I like that about you.",
        "There's something mysterious about you... I want to know more.",
        "Your words are like honey... sweet and intoxicating."
      ]
    },
    una: {
      id: 'una',
      name: 'Una',
      avatar: '/una-goonhub.jpg',
      personality: 'Passionate & Bold',
      icon: Flame,
      responses: [
        "YES! That's what I'm talking about! 🔥 You've got fire in you!",
        "I love your energy! Let's turn up the heat! 💥",
        "Now THAT'S passion! Tell me more about what drives you!",
        "You're not holding back - I respect that! Let's go deeper!",
        "Bold and beautiful! That's exactly what I want to hear! ⚡"
      ]
    }
  };

  const currentPersona = aiPersonas[selectedAI as keyof typeof aiPersonas];

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    // Simulate AI response after a short delay
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: currentPersona.responses[Math.floor(Math.random() * currentPersona.responses.length)],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground mb-4">AI Chat</h1>
              <p className="text-muted-foreground mb-6">Loading your goon profile...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">AI Chat</h1>
              <p className="text-muted-foreground">Chat with Amy, Mia, and Una - your seductive AI companions</p>
            </div>

            {/* AI Selector */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {Object.values(aiPersonas).map((ai) => {
                const IconComponent = ai.icon;
                const isActive = selectedAI === ai.id;
                
                return (
                  <Button
                    key={ai.id}
                    onClick={() => setSelectedAI(ai.id)}
                    className={`relative group rounded-xl p-4 h-auto min-h-[80px] flex flex-col sm:flex-row items-center gap-3 transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-r from-accent to-accent-2 text-black shadow-lg scale-105' 
                        : 'bg-card/50 hover:bg-card border border-border hover:border-accent/30 hover:shadow-lg hover:scale-102'
                    }`}
                  >
                    {/* AI Image */}
                    <div className="relative">
                      <img 
                        src={ai.avatar} 
                        alt={ai.name}
                        className={`w-12 h-12 rounded-full object-cover border-2 transition-all duration-300 ${
                          isActive ? 'border-black shadow-lg' : 'border-border group-hover:border-accent/50'
                        }`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div 
                        className={`w-12 h-12 rounded-full bg-muted border-2 flex items-center justify-center hidden ${
                          isActive ? 'border-black' : 'border-border'
                        }`}
                      >
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      {/* Online indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                        isActive ? 'border-black bg-success' : 'border-card bg-success'
                      }`} />
                    </div>
                    
                    {/* AI Info */}
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold text-sm ${isActive ? 'text-black' : 'text-foreground'}`}>
                          {ai.name}
                        </h3>
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-black' : 'text-accent'}`} />
                      </div>
                      <p className={`text-xs ${isActive ? 'text-black/70' : 'text-muted-foreground'}`}>
                        {ai.personality}
                      </p>
                    </div>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Chat Interface */}
            <Card className="bg-card border-border h-[500px] md:h-[600px] flex flex-col">
              <CardHeader className="border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={currentPersona.avatar} />
                    <AvatarFallback>
                      <Bot className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-foreground">
                      {currentPersona.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <p className="text-sm text-success">Online</p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={msg.role === 'user' ? undefined : currentPersona.avatar} />
                      <AvatarFallback>
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                        msg.role === 'user'
                          ? 'bg-accent/20 border border-accent/30'
                          : 'bg-muted/20'
                      }`}>
                        <p className="text-sm text-foreground">{msg.content}</p>
                      </div>
                      <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        <p className="text-xs text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={currentPersona.avatar} />
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/20 rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </CardContent>

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="bg-input border-border text-foreground flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isTyping}
                    className="btn-goon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>Press Enter to send</span>
                  <span>{message.length}/500</span>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}





