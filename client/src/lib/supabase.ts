import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create a mock client if environment variables are not set
export const supabase = createClient(supabaseUrl, supabaseKey);

// Check if we're using placeholder values
export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseKey !== 'placeholder-key';

// Database types
export interface Post {
  id: string;
  creator_id: string;
  media_url: string;
  thumb_url: string;
  caption: string;
  price_lamports: number;
  visibility: 'public' | 'subscribers' | 'goon-gated';
  status: 'draft' | 'published' | 'archived';
  content_type: 'video' | 'photo' | 'live';
  is_live: boolean;
  views: number;
  likes: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: string;
  creator_id: string;
  mint_address: string;
  name: string;
  symbol: string;
  supply: number;
  image_url?: string;
  description?: string;
  is_new: boolean;
  created_at: string;
}

export interface User {
  id: string;
  handle?: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  age_verified: boolean;
  is_creator: boolean;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  type: 'post' | 'coin' | 'follow' | 'stream';
  target_id?: string;
  title: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

// Helper functions
export async function uploadToSupabase(file: File, bucket: string = 'posts'): Promise<string> {
  if (!isSupabaseConfigured) {
    // Return a placeholder URL for demo purposes
    return `https://via.placeholder.com/400x600/cccccc/666666?text=${encodeURIComponent(file.name)}`;
  }
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);
    
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);
    
  return publicUrl;
}

export async function createPost(postData: Partial<Post>) {
  if (!isSupabaseConfigured) {
    // Return mock data for demo purposes
    return { ...postData, id: `mock_${Date.now()}` } as Post;
  }
  
  const { data, error } = await supabase
    .from('posts')
    .insert(postData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function createToken(tokenData: Partial<Token>) {
  if (!isSupabaseConfigured) {
    // Return mock data for demo purposes
    return { ...tokenData, id: `mock_${Date.now()}` } as Token;
  }
  
  const { data, error } = await supabase
    .from('tokens')
    .insert(tokenData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function createActivity(activityData: Partial<Activity>) {
  if (!isSupabaseConfigured) {
    // Return mock data for demo purposes
    return { ...activityData, id: `mock_${Date.now()}` } as Activity;
  }
  
  const { data, error } = await supabase
    .from('activities')
    .insert(activityData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function followUser(followerId: string, followingId: string) {
  if (!isSupabaseConfigured) {
    // Return mock data for demo purposes
    return { id: `mock_${Date.now()}`, follower_id: followerId, following_id: followingId, created_at: new Date().toISOString() };
  }
  
  const { data, error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function unfollowUser(followerId: string, followingId: string) {
  if (!isSupabaseConfigured) {
    return; // Mock success
  }
  
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
    
  if (error) throw error;
}

export async function getPosts(filters?: {
  content_type?: string;
  is_live?: boolean;
  creator_id?: string;
  limit?: number;
}) {
  if (!isSupabaseConfigured) {
    // Return mock data for demo purposes
    const mockPosts: Post[] = [
      {
        id: 'mock_1',
        creator_id: 'mock_creator_1',
        media_url: 'https://via.placeholder.com/400x600/ff6b6b/ffffff?text=Photo+1',
        thumb_url: 'https://via.placeholder.com/400x600/ff6b6b/ffffff?text=Photo+1',
        caption: 'Amazing sunset view from the mountains! 🌅',
        price_lamports: 0,
        visibility: 'public',
        status: 'published',
        content_type: 'photo',
        is_live: false,
        views: 1250,
        likes: 89,
        tags: ['nature', 'sunset', 'mountains'],
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: 'mock_2',
        creator_id: 'mock_creator_2',
        media_url: 'https://via.placeholder.com/400x600/4ecdc4/ffffff?text=Video+1',
        thumb_url: 'https://via.placeholder.com/400x600/4ecdc4/ffffff?text=Video+1',
        caption: 'Cooking tutorial: How to make perfect pasta 🍝',
        price_lamports: 500000000, // 0.5 SOL
        visibility: 'public',
        status: 'published',
        content_type: 'video',
        is_live: false,
        views: 3200,
        likes: 156,
        tags: ['cooking', 'tutorial', 'pasta'],
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: 'mock_3',
        creator_id: 'mock_creator_3',
        media_url: 'https://via.placeholder.com/400x600/45b7d1/ffffff?text=Live+Stream',
        thumb_url: 'https://via.placeholder.com/400x600/45b7d1/ffffff?text=Live+Stream',
        caption: 'Live coding session - Building a React app! 💻',
        price_lamports: 0,
        visibility: 'public',
        status: 'published',
        content_type: 'live',
        is_live: true,
        views: 450,
        likes: 23,
        tags: ['coding', 'react', 'live'],
        created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      }
    ];
    
    let filteredPosts = mockPosts;
    
    if (filters?.content_type) {
      filteredPosts = filteredPosts.filter(post => post.content_type === filters.content_type);
    }
    
    if (filters?.is_live !== undefined) {
      filteredPosts = filteredPosts.filter(post => post.is_live === filters.is_live);
    }
    
    if (filters?.creator_id) {
      filteredPosts = filteredPosts.filter(post => post.creator_id === filters.creator_id);
    }
    
    if (filters?.limit) {
      filteredPosts = filteredPosts.slice(0, filters.limit);
    }
    
    return filteredPosts;
  }
  
  let query = supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });
    
  if (filters?.content_type) {
    query = query.eq('content_type', filters.content_type);
  }
  
  if (filters?.is_live !== undefined) {
    query = query.eq('is_live', filters.is_live);
  }
  
  if (filters?.creator_id) {
    query = query.eq('creator_id', filters.creator_id);
  }
  
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTokens(creatorId?: string) {
  if (!isSupabaseConfigured) {
    // Return mock data for demo purposes
    const mockTokens: Token[] = [
      {
        id: 'mock_token_1',
        creator_id: 'mock_creator_1',
        mint_address: 'So11111111111111111111111111111111111111112',
        name: 'SunsetGoon',
        symbol: 'SUNGOON',
        supply: 1000000,
        image_url: 'https://via.placeholder.com/100x100/ff6b6b/ffffff?text=SUN',
        description: 'A token for sunset photography enthusiasts',
        is_new: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
      {
        id: 'mock_token_2',
        creator_id: 'mock_creator_2',
        mint_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'CookingGoon',
        symbol: 'COOKGOON',
        supply: 500000,
        image_url: 'https://via.placeholder.com/100x100/4ecdc4/ffffff?text=COOK',
        description: 'For cooking and food content creators',
        is_new: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      }
    ];
    
    if (creatorId) {
      return mockTokens.filter(token => token.creator_id === creatorId);
    }
    
    return mockTokens;
  }
  
  let query = supabase
    .from('tokens')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getUsers(limit?: number) {
  if (!isSupabaseConfigured) {
    // Return mock data for demo purposes
    const mockUsers: User[] = [
      {
        id: 'mock_creator_1',
        handle: 'sunset_photographer',
        avatar_url: 'https://via.placeholder.com/100x100/ff6b6b/ffffff?text=SP',
        banner_url: 'https://via.placeholder.com/800x200/ff6b6b/ffffff?text=Sunset+Photography',
        bio: 'Professional photographer capturing beautiful sunsets around the world',
        age_verified: true,
        is_creator: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      },
      {
        id: 'mock_creator_2',
        handle: 'chef_mike',
        avatar_url: 'https://via.placeholder.com/100x100/4ecdc4/ffffff?text=CM',
        banner_url: 'https://via.placeholder.com/800x200/4ecdc4/ffffff?text=Cooking+Master',
        bio: 'Master chef sharing cooking tips and delicious recipes',
        age_verified: true,
        is_creator: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
      },
      {
        id: 'mock_creator_3',
        handle: 'code_wizard',
        avatar_url: 'https://via.placeholder.com/100x100/45b7d1/ffffff?text=CW',
        banner_url: 'https://via.placeholder.com/800x200/45b7d1/ffffff?text=Code+Wizard',
        bio: 'Full-stack developer sharing coding tutorials and live streams',
        age_verified: false,
        is_creator: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      }
    ];
    
    if (limit) {
      return mockUsers.slice(0, limit);
    }
    
    return mockUsers;
  }
  
  let query = supabase
    .from('users')
    .select('*')
    .eq('is_creator', true)
    .order('created_at', { ascending: false });
    
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getActivities(userId?: string, limit?: number) {
  if (!isSupabaseConfigured) {
    // Return mock data for demo purposes
    const mockActivities: Activity[] = [
      {
        id: 'mock_activity_1',
        user_id: 'mock_creator_1',
        type: 'post',
        target_id: 'mock_1',
        title: 'New Post',
        description: 'Shared new content',
        metadata: {},
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: 'mock_activity_2',
        user_id: 'mock_creator_2',
        type: 'coin',
        target_id: 'mock_token_2',
        title: 'New GOON Coin',
        description: 'Launched CookingGoon',
        metadata: {},
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      }
    ];
    
    if (userId) {
      return mockActivities.filter(activity => activity.user_id === userId);
    }
    
    if (limit) {
      return mockActivities.slice(0, limit);
    }
    
    return mockActivities;
  }
  
  let query = supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}