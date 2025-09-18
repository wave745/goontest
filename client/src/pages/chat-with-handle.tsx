import { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Coins, Heart, Sparkles, Zap, Flame, Star, Crown, Gem, Settings, Save, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import SystemBadge from '@/components/SystemBadge';
import type { ChatMessage, User as UserType, AiPersona } from '@shared/schema';

type ChatMessageWithUser = ChatMessage & { user: UserType };

export default function ChatWithHandle() {
  const { handle } = useParams<{ handle: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [customPersona, setCustomPersona] = useState('');
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const [isSavingPersona, setIsSavingPersona] = useState(false);

  const { data: creator } = useQuery<UserType>({
    queryKey: ['/api/creators', handle],
    queryFn: async () => {
      const response = await fetch(`/api/creators/${handle}`);
      if (!response.ok) {
        throw new Error('Creator not found');
      }
      return response.json();
    },
    enabled: !!handle,
  });

  const { data: persona } = useQuery<AiPersona>({
    queryKey: ['/api/personas', handle],
    queryFn: async () => {
      const response = await fetch(`/api/personas/${handle}`);
      if (!response.ok) {
        throw new Error('Persona not found');
      }
      return response.json();
    },
    enabled: !!creator,
  });

  const { data: messages } = useQuery<ChatMessageWithUser[]>({
    queryKey: ['/api/chat/messages', handle],
    queryFn: async () => {
      const response = await fetch(`/api/chat/messages/${handle}?userId=anonymous`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    enabled: !!creator,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/chat/send', {
        creatorId: creator?.id,
        content,
        userPubkey: 'anonymous',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', handle] });
      setMessage('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const savePersonaMutation = useMutation({
    mutationFn: async (systemPrompt: string) => {
      const response = await apiRequest('POST', '/api/personas', {
        creator_id: handle,
        system_prompt: systemPrompt,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personas', handle] });
      toast({
        title: "Success",
        description: "Persona saved successfully!",
      });
      setShowPersonaEditor(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save persona",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || !creator) return;

    setIsTyping(true);
    await sendMessageMutation.mutateAsync(message);
    setIsTyping(false);
  };

  const handleSavePersona = async () => {
    if (!customPersona.trim()) return;
    setIsSavingPersona(true);
    await savePersonaMutation.mutateAsync(customPersona);
    setIsSavingPersona(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (persona?.system_prompt) {
      setCustomPersona(persona.system_prompt);
    }
  }, [persona]);


  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-foreground mb-4">Creator Not Found</h1>
              <p className="text-muted-foreground mb-6">The creator @{handle} doesn't exist</p>
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
        <main className="flex-1 p-4">
          <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)]">
            {/* Header with Creator Info */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center relative">
                    <Bot className="h-8 w-8 text-white" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-bg"></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl font-bold text-foreground">Chat with @{handle}</h1>
                      <SystemBadge />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                        <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                        Online
                      </Badge>
                      {persona?.price_per_message && (
                        <Badge variant="outline" className="border-accent/30 text-accent">
                          <Coins className="w-3 h-3 mr-1" />
                          {(persona.price_per_message / 1e9).toFixed(3)} SOL
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPersonaEditor(!showPersonaEditor)}
                  className="border-accent/30 text-accent hover:bg-accent/10"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Customize Persona
                </Button>
              </div>
            </div>

            {/* Persona Editor */}
            {showPersonaEditor && (
              <Card className="mb-6 border-accent/30 bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-accent flex items-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    Customize AI Persona
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={customPersona}
                    onChange={(e) => setCustomPersona(e.target.value)}
                    placeholder="Describe how you want the AI to behave... (e.g., 'Be a flirty, confident creator who loves to tease and engage in playful banter')"
                    className="min-h-[100px] bg-background border-accent/30 text-foreground"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSavePersona}
                      disabled={!customPersona.trim() || isSavingPersona}
                      className="btn-goon"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSavingPersona ? 'Saving...' : 'Save Persona'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPersonaEditor(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat Interface */}
            <Card className="bg-card border-border h-full flex flex-col">
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === 'user' 
                        ? 'bg-accent' 
                        : 'bg-gradient-to-br from-purple-500 to-pink-500'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="h-4 w-4 text-foreground" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-accent/20 border border-accent/30'
                          : 'bg-muted/20'
                      }`}>
                        <p className="text-sm text-foreground">{msg.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Enhanced Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-xs text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Chat with @${handle}...`}
                    className="bg-input border-border text-foreground"
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="btn-goon"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Persona Info */}
                {persona?.system_prompt && (
                  <div className="mt-3 p-3 bg-muted/10 rounded-lg border border-muted/20">
                    <p className="text-xs text-muted-foreground mb-1">
                      <Bot className="inline w-3 h-3 mr-1" />
                      Current AI Persona:
                    </p>
                    <p className="text-sm text-foreground">
                      {persona.system_prompt.length > 100 
                        ? `${persona.system_prompt.substring(0, 100)}...`
                        : persona.system_prompt
                      }
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
