import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Video, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('photo');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
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
        toast({
          title: "Invalid file type",
          description: `Please select a valid ${activeTab} file`,
          variant: "destructive",
        });
      }
    }
  };


  const handleUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "Missing information",
        description: `Please select a ${activeTab} file`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');

    try {
      // Upload file to storage service with progress tracking
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('type', activeTab);
      
      setUploadStatus(`Uploading ${activeTab}...`);
      
      // Create XMLHttpRequest for progress tracking
      const uploadPromise = new Promise<{mediaUrl: string, thumbUrl: string}>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 90); // Reserve 10% for processing
            setUploadProgress(progress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            setUploadProgress(95);
            setUploadStatus('Processing...');
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch (error) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error('Upload failed'));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
      
      const { mediaUrl, thumbUrl } = await uploadPromise;

      // Create post data - completely anonymous upload
      const postData = {
        media_url: mediaUrl,
        thumb_url: thumbUrl,
        caption: '',
      };

      setUploadProgress(100);
      setUploadStatus('Creating post...');
      
      await uploadMutation.mutateAsync(postData);
      
      setUploadStatus('Upload complete!');
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
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
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleUpload}
              disabled={isUploading || !uploadFile}
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