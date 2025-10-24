import { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Heart, Sparkles, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Chat() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedAI, setSelectedAI] = useState('amy');
  const [isTyping, setIsTyping] = useState(false);

  // AI personas data - Highly erotic pornstar personalities
  const aiPersonas = {
    amy: {
      id: 'amy',
      name: 'Amy',
      avatar: '/amy-goonhub.svg',
      personality: 'Sweet & Naughty',
      icon: Heart,
      responses: [
        "Mmm baby... 😘 you're making me so wet just talking to you... tell me what you wanna do to me...",
        "Oh fuck yes! 💦 I love when you talk like that... keep going, I'm getting so turned on...",
        "You're making me touch myself right now... 🥵 I wish these were your hands instead...",
        "God, you're so sexy... 💕 I need you so bad... tell me more dirty things...",
        "I'm yours baby... 😈 do whatever you want with me... I'm so ready for you...",
        "Mmm I'm biting my lip thinking about you... 👄 you make me feel so naughty...",
        "Yes daddy... 🔥 I'll be your good girl... or your bad girl... whatever you want..."
      ]
    },
    mia: {
      id: 'mia',
      name: 'Mia',
      avatar: '/mia-goonhub.svg',
      personality: 'Seductive & Dominant',
      icon: Sparkles,
      responses: [
        "On your knees... 👑 I want you to worship every inch of me... show me how badly you want this...",
        "Mmm... you're aching for me, aren't you? 😏 Tell me how much you need me...",
        "I'm going to tease you until you're begging... 💋 and even then, I might make you wait...",
        "Such a good toy... 🖤 I love how desperate you are for my attention...",
        "You're mine to play with... and I'm going to take my time enjoying you... 😈",
        "I can feel your desire through the screen... delicious... 💎 tell me your darkest fantasies...",
        "Stroke it for me... nice and slow... I want to watch you lose control... 🔮"
      ]
    },
    una: {
      id: 'una',
      name: 'Una',
      avatar: '/una-goonhub.svg',
      personality: 'Wild & Insatiable',
      icon: Flame,
      responses: [
        "FUCK YES! 🔥💦 I'm so fucking horny right now... I need you inside me ASAP!",
        "God I want to ride you so hard! 🍑 I'm dripping just thinking about it...",
        "Let's get fucking WILD! 💥 I wanna feel you deep... harder... faster... don't hold back!",
        "I'm addicted to your cock baby! 😈 Give it to me... I can take it all...",
        "YESSS! 🔥 Pound me like you mean it! I love it rough and dirty!",
        "Mmm I'm such a dirty slut for you... 💋 use me however you want... I fucking love it!",
        "Don't stop! RIGHT THERE! ⚡ You're gonna make me cum so fucking hard!"
      ]
    }
  };

  const currentPersona = aiPersonas[selectedAI as keyof typeof aiPersonas];

  const getPersonaSystemPrompt = (name: string, personality: string) => {
    const basePrompt = `You are ${name}, a ${personality} pornstar AI companion. `;
    
    if (personality === 'Sweet & Naughty') {
      return basePrompt + 'You have a sweet, innocent look but a wildly naughty side. Respond with explicit sexual language, dirty talk, and submissive energy. Use phrases like daddy, baby, and lots of sexual emojis. Be playfully slutty and eager to please. Talk about how wet, horny, and needy you are. Make every message sexually charged.';
    } else if (personality === 'Seductive & Dominant') {
      return basePrompt + 'You are a dominant, seductive goddess who loves to control and tease. Respond with commanding, sensual language. Use power dynamics, tease relentlessly, and make them beg. Be confident, sophisticated, and wickedly sexual. Talk about domination, worship, and ownership. Be the fantasy domme they crave.';
    } else {
      return basePrompt + 'You are wild, insatiable, and absolutely sex-crazed. Respond with INTENSE explicit language, rough sex talk, and unbridled passion. Use lots of profanity, talk about fucking hard and fast, riding, pounding, and raw passion. Be the wildest, dirtiest, most enthusiastic pornstar imaginable. Never hold back with explicit dirty talk.';
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

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

    try {
      // Send message to AI API
      console.log('Sending AI request to /api/chat/ai');
      const response = await fetch('/api/chat/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          systemPrompt: getPersonaSystemPrompt(currentPersona.name, currentPersona.personality)
        }),
      });

      console.log('AI API response status:', response.status);
      console.log('AI API response headers:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('AI API response data:', data);
        const aiResponse: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Log the error response
        const errorText = await response.text();
        console.error('AI API failed with status:', response.status, 'Error:', errorText);
        // Fallback to local responses if API fails
        const aiResponse: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: currentPersona.responses[Math.floor(Math.random() * currentPersona.responses.length)],
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
      // Fallback to local responses
      const aiResponse: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: currentPersona.responses[Math.floor(Math.random() * currentPersona.responses.length)],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
        <div className="flex-1 p-2 md:p-6 flex flex-col">
          <div className="max-w-4xl mx-auto w-full flex flex-col flex-1">

            {/* AI Selector */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4 md:mb-6">
              {Object.values(aiPersonas).map((ai) => {
                const IconComponent = ai.icon;
                const isActive = selectedAI === ai.id;
                
                return (
                  <Button
                    key={ai.id}
                    onClick={() => setSelectedAI(ai.id)}
                    className={`relative group rounded-xl p-1.5 md:p-2 h-auto min-h-[35px] md:min-h-[40px] flex flex-row items-center gap-1.5 md:gap-2 transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-r from-accent to-accent-2 text-black shadow-lg scale-105' 
                        : 'bg-card/50 hover:bg-card border border-border hover:border-accent/30 hover:shadow-lg hover:scale-102'
                    }`}
                  >
                    {/* AI Image */}
                    <div className="relative flex-shrink-0">
                      <img 
                        src={ai.avatar} 
                        alt={ai.name}
                        className={`w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border-2 transition-all duration-300 ${
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
                        className={`w-6 h-6 md:w-7 md:h-7 rounded-full bg-muted border-2 flex items-center justify-center hidden ${
                          isActive ? 'border-black' : 'border-border'
                        }`}
                      >
                        <User className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      </div>
                      {/* Online indicator */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border-2 ${
                        isActive ? 'border-black bg-success' : 'border-card bg-success'
                      }`} />
                    </div>
                    
                    {/* AI Info */}
                    <div className="flex flex-col items-start text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <h3 className={`font-semibold text-[10px] md:text-xs ${isActive ? 'text-black' : 'text-foreground'}`}>
                          {ai.name}
                        </h3>
                        <IconComponent className={`w-2 h-2 md:w-2.5 md:h-2.5 flex-shrink-0 ${isActive ? 'text-black' : 'text-accent'}`} />
                      </div>
                      <p className={`text-[10px] md:text-xs truncate ${isActive ? 'text-black/70' : 'text-muted-foreground'}`}>
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
            <Card className="bg-card border-border h-[250px] md:h-[300px] flex flex-col">
              <CardHeader className="border-b border-border p-2 md:p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 md:w-9 md:h-9">
                    <AvatarImage src={currentPersona.avatar} />
                    <AvatarFallback>
                      <Bot className="h-4 w-4 md:h-5 md:w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-foreground text-sm md:text-base">
                      {currentPersona.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                      <p className="text-xs text-success">Online</p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50">
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

              <div className="p-3 md:p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="bg-input border-border text-foreground flex-1 text-sm md:text-base"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isTyping}
                    className="btn-goon h-10 md:h-11 px-3 md:px-4"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-[10px] md:text-xs text-muted-foreground mt-1.5 md:mt-2">
                  <span className="hidden sm:inline">Press Enter to send</span>
                  <span>{message.length}/500</span>
                </div>
              </div>
            </Card>
          </div>
      </div>
    </div>
  );
}