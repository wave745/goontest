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
import { Loader2, Play, User, MessageSquare, Wallet, Image } from 'lucide-react';

// Extend the schema with Solana address validation
const streamSetupFormSchema = insertStreamSetupSchema.extend({
  solana_address: z.string()
    .min(1, "Solana address is required")
    .refine((address) => validateSolanaAddress(address), {
      message: "Please enter a valid Solana address"
    })
});

type StreamSetupFormData = z.infer<typeof streamSetupFormSchema>;

interface StreamSetupFormProps {
  onSuccess?: (streamId: string) => void;
}

export default function StreamSetupForm({ onSuccess }: StreamSetupFormProps) {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Create a live post that represents the stream
      const response = await fetch('/api/posts', {
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

      if (!response.ok) {
        throw new Error('Failed to create stream');
      }

      return response.json();
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
      await createStreamMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
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
            <FormField
              control={form.control}
              name="avatar_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground">
                    <Image className="h-4 w-4 text-accent" />
                    Streaming Avatar (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://example.com/your-avatar.jpg"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      data-testid="input-avatar-url"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground">
                    Add an image URL for your streaming icon that appears above the chat. If left empty, we'll generate one from your name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    Viewers can send you SOL tips during the stream. Make sure this is a valid Solana address you control.
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