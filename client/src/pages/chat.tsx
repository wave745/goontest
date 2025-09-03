import { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Bot, User, Coins, Heart, Sparkles, Zap, Flame, Star, Crown, Gem } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import StudioModal from '@/components/modals/StudioModal';
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
  const [selectedHandle, setSelectedHandle] = useState<string>(handle || 'sarah_creates');

  const { data: allCreators } = useQuery<UserType[]>({
    queryKey: ['/api/creators'],
  });

  const { data: creator } = useQuery<UserType>({
    queryKey: ['/api/creators', selectedHandle],
  });

  const { data: persona } = useQuery<AiPersona>({
    queryKey: ['/api/personas', selectedHandle],
    enabled: !!creator,
  });

  const { data: messages } = useQuery<ChatMessageWithUser[]>({
    queryKey: ['/api/chat/messages', selectedHandle],
    enabled: connected && !!creator,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/chat/send', {
        creatorId: creator?.id,
        content,
        userPubkey: publicKey?.toBase58(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', selectedHandle] });
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

  const handleSendMessage = async () => {
    if (!message.trim() || !connected || !creator) return;

    setIsTyping(true);
    await sendMessageMutation.mutateAsync(message);
    setIsTyping(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        <main className="flex-1 p-4">
          <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)]">
            {/* Creator Selector */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">Select Creator to Chat</h2>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = `/chat/${selectedHandle}`}
                  className="border-accent/30 text-accent hover:bg-accent/10"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhanced Chat
                </Button>
              </div>
              <Select
                value={selectedHandle}
                onValueChange={(value) => {
                  // Clear messages for current creator before switching
                  queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', selectedHandle] });
                  setSelectedHandle(value);
                }}
              >
                <SelectTrigger className="w-full bg-card border-border">
                  <SelectValue placeholder="Select a creator to chat with" />
                </SelectTrigger>
                <SelectContent>
                  {allCreators?.map((creator) => (
                    <SelectItem key={creator.id} value={creator.handle || ''}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                        {creator.handle}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-card border-border h-full flex flex-col">
              <CardHeader className="border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center relative">
                    <Bot className="h-6 w-6 text-white" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-bg"></div>
                  </div>
                  <div>
                                      <CardTitle className="text-foreground">
                    AI {creator?.handle || selectedHandle}
                  </CardTitle>
                    <p className="text-sm text-success">Online</p>
                  </div>
                </div>
              </CardHeader>

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

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
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

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
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
                <p className="text-xs text-muted-foreground mt-2">
                  <Coins className="inline h-3 w-3 mr-1" />
                  {persona?.price_per_message ? `${(persona.price_per_message / 1e9).toFixed(3)} SOL per message` : '0.001 SOL per message'}
                </p>
              </div>
            </Card>
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
