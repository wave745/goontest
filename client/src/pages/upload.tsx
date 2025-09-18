import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Image, Video, Play, X, Loader2, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [contentType, setContentType] = useState('photo');
  const [isUploading, setIsUploading] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState('');

  // Live streaming form
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [streamSolanaAddress, setStreamSolanaAddress] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if ((isImage && contentType === 'photo') || (isVideo && contentType === 'video')) {
        setUploadFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: `Please select a valid ${contentType} file`,
          variant: "destructive",
        });
      }
    }
  };

  const removeSelectedFile = () => {
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isValidSolanaAddress = (address: string): boolean => {
    // Basic Solana address validation (44 characters, base58)
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const handleContentUpload = async () => {

    if (!uploadFile || !uploadTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a file and enter a title",
        variant: "destructive",
      });
      return;
    }

    if (solanaAddress && !isValidSolanaAddress(solanaAddress)) {
      toast({
        title: "Invalid Solana address",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload file using our API
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('type', contentType);

      const uploadResponse = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      
      const tags = uploadTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      // Create post using our API
      const postResponse = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solana_address: solanaAddress,
          media_url: uploadData.mediaUrl,
          thumb_url: uploadData.thumbUrl,
          caption: uploadTitle + (uploadDescription ? `\n\n${uploadDescription}` : ''),
          visibility: 'public',
          status: 'published',
          tags: [contentType, ...tags],
        }),
      });

      if (!postResponse.ok) {
        throw new Error('Failed to create post');
      }

      toast({
        title: "Content uploaded successfully!",
        description: "Your content has been shared with the community.",
      });

      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
      setSolanaAddress('');
      setLocation('/');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartStream = async () => {

    if (!streamTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a stream title",
        variant: "destructive",
      });
      return;
    }

    if (streamSolanaAddress && !isValidSolanaAddress(streamSolanaAddress)) {
      toast({
        title: "Invalid Solana address",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create live stream post
      const streamResponse = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solana_address: streamSolanaAddress,
          caption: streamTitle + (streamDescription ? `\n\n${streamDescription}` : ''),
          visibility: 'public',
          status: 'published',
          is_live: true,
          tags: ['live', 'streaming'],
        }),
      });

      if (!streamResponse.ok) {
        throw new Error('Failed to create stream');
      }

      const streamData = await streamResponse.json();

      toast({
        title: "Stream started successfully!",
        description: "Your live stream is now active.",
      });

      // Reset form
      setStreamTitle('');
      setStreamDescription('');
      setStreamSolanaAddress('');
      setLocation(`/live/${streamData.id}`);
    } catch (error) {
      console.error('Stream start error:', error);
      toast({
        title: "Stream start failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">Share Content</h1>
              <p className="text-muted-foreground">Upload photos/videos or start a live stream</p>
            </div>

            <div className="space-y-6">
              {/* Upload Content Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Content Type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="photo">
                          <div className="flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Photo
                          </div>
                        </SelectItem>
                        <SelectItem value="video">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Video
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>File *</Label>
                    <div className="mt-2">
                      {uploadFile ? (
                        <div className="flex items-center gap-2 p-3 border border-border rounded-lg">
                          {contentType === 'photo' ? (
                            <Image className="h-4 w-4 text-accent" />
                          ) : (
                            <Video className="h-4 w-4 text-accent" />
                          )}
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
                          <p className="text-sm text-muted-foreground">
                            Click to select {contentType} file
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Max {contentType === 'photo' ? '10MB' : '100MB'}
                          </p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={contentType === 'photo' ? 'image/*' : 'video/*'}
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
                      placeholder={`Enter ${contentType} title`}
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
                      placeholder={`Enter ${contentType} description`}
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
                      placeholder="nature, landscape, art"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="solana-address">Solana Address (for tips)</Label>
                    <div className="relative mt-1">
                      <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="solana-address"
                        value={solanaAddress}
                        onChange={(e) => setSolanaAddress(e.target.value)}
                        placeholder="Enter your Solana wallet address for tips"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional: Add your Solana address to receive tips from viewers
                    </p>
                  </div>

                  <Button
                    onClick={handleContentUpload}
                    disabled={isUploading || !uploadFile || !uploadTitle.trim()}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      `Upload ${contentType === 'photo' ? 'Photo' : 'Video'}`
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Live Stream Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Start Live Stream
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stream-title">Stream Title *</Label>
                    <Input
                      id="stream-title"
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                      placeholder="What's your stream about?"
                      className="mt-1"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Label htmlFor="stream-description">Description</Label>
                    <Textarea
                      id="stream-description"
                      value={streamDescription}
                      onChange={(e) => setStreamDescription(e.target.value)}
                      placeholder="Tell viewers what to expect..."
                      className="mt-1"
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <div>
                    <Label htmlFor="stream-solana-address">Solana Address (for tips)</Label>
                    <div className="relative mt-1">
                      <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="stream-solana-address"
                        value={streamSolanaAddress}
                        onChange={(e) => setStreamSolanaAddress(e.target.value)}
                        placeholder="Enter your Solana wallet address for tips"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional: Add your Solana address to receive tips from viewers
                    </p>
                  </div>

                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                    <h4 className="font-semibold text-accent mb-2">Live Streaming Info</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Your stream will be visible to all users globally</li>
                      <li>• Viewers can interact via live chat</li>
                      <li>• Tips will be sent directly to your Solana address</li>
                      <li>• You can end the stream anytime</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleStartStream}
                    disabled={isUploading || !streamTitle.trim()}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting Stream...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Go Live Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}