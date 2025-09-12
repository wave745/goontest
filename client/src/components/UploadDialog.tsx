import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, Upload, X, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const { connected, publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('photo');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPrice, setUploadPrice] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (postData: any) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      if (!response.ok) throw new Error('Failed to upload post');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post uploaded successfully!",
        description: "Your content has been shared with the community.",
      });
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadPrice('');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (isImage && activeTab === 'photo') {
        setUploadFile(file);
      } else if (isVideo && activeTab === 'video') {
        setUploadFile(file);
      } else {
        alert(`Please select a valid ${activeTab} file`);
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) {
      alert(`Please select a ${activeTab} file and enter a title`);
      return;
    }

    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to storage service
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', activeTab);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      const { mediaUrl, thumbUrl } = await uploadResponse.json();

      const postData = {
        creator_id: publicKey.toBase58(),
        media_url: mediaUrl,
        thumb_url: thumbUrl,
        caption: uploadTitle + (uploadDescription ? `\n\n${uploadDescription}` : ''),
        price_lamports: parseFloat(uploadPrice || '0') * 1000000,
        visibility: 'public',
        tags: [activeTab, 'uploaded']
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Content</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="photo" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="photo" className="space-y-4">
            <div>
              <Label htmlFor="photo-file">Photo File</Label>
              <div className="mt-2">
                {uploadFile ? (
                  <div className="flex items-center gap-2 p-3 border border-border rounded-lg">
                    <Image className="h-4 w-4 text-accent" />
                    <span className="flex-1 text-sm truncate">{uploadFile.name}</span>
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
                    <p className="text-sm text-muted-foreground">Click to select image file</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="video" className="space-y-4">
            <div>
              <Label htmlFor="video-file">Video File</Label>
              <div className="mt-2">
                {uploadFile ? (
                  <div className="flex items-center gap-2 p-3 border border-border rounded-lg">
                    <Video className="h-4 w-4 text-accent" />
                    <span className="flex-1 text-sm truncate">{uploadFile.name}</span>
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
          </TabsContent>
        </Tabs>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder={`Enter ${activeTab} title`}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder={`Enter ${activeTab} description`}
              className="mt-1"
              rows={3}
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
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleUpload}
              disabled={isUploading || !uploadFile || !uploadTitle.trim()}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isUploading ? 'Uploading...' : `Upload ${activeTab === 'photo' ? 'Photo' : 'Video'}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
