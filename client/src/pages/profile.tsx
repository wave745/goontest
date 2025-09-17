import { useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
// import { uploadProfilePicture } from '@/lib/supabase';
import { 
  User, 
  Edit3, 
  Camera, 
  Save, 
  X, 
  Users, 
  Heart, 
  Eye, 
  Coins, 
  Settings,
  Upload,
  Check,
  ExternalLink,
  FileText,
  Copy,
  Share2,
  Activity,
  Sparkles
} from 'lucide-react';
import type { User as UserType } from '@shared/schema';

type UserWithStats = UserType & {
  followerCount: number;
  followingCount: number;
  postCount: number;
  totalViews: number;
  totalEarnings: number;
};

type Follower = {
  id: string;
  handle: string;
  avatar_url?: string;
  bio?: string;
  is_creator: boolean;
  followed_at: Date;
};

export default function Profile() {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  // Get current user profile
  const { data: user, isLoading } = useQuery<UserWithStats>({
    queryKey: ['/api/profile', publicKey?.toBase58()],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/profile/${publicKey?.toBase58()}`);
      return response.json();
    },
    enabled: !!publicKey,
  });

  // Get followers
  const { data: followersData } = useQuery<{followers: Follower[], pagination: any}>({
    queryKey: ['/api/profile/followers', publicKey?.toBase58()],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/profile/followers/${publicKey?.toBase58()}`);
      return response.json();
    },
    enabled: !!publicKey,
  });

  // Get following
  const { data: followingData } = useQuery<{following: Follower[], pagination: any}>({
    queryKey: ['/api/profile/following', publicKey?.toBase58()],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/profile/following/${publicKey?.toBase58()}`);
      return response.json();
    },
    enabled: !!publicKey,
  });

  const followers = followersData?.followers || [];
  const following = followingData?.following || [];

  // Get user posts
  const { data: userPosts } = useQuery({
    queryKey: ['/api/posts', publicKey?.toBase58()],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/posts?creator=${publicKey?.toBase58()}`);
      return response.json();
    },
    enabled: !!publicKey,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserType>) => {
      if (!publicKey) throw new Error('Wallet not connected');
      try {
        const response = await apiRequest('PUT', `/api/profile`, {
          walletAddress: publicKey.toBase58(),
          ...updates,
        });
        const data = await response.json();
        console.log('Profile update successful:', data);
        return data;
      } catch (error) {
        console.error('Profile update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile', publicKey?.toBase58()] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Profile update mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ followerId, followingId, action }: { followerId: string; followingId: string; action: 'follow' | 'unfollow' }) => {
      const response = await apiRequest(
        action === 'follow' ? 'POST' : 'DELETE', 
        `/api/profile/follow`, 
        { followerId, followingId }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile', publicKey?.toBase58()] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/followers', publicKey?.toBase58()] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/following', publicKey?.toBase58()] });
    },
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!publicKey) throw new Error('Wallet not connected');
      
      try {
        // Upload to Supabase Storage
        const avatarUrl = await uploadProfilePicture(file, publicKey.toBase58());
        console.log('Avatar uploaded to:', avatarUrl);
        
        // Update user profile with new avatar URL
        const response = await apiRequest('PUT', '/api/profile', {
          walletAddress: publicKey.toBase58(),
          avatar_url: avatarUrl,
        });
        const data = await response.json();
        console.log('Avatar update successful:', data);
        return data;
      } catch (error) {
        console.error('Avatar upload error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile', publicKey?.toBase58()] });
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated.",
      });
    },
    onError: (error) => {
      console.error('Avatar upload mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to upload avatar: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAvatarMutation.mutate(file);
    }
  };

  const handleSaveProfile = (formData: FormData) => {
    const updates = {
      handle: formData.get('handle') as string,
      bio: formData.get('bio') as string,
    };
    updateProfileMutation.mutate(updates);
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
              <div className="loading-skeleton h-64 rounded-xl mb-6"></div>
              <div className="loading-skeleton h-32 rounded-xl"></div>
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
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadAvatarMutation.isPending}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                    {uploadAvatarMutation.isPending && (
                      <div className="mt-2 text-xs text-muted-foreground">Uploading...</div>
                    )}
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
                            onClick={() => {
                              updateProfileMutation.mutate({ is_creator: true });
                            }}
                            disabled={updateProfileMutation.isPending}
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
                          {followers.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex -space-x-2">
                                {followers.slice(0, 3).map((follower) => (
                                  <Link key={follower.id} href={`/c/${follower.handle}`}>
                                    <Avatar className="h-6 w-6 border-2 border-background cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all">
                                      <AvatarImage src={follower.avatar_url} alt={follower.handle} />
                                      <AvatarFallback className="text-xs">
                                        {follower.handle?.charAt(0).toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>
                                ))}
                                {followers.length > 3 && (
                                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">+{followers.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
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
                          {following.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex -space-x-2">
                                {following.slice(0, 3).map((user) => (
                                  <Link key={user.id} href={`/c/${user.handle}`}>
                                    <Avatar className="h-6 w-6 border-2 border-background cursor-pointer hover:ring-2 hover:ring-green-500/50 transition-all">
                                      <AvatarImage src={user.avatar_url} alt={user.handle} />
                                      <AvatarFallback className="text-xs">
                                        {user.handle?.charAt(0).toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>
                                ))}
                                {following.length > 3 && (
                                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">+{following.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Posts Card */}
                      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-purple-500/20">
                              <FileText className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-foreground">
                                {user?.postCount || 0}
                              </div>
                              <div className="text-sm text-muted-foreground">Posts</div>
                            </div>
                          </div>
                          {user && user.postCount > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="text-xs text-muted-foreground">
                                {user.totalViews || 0} total views
                              </div>
                            </div>
                          )}
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
                          {user && user.totalViews > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="text-xs text-muted-foreground">
                                {user.postCount > 0 ? Math.round(user.totalViews / user.postCount) : 0} avg per post
                              </div>
                            </div>
                          )}
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
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleSaveProfile(formData);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="handle" className="block text-sm font-medium mb-2">
                        Username
                      </label>
                      <Input
                        id="handle"
                        name="handle"
                        defaultValue={user?.handle || ''}
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
                        name="bio"
                        defaultValue={user?.bio || ''}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="max-w-md"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Profile Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="followers">Followers</TabsTrigger>
                <TabsTrigger value="following">Following</TabsTrigger>
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

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent activity</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="posts" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      My Posts ({userPosts?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userPosts && userPosts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userPosts.map((post: any) => (
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
                                  {post.price_lamports / 1e9} SOL
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {post.visibility}
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

              <TabsContent value="followers" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Followers ({user?.followerCount || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {followers && followers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {followers.map((follower) => (
                          <Card key={follower.id} className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-500/10 hover:border-blue-500/20 transition-colors">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Link href={`/c/${follower.handle}`}>
                                  <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all">
                                    <AvatarImage src={follower.avatar_url} alt={follower.handle} />
                                    <AvatarFallback>
                                      {follower.handle?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <Link href={`/c/${follower.handle}`}>
                                      <h3 className="text-sm font-medium truncate hover:text-blue-500 transition-colors cursor-pointer">@{follower.handle}</h3>
                                    </Link>
                                    {follower.is_creator && (
                                      <Badge variant="secondary" className="text-xs px-1 py-0">
                                        Creator
                                      </Badge>
                                    )}
                                  </div>
                                  {follower.bio && (
                                    <p className="text-xs text-muted-foreground truncate">{follower.bio}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Link href={`/c/${follower.handle}`}>
                                  <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
                                    View Profile
                                  </Button>
                                </Link>
                                {publicKey && follower.id !== publicKey.toBase58() && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-xs h-7 flex-1"
                                    onClick={() => followMutation.mutate({
                                      followerId: publicKey.toBase58(),
                                      followingId: follower.id,
                                      action: 'follow'
                                    })}
                                    disabled={followMutation.isPending}
                                  >
                                    Follow Back
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="p-4 rounded-full bg-muted/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Users className="h-8 w-8 opacity-50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No followers yet</h3>
                        <p className="text-sm">Start creating content to attract followers!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="following" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Following ({user?.followingCount || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {following && following.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {following.map((user) => (
                          <Card key={user.id} className="bg-gradient-to-br from-green-500/5 to-green-600/5 border-green-500/10 hover:border-green-500/20 transition-colors">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Link href={`/c/${user.handle}`}>
                                  <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-green-500/50 transition-all">
                                    <AvatarImage src={user.avatar_url} alt={user.handle} />
                                    <AvatarFallback>
                                      {user.handle?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <Link href={`/c/${user.handle}`}>
                                      <h3 className="text-sm font-medium truncate hover:text-green-500 transition-colors cursor-pointer">@{user.handle}</h3>
                                    </Link>
                                    {user.is_creator && (
                                      <Badge variant="secondary" className="text-xs px-1 py-0">
                                        Creator
                                      </Badge>
                                    )}
                                  </div>
                                  {user.bio && (
                                    <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Link href={`/c/${user.handle}`}>
                                  <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
                                    View Profile
                                  </Button>
                                </Link>
                                {publicKey && user.id !== publicKey.toBase58() && (
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    className="text-xs h-7 flex-1"
                                    onClick={() => followMutation.mutate({
                                      followerId: publicKey.toBase58(),
                                      followingId: user.id,
                                      action: 'unfollow'
                                    })}
                                    disabled={followMutation.isPending}
                                  >
                                    Unfollow
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="p-4 rounded-full bg-muted/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Heart className="h-8 w-8 opacity-50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Not following anyone yet</h3>
                        <p className="text-sm">Discover and follow creators you love!</p>
                      </div>
                    )}
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
