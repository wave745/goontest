import { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ChatSelector from '@/components/ChatSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Heart, Sparkles, Zap, Flame, Star, Crown, Gem, Mic, MicOff, Paperclip, Smile, Settings, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import StudioModal from '@/components/modals/StudioModal';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import type { ChatMessage, User as UserType, AiPersona } from '@shared/schema';

type ChatMessageWithUser = ChatMessage & { user: UserType };

export default function Chat() {
  const { handle } = useParams<{ handle?: string }>();
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [selectedAI, setSelectedAI] = useState<string>('amy');
  const [activeTab, setActiveTab] = useState('chat');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [messages, setMessages] = useState<ChatMessageWithUser[]>([]);

  // Preload all AI images to prevent flickering (non-blocking)
  const aiImageUrls = ['/amy-goonhub.jpg', '/mia-goonhub.jpg', '/una-goonhub.jpg'];
  const { preloadedImages } = useImagePreloader(aiImageUrls);

  // Real data from API
  const { data: chatStats } = useQuery({
    queryKey: ['chat-stats'],
    queryFn: async () => {
      const response = await fetch('/api/chat/stats');
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentChats } = useQuery({
    queryKey: ['recent-chats'],
    queryFn: async () => {
      const response = await fetch('/api/chat/recent');
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch AI personas from backend
  const { data: aiPersonas, isLoading: personasLoading } = useQuery({
    queryKey: ['ai-personas'],
    queryFn: async () => {
      const response = await fetch('/api/creators');
      if (!response.ok) throw new Error('Failed to fetch creators');
      const creators = await response.json();
      
      // Filter AI creators and fetch their personas
      const aiCreators = creators.filter((creator: any) => 
        ['amy', 'mia', 'una'].includes(creator.id)
      );
      
      const personasWithData = await Promise.all(
        aiCreators.map(async (creator: any) => {
          try {
            const personaResponse = await fetch(`/api/personas/${creator.handle}`);
            if (personaResponse.ok) {
              const persona = await personaResponse.json();
              return {
                id: creator.id,
                name: creator.id.charAt(0).toUpperCase() + creator.id.slice(1),
                handle: creator.handle,
                avatar_url: creator.avatar_url,
                system_prompt: persona.system_prompt,
                price_per_message: 0
              };
            }
          } catch (error) {
            console.error(`Failed to fetch persona for ${creator.handle}:`, error);
          }
          
          // Fallback if persona fetch fails
          return {
            id: creator.id,
            name: creator.id.charAt(0).toUpperCase() + creator.id.slice(1),
            handle: creator.handle,
            avatar_url: creator.avatar_url,
            system_prompt: `You are ${creator.id.charAt(0).toUpperCase() + creator.id.slice(1)}, a seductive AI companion.`,
            price_per_message: 0
          };
        })
      );
      
      return personasWithData.reduce((acc, persona) => {
        acc[persona.id] = persona;
        return acc;
      }, {} as Record<string, any>);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const currentPersona = aiPersonas?.[selectedAI];

  // Generate AI response using the xAI API
  const generateAIResponse = async (userMessage: string, systemPrompt: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId: currentPersona?.id || 'amy',
          content: userMessage,
          userPubkey: publicKey?.toBase58() || 'anonymous'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      return data.response || "Sorry, I couldn't process that message.";
    } catch (error) {
      console.error('AI response error:', error);
      // No fallback - only use live xAI API responses
      throw new Error('AI service is currently unavailable. Please try again later.');
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentPersona) {
        throw new Error('No AI persona selected');
      }

      // Add user message to local state immediately
      const userMessage: ChatMessageWithUser = {
        id: `user_${Date.now()}`,
        user_id: publicKey?.toBase58() || '',
        creator_id: currentPersona.id,
        role: 'user',
        content,
        created_at: new Date(),
        txn_sig: `txn_${Date.now()}`,
        user: {
          id: publicKey?.toBase58() || '',
          handle: 'user',
          avatar_url: '',
          bio: '',
          age_verified: true,
          is_creator: false,
          created_at: new Date()
        }
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      
      try {
        // Get AI response from xAI API
        const aiResponseContent = await generateAIResponse(content, currentPersona.system_prompt);
        
        const aiResponse: ChatMessageWithUser = {
          id: `ai_${Date.now()}`,
          user_id: currentPersona.id,
          creator_id: currentPersona.id,
          role: 'assistant',
          content: aiResponseContent,
          created_at: new Date(),
          txn_sig: '',
          user: {
            id: currentPersona.id,
            handle: currentPersona.handle,
            avatar_url: currentPersona.avatar_url,
            bio: currentPersona.system_prompt,
            age_verified: true,
            is_creator: true,
            created_at: new Date()
          }
        };
        
        return aiResponse;
      } finally {
        setIsTyping(false);
      }
    },
    onSuccess: (aiResponse) => {
      setMessages(prev => [...prev, aiResponse]);
      setMessage('');
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || !connected || !currentPersona) return;

    setIsTyping(true);
    await sendMessageMutation.mutateAsync(message);
    setIsTyping(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Don't render the chat interface until personas are loaded
  if (personasLoading || !currentPersona) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading AI personas...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground mb-4">AI Chat</h1>
              <p className="text-muted-foreground mb-6">Connect your wallet to start chatting with creators</p>
              <Button className="btn-goon">Connect Wallet</Button>
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
          <div className="max-w-6xl mx-auto">
            <div className="mb-4 md:mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">AI Chat</h1>
                  <p className="text-sm md:text-base text-muted-foreground">Chat with Amy, Mia, and Una - your seductive AI companions</p>
                </div>
              </div>
            </div>

            {/* AI Selector */}
            <ChatSelector activeAI={selectedAI} setActiveAI={setSelectedAI} personas={aiPersonas} />

            {/* Chat Interface */}
            <div className="w-full">
              <Card className="bg-card border-border h-[400px] md:h-[500px] flex flex-col">
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={preloadedImages[currentPersona.avatar_url] || `${currentPersona.avatar_url}?v=${Date.now()}&refresh=${imageRefreshKey}`}
                          alt={currentPersona.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                          style={{ 
                            opacity: !preloadedImages[currentPersona.avatar_url] ? 0.7 : 1,
                            transition: 'opacity 0.2s ease-in-out'
                          }}
                          onLoad={() => {
                            console.log('✅ Chat header: Successfully loaded AI avatar:', currentPersona.avatar_url);
                          }}
                          onError={(e) => {
                            console.error('❌ Chat header: Failed to load AI avatar:', currentPersona.avatar_url);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-12 h-12 rounded-full bg-muted border-2 border-border flex items-center justify-center"
                          style={{ display: 'none' }}
                        >
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card bg-success" />
                  </div>
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
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                      {msg.role === 'user' ? (
                        <div className="w-8 h-8 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="relative">
                          {currentPersona ? (
                            <img 
                              src={preloadedImages[currentPersona.avatar_url] || `${currentPersona.avatar_url}?v=${Date.now()}&refresh=${imageRefreshKey}`}
                              alt={currentPersona.name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-border"
                              style={{ 
                                opacity: !preloadedImages[currentPersona.avatar_url] ? 0.7 : 1,
                                transition: 'opacity 0.2s ease-in-out'
                              }}
                              onLoad={() => {
                                console.log('✅ Message avatar: Successfully loaded AI avatar:', currentPersona.avatar_url);
                              }}
                              onError={(e) => {
                                console.error('❌ Message avatar: Failed to load AI avatar:', currentPersona.avatar_url);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          {currentPersona && (
                            <div 
                              className="w-8 h-8 rounded-full bg-muted border-2 border-border flex items-center justify-center"
                              style={{ display: 'none' }}
                            >
                              <Bot className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
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
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                          {msg.role === 'assistant' && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Heart className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Zap className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-3">
                      <div className="relative">
                        <img 
                          src={preloadedImages[currentPersona.avatar_url] || `${currentPersona.avatar_url}?v=${Date.now()}&refresh=${imageRefreshKey}`}
                          alt={currentPersona.name}
                          className="w-8 h-8 rounded-full object-cover border-2 border-border"
                          style={{ 
                            opacity: !preloadedImages[currentPersona.avatar_url] ? 0.7 : 1,
                            transition: 'opacity 0.2s ease-in-out'
                          }}
                          onLoad={() => {
                            console.log('✅ Typing indicator: Successfully loaded AI avatar:', currentPersona.avatar_url);
                          }}
                          onError={(e) => {
                            console.error('❌ Typing indicator: Failed to load AI avatar:', currentPersona.avatar_url);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-8 h-8 rounded-full bg-muted border-2 border-border flex items-center justify-center"
                          style={{ display: 'none' }}
                        >
                          <Bot className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
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
                  <div className="flex gap-1 md:gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRecording(!isRecording)}
                      className={`${isRecording ? 'bg-red-500/20 border-red-500/50' : ''} hidden sm:flex`}
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                      className="bg-input border-border text-foreground flex-1 text-sm md:text-base"
                    data-testid="input-chat-message"
                  />
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                      <Smile className="h-4 w-4" />
                    </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="btn-goon"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <span className="text-green-500">Free messaging</span>
                      </span>
                      <span>Press Enter to send</span>
                    </div>
                    <span>{message.length}/500</span>
                  </div>
              </div>
            </Card>
            </div>
          </div>
        </main>
      </div>

      <StudioModal
        isOpen={showStudioModal}
        onClose={() => setShowStudioModal(false)}
      />
    </div>
  );
}
