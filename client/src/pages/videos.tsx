import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import VideoCard from '@/components/VideoCard';
import MasonryGrid from '@/components/MasonryGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Video, Upload, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from '@/hooks/use-toast';
import type { Post } from '@shared/schema';

export default function Videos() {
  const [, setLocation] = useLocation();
  const { connected, publicKey } = useWallet();
  const queryClient = useQueryClient();
  
  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch videos with proper error handling
  const { data: posts, isLoading, error, refetch } = useQuery<Post[]>({
    queryKey: ['/api/posts', { type: 'video' }],
    queryFn: async () => {
      const response = await fetch(`/api/posts?type=video`);
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload video');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video uploaded successfully!",
        description: "Your video has been shared with the community.",
      });
      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadPrice('');
      setUploadTags('');
      setIsUploadDialogOpen(false);
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCardClick = (post: Post) => {
    setLocation(`/p/${post.id}`);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        // Check file size (max 100MB for videos)
        if (file.size > 100 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please select a video smaller than 100MB",
            variant: "destructive",
          });
          return;
        }
        setUploadFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a valid video file (MP4, MOV, AVI, WebM)",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a video file and enter a title",
        variant: "destructive",
      });
      return;
    }

    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to upload videos",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to storage service
      const formData = new FormData();
      formData.append('file', uploadFile as File);
      formData.append('type', 'video');
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      const { mediaUrl, thumbUrl } = await uploadResponse.json();

      const tags = uploadTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      const postData = {
        creator_id: publicKey.toBase58(),
        media_url: mediaUrl,
        thumb_url: thumbUrl,
        caption: uploadTitle + (uploadDescription ? `\n\n${uploadDescription}` : ''),
        price_lamports: parseFloat(uploadPrice || '0') * 1000000,
        visibility: 'public',
        tags: ['video', ...tags]
      };

      await uploadMutation.mutateAsync(postData);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeSelectedFile = () => {
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetry = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-6">
                <Video className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold">Videos</h1>
              </div>
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-muted-foreground">Loading videos...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-6">
                <Video className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold">Videos</h1>
              </div>
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Failed to load videos</p>
                  <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
                  <Button 
                    variant="outline" 
                    onClick={handleRetry}
                    className="bg-card border-border text-card-foreground hover:bg-accent/10"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
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
        <main className="flex-1">
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                <h1 className="text-xl md:text-2xl font-bold">Videos</h1>
                {posts && (
                  <span className="text-sm text-muted-foreground">
                    ({posts.length} videos)
                  </span>
                )}
              </div>
              
              {connected && (
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Video
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Upload Video</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="video-file">Video File *</Label>
                        <div className="mt-2">
                          {uploadFile ? (
                            <div className="flex items-center gap-2 p-3 border border-border rounded-lg">
                              <Video className="h-4 w-4 text-accent" />
                              <span className="flex-1 text-sm truncate">{uploadFile.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {(uploadFile.size / 1024 / 1024).toFixed(1)}MB
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={removeSelectedFile}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Click to select video file</p>
                              <p className="text-xs text-muted-foreground mt-1">Max 100MB (MP4, MOV, AVI, WebM)</p>
                            </div>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          placeholder="Enter video title"
                          className="mt-1"
                          maxLength={100}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={uploadDescription}
                          onChange={(e) => setUploadDescription(e.target.value)}
                          placeholder="Enter video description"
                          className="mt-1"
                          rows={3}
                          maxLength={500}
                        />
                      </div>

                      <div>
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input
                          id="tags"
                          value={uploadTags}
                          onChange={(e) => setUploadTags(e.target.value)}
                          placeholder="gaming, tutorial, entertainment"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="price">Price (GOON Coins)</Label>
                        <Input
                          id="price"
                          type="number"
                          value={uploadPrice}
                          onChange={(e) => setUploadPrice(e.target.value)}
                          placeholder="0 (free) or enter amount"
                          className="mt-1"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={handleUpload}
                          disabled={isUploading || !uploadFile || !uploadTitle.trim()}
                          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Upload Video'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsUploadDialogOpen(false)}
                          disabled={isUploading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          <div className="p-2 md:p-4 pb-20 md:pb-4">
            {posts && posts.length > 0 ? (
              <>
                <MasonryGrid>
                  {posts.map((post) => (
                    <VideoCard
                      key={post.id}
                      id={post.id}
                      thumb={post.thumb_url}
                      duration="12:34"
                      title={post.caption}
                      creator={post.creator ? { 
                        id: post.creator.id || 'anonymous',
                        handle: post.creator.handle || 'Anonymous', 
                        avatar_url: post.creator.avatar_url,
                        is_creator: post.creator.is_creator || false 
                      } : { id: 'anonymous', handle: 'Anonymous', is_creator: false }}
                      views={post.views}
                      likes={post.likes}
                      price={post.price_lamports}
                      isGated={post.price_lamports > 0}
                      isVerified={post.creator?.is_creator || false}
                      tags={post.tags || []}
                      onClick={() => handleCardClick(post)}
                    />
                  ))}
                </MasonryGrid>

                {/* Load More */}
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    className="bg-card border-border text-card-foreground hover:bg-accent/10"
                    data-testid="button-load-more"
                  >
                    Load More Videos
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No videos available</p>
                  {connected && (
                    <p className="text-sm text-muted-foreground mt-2">Be the first to upload a video!</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}