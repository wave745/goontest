import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CloudUpload, Upload, Coins, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudioModal({ isOpen, onClose }: StudioModalProps) {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  
  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [visibility, setVisibility] = useState('public');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Token form state
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('GOON');
  const [tokenSupply, setTokenSupply] = useState('1000000');
  const [tokenImage, setTokenImage] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: "File too large",
          description: "Please select a file under 100MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!file || !title) {
      toast({
        title: "Error",
        description: "Please select a file and enter a title",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement file upload to DigitalOcean Spaces and database insertion
      toast({
        title: "Upload Successful!",
        description: "Your content has been published",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your content",
        variant: "destructive",
      });
    }
  };

  const handleLaunchToken = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!tokenName.toUpperCase().endsWith('GOON')) {
      toast({
        title: "Error",
        description: "Token name must end with 'GOON'",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement token creation with vanity mint address
      toast({
        title: "Token Launched!",
        description: `${tokenName} token created successfully`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Launch Failed",
        description: "There was an error launching your token",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-studio">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">Creator Studio</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/10 mb-6">
            <TabsTrigger value="upload" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Upload Content
            </TabsTrigger>
            <TabsTrigger value="token" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Launch GOON Coin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* File Upload */}
            <div>
              <Label className="text-foreground mb-2">Media File</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('fileInput')?.click()}
                data-testid="dropzone-upload"
              >
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-foreground mb-2">
                  {file ? file.name : 'Drop your video or image here'}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supports MP4, WebM, JPG, PNG up to 100MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-accent/20 border-accent/30 text-accent"
                >
                  Choose File
                </Button>
              </div>
            </div>

            {/* Content Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground mb-2">Title</Label>
                <Input
                  placeholder="Enter content title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-input border-border text-foreground"
                  data-testid="input-content-title"
                />
              </div>
              <div>
                <Label className="text-foreground mb-2">Price (SOL)</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000 (free)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-input border-border text-foreground"
                  data-testid="input-content-price"
                />
              </div>
            </div>

            <div>
              <Label className="text-foreground mb-2">Description</Label>
              <Textarea
                placeholder="Describe your content..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-input border-border text-foreground resize-none"
                rows={4}
                data-testid="textarea-content-description"
              />
            </div>

            {/* Tags */}
            <div>
              <Label className="text-foreground mb-2">Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-accent/20 border border-accent/30 text-accent px-3 py-1 rounded-full text-xs flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-primary-foreground"
                      data-testid={`button-remove-tag-${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tags..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="bg-input border-border text-foreground"
                  data-testid="input-new-tag"
                />
                <Button onClick={handleAddTag} variant="outline" size="sm">
                  Add
                </Button>
              </div>
            </div>

            {/* Visibility Settings */}
            <div>
              <Label className="text-foreground mb-2">Visibility</Label>
              <RadioGroup value={visibility} onValueChange={setVisibility}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="text-foreground">Public - Visible to everyone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subscribers" id="subscribers" />
                  <Label htmlFor="subscribers" className="text-foreground">Subscribers Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="goon" id="goon" />
                  <Label htmlFor="goon" className="text-foreground">GOON Token Holders Only</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!connected || !file || !title}
              className="w-full btn-goon"
              data-testid="button-upload-content"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Content
            </Button>
          </TabsContent>

          <TabsContent value="token" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground mb-2">Token Name</Label>
                <Input
                  placeholder="Must end with GOON"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="bg-input border-border text-foreground"
                  data-testid="input-token-name"
                />
              </div>
              <div>
                <Label className="text-foreground mb-2">Symbol</Label>
                <Input
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  className="bg-input border-border text-foreground"
                  data-testid="input-token-symbol"
                />
              </div>
            </div>

            <div>
              <Label className="text-foreground mb-2">Total Supply</Label>
              <Input
                type="number"
                value={tokenSupply}
                onChange={(e) => setTokenSupply(e.target.value)}
                className="bg-input border-border text-foreground"
                data-testid="input-token-supply"
              />
            </div>

            <div>
              <Label className="text-foreground mb-2">Token Image URL</Label>
              <Input
                placeholder="https://..."
                value={tokenImage}
                onChange={(e) => setTokenImage(e.target.value)}
                className="bg-input border-border text-foreground"
                data-testid="input-token-image"
              />
            </div>

            <Button
              onClick={handleLaunchToken}
              disabled={!connected || !tokenName.toUpperCase().endsWith('GOON')}
              className="w-full btn-goon"
              data-testid="button-launch-token"
            >
              <Coins className="mr-2 h-4 w-4" />
              Launch GOON Token
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
