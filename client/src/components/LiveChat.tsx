import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  MessageCircle, 
  Users, 
  Crown,
  Zap,
  Gift,
  Heart,
  Loader2,
  Lock,
  Wallet
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  avatar?: string;
  type: 'message' | 'tip' | 'system';
  amount?: number;
  walletAddress?: string;
}

interface LiveChatProps {
  streamId: string;
  streamTitle?: string;
  className?: string;
}

export default function LiveChat({ streamId, streamTitle, className }: LiveChatProps) {
  const { connected, publicKey } = useWallet();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection management
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [streamId]);

  const connectWebSocket = () => {
    try {
      // Use real WebSocket connection with specific path to avoid conflicts with Vite HMR
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/chat-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected for stream:', streamId);
        setIsConnected(true);
        
        // Join the stream chat
        ws.send(JSON.stringify({
          type: 'join_stream',
          postId: streamId
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'chat_message') {
            setMessages(prev => [...prev, {
              id: data.message.id,
              username: data.message.username,
              message: data.message.message,
              timestamp: new Date(data.message.created_at).toLocaleTimeString(),
              type: data.message.type,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.message.username}`
            }]);
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Retry connection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      // Load existing chat messages from API
      fetch(`/api/chat/${streamId}`)
        .then(response => response.json())
        .then(messages => {
          const formattedMessages = messages.map((msg: any) => ({
            id: msg.id,
            username: msg.username,
            message: msg.message,
            timestamp: new Date(msg.created_at).toLocaleTimeString(),
            type: msg.type,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`
          }));
          setMessages(formattedMessages);
        })
        .catch(error => {
          console.error('Failed to load chat history:', error);
          // Add welcome message if chat history fails
          setMessages([{
            id: '1',
            username: 'StreamBot',
            message: `Welcome to ${streamTitle || 'the stream'}! Chat rules: Be respectful and have fun!`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'system'
          }]);
        });
      
      setViewerCount(Math.floor(Math.random() * 500) + 50);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      
      // Fallback to periodic viewer updates and load chat history
      fetch(`/api/chat/${streamId}`)
        .then(response => response.json())
        .then(messages => {
          const formattedMessages = messages.map((msg: any) => ({
            id: msg.id,
            username: msg.username,
            message: msg.message,
            timestamp: new Date(msg.created_at).toLocaleTimeString(),
            type: msg.type,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`
          }));
          setMessages(formattedMessages);
        })
        .catch(console.error);
      
      // Retry connection after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    }
  };

  const getMockMessage = () => {
    const messages = [
      'This is awesome! 🎉',
      'Love the content!',
      'Keep it up! 💪',
      'Amazing stream!',
      'When is the next stream?',
      'Can you show that again?',
      'Great work! 👏',
      'This is helpful, thanks!',
      'Excited to be here! ✨',
      'Best streamer ever! 🔥'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !isConnected) return;
    
    setIsSending(true);
    
    try {
      const username = connected 
        ? `${publicKey?.toBase58().slice(0, 4)}...${publicKey?.toBase58().slice(-4)}` 
        : 'Anonymous';
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Send via WebSocket for real-time chat
        wsRef.current.send(JSON.stringify({
          type: 'chat_message',
          postId: streamId,
          username,
          content: newMessage.trim(),
          messageType: 'message',
          senderAddress: connected ? publicKey?.toBase58() : undefined
        }));
      } else {
        // Fallback to HTTP API if WebSocket is not available
        const response = await fetch(`/api/chat/${streamId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            message: newMessage.trim(),
            type: 'message',
            sender_address: connected ? publicKey?.toBase58() : undefined
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
      }
      
      setNewMessage('');
      
      toast({
        title: "Message sent",
        description: "Your message has been posted to the chat",
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return timestamp;
  };

  const renderMessage = (message: ChatMessage) => {
    const isSystem = message.type === 'system';
    const isTip = message.type === 'tip';
    
    return (
      <div key={message.id} className={`flex gap-3 p-3 hover:bg-accent/50 transition-colors ${isSystem ? 'bg-accent/20' : ''}`}>
        {!isSystem && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={message.avatar} />
            <AvatarFallback className="text-xs">
              {message.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isSystem ? (
              <Badge variant="secondary" className="text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                System
              </Badge>
            ) : (
              <>
                <span className="font-medium text-sm text-foreground">
                  {message.username}
                </span>
                {message.walletAddress && (
                  <Badge variant="outline" className="text-xs">
                    <Wallet className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {isTip && (
                  <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-300">
                    <Gift className="h-3 w-3 mr-1" />
                    Tipped {message.amount} SOL
                  </Badge>
                )}
              </>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          
          <p className={`text-sm break-words ${isSystem ? 'text-muted-foreground italic' : 'text-foreground'}`}>
            {message.message}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            Live Chat
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isConnected ? "secondary" : "destructive"} 
              className="text-xs"
              data-testid="chat-connection-status"
            >
              <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              <span data-testid="viewer-count">{viewerCount}</span>
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Messages Area */}
        <ScrollArea className="h-[250px] border-b border-border">
          <div className="p-0">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Message Input */}
        <div className="p-4">
          {!connected && (
            <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Lock className="h-4 w-4" />
                <span className="text-sm">
                  Connect your wallet to chat with a verified identity
                </span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={connected ? "Type a message..." : "Connect wallet or chat anonymously..."}
              className="flex-1"
              maxLength={500}
              disabled={isSending}
              data-testid="input-chat-message"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              size="icon"
              data-testid="button-send-message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>
              {newMessage.length}/500 characters
            </span>
            <span>
              Press Enter to send
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}