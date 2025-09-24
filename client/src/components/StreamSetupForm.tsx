import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { validateSolanaAddress } from '@/lib/solana';
import { insertStreamSetupSchema, type InsertStreamSetup } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Loader2, Play, User, MessageSquare, Wallet, Image, Upload, X } from 'lucide-react';

// TypeScript declaration for Solana wallet
declare global {
  interface Window {
    solana?: {
      signMessage: (message: Uint8Array, display?: string) => Promise<{
        signature: Uint8Array;
      }>;
      connect: () => Promise<any>;
      disconnect: () => Promise<any>;
    };
  }
}

// Extend the schema with relaxed Solana address validation for testing
const streamSetupFormSchema = insertStreamSetupSchema.extend({
  solana_address: z.string()
    .min(1, "Solana address is required")
    .refine((address) => {
      // For testing, allow a simple fallback address
      if (address.length < 10) return false;
      return validateSolanaAddress(address) || address === "test-wallet-address";
    }, {
      message: "Please enter a valid Solana address (or use 'test-wallet-address' for testing)"
    })
});

type StreamSetupFormData = z.infer<typeof streamSetupFormSchema>;

interface StreamSetupFormProps {
  onSuccess?: (streamId: string) => void;
}

export default function StreamSetupForm({ onSuccess }: StreamSetupFormProps) {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const form = useForm<StreamSetupFormData>({
    resolver: zodResolver(streamSetupFormSchema),
    defaultValues: {
      name: '',
      title: '',
      description: '',
      avatar_url: '',
      solana_address: ''
    }
  });

  const createStreamMutation = useMutation({
    mutationFn: async (data: StreamSetupFormData) => {
      // Step 1: Create a live post that represents the stream
      const createResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_url: '', // Will be filled by actual video stream
          thumb_url: '',
          caption: data.description || data.title,
          is_live: true,
          metadata: {
            streamer_name: data.name,
            streamer_avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
            solana_address: data.solana_address,
            stream_title: data.title,
            stream_description: data.description,
            is_setup_complete: true,
            start_time: new Date().toISOString(),
            viewer_count: 0
          }
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create stream');
      }

      const createdPost = await createResponse.json();
      const postId = createdPost.id;

      // Step 2: Get nonce for authentication
      const nonceResponse = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: data.solana_address,
          streamId: postId
        }),
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to get authentication nonce');
      }

      const { nonce, expiresAt } = await nonceResponse.json();

      // Step 3: Create message to sign
      const message = `Authenticate for stream: ${postId}\nNonce: ${nonce}\nTimestamp: ${expiresAt}`;
      const messageBytes = new TextEncoder().encode(message);

      // Request wallet to sign the message (this will prompt the user)
      if (!window.solana || !window.solana.signMessage) {
        throw new Error('Solana wallet not available. Please install Phantom or another Solana wallet.');
      }

      const signedMessage = await window.solana.signMessage(messageBytes, 'utf8');
      const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));

      // Step 4: Claim ownership with signature
      const claimResponse = await fetch(`/api/posts/${postId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: data.solana_address,
          signedMessage: signatureBase64
        }),
      });

      if (!claimResponse.ok) {
        const error = await claimResponse.json();
        throw new Error(error.error || 'Failed to claim stream ownership');
      }

      return await claimResponse.json();
    },
    onSuccess: (stream) => {
      toast({
        title: "Stream started successfully!",
        description: `Your stream "${stream.metadata?.stream_title || 'stream'}" is now live`,
      });
      
      // Navigate to the live stream or call success callback
      if (onSuccess) {
        onSuccess(stream.id);
      } else {
        setLocation(`/live/${stream.id}`);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to start stream",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: StreamSetupFormData) => {
    setIsSubmitting(true);
    try {
      let avatarUrl = data.avatar_url;
      
      // Upload avatar if file is selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        
        const uploadResponse = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload avatar');
        }
        
        const uploadResult = await uploadResponse.json();
        avatarUrl = uploadResult.avatar_url;
      }
      
      // Submit with uploaded avatar URL
      await createStreamMutation.mutateAsync({
        ...data,
        avatar_url: avatarUrl
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file for your avatar",
          variant: "destructive",
        });
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <div className="p-2 rounded-full bg-accent/20">
            <Play className="h-6 w-6 text-accent" />
          </div>
          Setup Your Live Stream
        </CardTitle>
        <p className="text-muted-foreground">
          Enter your details to start streaming and receive tips from viewers
        </p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Streamer Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground">
                    <User className="h-4 w-4 text-accent" />
                    Streamer Display Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your display name"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      data-testid="input-streamer-name"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground">
                    This is how viewers will see your name in the chat and stream
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stream Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    Stream Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="What's your stream about?"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      data-testid="input-stream-title"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground">
                    A catchy title that describes what you're streaming
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Streaming Avatar Field */}
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-foreground">
                <Image className="h-4 w-4 text-accent" />
                Streaming Avatar (Optional)
              </FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {avatarPreview ? (
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={avatarPreview} 
                          alt="Avatar preview" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={removeAvatar}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium">{avatarFile?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {avatarFile && (avatarFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <div className="space-y-2">
                        <label htmlFor="avatar-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-foreground hover:text-accent">
                            Click to upload avatar
                          </span>
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                            data-testid="input-avatar-file"
                          />
                        </label>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription className="text-muted-foreground">
                Upload an image for your streaming icon that appears above the chat. If not uploaded, we'll generate one from your name.
              </FormDescription>
            </FormItem>

            {/* Stream Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">
                    Stream Description (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe your stream content, goals, or anything viewers should know..."
                      rows={4}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground resize-none"
                      data-testid="textarea-stream-description"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground">
                    Optional details about your stream (up to 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Solana Address Field */}
            <FormField
              control={form.control}
              name="solana_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground">
                    <Wallet className="h-4 w-4 text-accent" />
                    Solana Address for Tips
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your Solana wallet address"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground font-mono text-sm"
                      data-testid="input-solana-address"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground">
                    Viewers can send you SOL tips during the stream. Enter a valid Solana address or use "test-wallet-address" for testing.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/live')}
                className="w-full sm:w-auto"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createStreamMutation.isPending}
                className="w-full sm:flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                data-testid="button-start-stream"
              >
                {isSubmitting || createStreamMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting Stream...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Gooning
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}