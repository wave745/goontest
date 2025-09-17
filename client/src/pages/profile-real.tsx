'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Edit3, 
  Camera, 
  Save, 
  Users, 
  Heart, 
  Eye, 
  Coins, 
  Settings,
  Upload,
  Check,
  Copy,
  Share2,
  Activity,
  Sparkles,
  Loader2
} from 'lucide-react';
import { supabase, getPosts, getTokens, type User as UserType, type Post, type Token } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

type UserWithStats = UserType & {
  followerCount: number;
  followingCount: number;
  postCount: number;
  totalViews: number;
  totalEarnings: number;
};

export default function Profile() {
  const { connected, publicKey } = useWallet();
  const [user, setUser] = useState<UserWithStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form state
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (!connected || !publicKey) return;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        // Get or create user
        let { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', publicKey.toBase58())
          .single();

        if (userError && userError.code === 'PGRST116') {
          // User doesn't exist, create them
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: publicKey.toBase58(),
              handle: `user_${publicKey.toBase58().slice(0, 8)}`,
              bio: '',
              age_verified: false,
              is_creator: false,
            })
            .select()
            .single();
          
          if (createError) throw createError;
          userData = newUser;
        } else if (userError) {
          throw userError;
        }

        // Get user's posts
        const userPosts = await getPosts({ creator_id: publicKey.toBase58() });
        
        // Get user's tokens
        const userTokens = await getTokens(publicKey.toBase58());
        
        // Calculate stats
        const totalViews = userPosts?.reduce((sum, post) => sum + (post.views || 0), 0) || 0;
        const totalEarnings = 0; // TODO: Calculate from purchases/tips
        
        setUser({
          ...userData,
          followerCount: 0, // TODO: Get from follows table
          followingCount: 0, // TODO: Get from follows table
          postCount: userPosts?.length || 0,
          totalViews,
          totalEarnings,
        });
        
        setPosts(userPosts || []);
        setTokens(userTokens || []);
        setHandle(userData.handle || '');
        setBio(userData.bio || '');
        setAvatarUrl(userData.avatar_url || '');
        
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [connected, publicKey]);

  const handleSaveProfile = async () => {
    if (!publicKey) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          handle,
          bio,
          avatar_url: avatarUrl,
        })
        .eq('id', publicKey.toBase58());

      if (error) throw error;

      setUser(prev => prev ? { ...prev, handle, bio, avatar_url: avatarUrl } : null);
      setIsEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const copyWalletAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast({
        title: "Copied",
        description: "Wallet address copied to clipboard.",
      });
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Connect Your Wallet</h1>
                <p className="text-muted-foreground">Please connect your wallet to view your profile.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-muted-foreground">Loading profile...</p>
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
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Profile Header */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24 md:h-32 md:w-32">
                        <AvatarImage src={user?.avatar_url} alt={user?.handle || 'Profile'} />
                        <AvatarFallback className="text-2xl">
                          {user?.handle?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="sm"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                        onClick={() => {
                          // TODO: Implement avatar upload
                          toast({
                            title: "Coming Soon",
                            description: "Avatar upload will be available soon",
                          });
                        }}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                            {user?.handle || 'Unnamed User'}
                          </h1>
                          {user?.is_creator && (
                            <Badge variant="secondary" className="bg-accent/20 text-accent">
                              Creator
                            </Badge>
                          )}
                          {user?.age_verified && (
                            <Badge variant="outline" className="border-green-500 text-green-500">
                              Age Verified
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground mb-4">
                          {user?.bio || 'No bio yet. Click edit to add one!'}
                        </p>

                        {/* Wallet Address */}
                        <div className="flex items-center gap-2 mb-4">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={copyWalletAddress}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(!isEditing)}
                          className="flex items-center gap-2"
                        >
                          <Edit3 className="h-4 w-4" />
                          {isEditing ? 'Cancel' : 'Edit Profile'}
                        </Button>
                        {!user?.is_creator && (
                          <Button 
                            variant="default" 
                            className="flex items-center gap-2 bg-accent hover:bg-accent/90"
                            onClick={async () => {
                              if (!publicKey) return;
                              const { error } = await supabase
                                .from('users')
                                .update({ is_creator: true })
                                .eq('id', publicKey.toBase58());
                              
                              if (!error) {
                                setUser(prev => prev ? { ...prev, is_creator: true } : null);
                                toast({
                                  title: "Success",
                                  description: "You are now a creator!",
                                });
                              }
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                            Become Creator
                          </Button>
                        )}
                        <Button variant="outline" className="flex items-center gap-2">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                      {/* Followers Card */}
                      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-blue-500/20">
                              <Users className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-foreground">
                                {user?.followerCount || 0}
                              </div>
                              <div className="text-sm text-muted-foreground">Followers</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Following Card */}
                      <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-500/20">
                              <Heart className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-foreground">
                                {user?.followingCount || 0}
                              </div>
                              <div className="text-sm text-muted-foreground">Following</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Posts Card */}
                      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-purple-500/20">
                              <Upload className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-foreground">
                                {user?.postCount || 0}
                              </div>
                              <div className="text-sm text-muted-foreground">Posts</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Views Card */}
                      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-orange-500/20">
                              <Eye className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-foreground">
                                {user?.totalViews || 0}
                              </div>
                              <div className="text-sm text-muted-foreground">Total Views</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Profile Form */}
            {isEditing && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Edit Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="handle" className="block text-sm font-medium mb-2">
                        Username
                      </label>
                      <Input
                        id="handle"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="Choose a unique username"
                        className="max-w-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium mb-2">
                        Bio
                      </label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="max-w-md"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveProfile}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="tokens">GOON Coins</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid gap-6">
                  {/* Earnings Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        Earnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground mb-2">
                        {user?.totalEarnings?.toFixed(4) || '0.0000'} SOL
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total earnings from content and tips
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="posts" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      My Posts ({posts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {posts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {posts.map((post) => (
                          <div key={post.id} className="relative group">
                            <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted">
                              <img
                                src={post.thumb_url || post.media_url}
                                alt={post.caption || 'Post'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="flex items-center justify-between text-white text-sm">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    {post.views || 0}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Heart className="h-4 w-4" />
                                    {post.likes || 0}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {post.caption && (
                              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                {post.caption}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {post.price_lamports > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {(post.price_lamports / 1e9).toFixed(3)} SOL
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {post.content_type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No posts yet</p>
                        <p className="text-sm">Start creating content to see it here!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tokens" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="h-5 w-5" />
                      My GOON Coins ({tokens.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tokens.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tokens.map((token) => (
                          <Card key={token.id} className="bg-gradient-to-br from-accent/20 to-accent-2/20 border-accent/30">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
                                  <Coins className="h-6 w-6 text-accent-foreground" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">{token.name}</h3>
                                  <p className="text-xs text-muted-foreground font-mono">{token.symbol}</p>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Supply</span>
                                  <span className="text-foreground">{token.supply.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Mint Address</span>
                                  <span className="text-foreground font-mono text-xs">
                                    {token.mint_address.slice(0, 8)}...
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No GOON coins launched yet</p>
                        <p className="text-sm">Launch your first token to see it here!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
