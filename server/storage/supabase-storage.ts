import { supabase } from '../lib/supabase.js';
import type { 
  Post, 
  InsertPost, 
  Token, 
  InsertToken, 
  Activity,
  InsertActivity,
  LiveStream,
  InsertLiveStream
} from '@shared/schema';
import type { IStorage } from '../storage';

export class SupabaseStorage implements IStorage {
  constructor() {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please configure Supabase environment variables.');
    }
  }

  // Post methods
  async getPosts(filters?: { category?: string; type?: string; sort?: string }): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('status', 'published');

    if (filters?.type) {
      if (filters.type === 'photo') {
        query = query.or('media_url.like.%.jpg%,media_url.like.%.jpeg%,media_url.like.%.png%,media_url.like.%.gif%,media_url.like.%.webp%');
      } else if (filters.type === 'video') {
        query = query.or('media_url.like.%.mp4%,media_url.like.%.webm%,media_url.like.%.mov%,media_url.like.%.avi%');
      }
    }

    // Add sorting
    if (filters?.sort === 'trending') {
      // Sort by engagement (likes + views) - we'll need to calculate this
      query = query.order('likes', { ascending: false });
    } else {
      // Default: sort by latest
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get posts: ${error.message}`);
    
    let posts = (data || []).map(post => ({
      ...post,
      created_at: new Date(post.created_at)
    }));

    // For trending sort, we need to sort by combined engagement
    if (filters?.sort === 'trending') {
      posts = posts.sort((a, b) => (b.likes + b.views) - (a.likes + a.views));
    }
    
    return posts;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async createPost(post: InsertPost): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        media_url: post.media_url,
        thumb_url: post.thumb_url,
        caption: post.caption,
        price_lamports: post.price_lamports,
        visibility: post.visibility,
        status: post.status,
        solana_address: post.solana_address,
        is_live: post.is_live,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create post: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async incrementPostViews(id: string): Promise<Post | undefined> {
    const { data, error } = await supabase
      .from('posts')
      .update({ views: supabase.raw('views + 1') })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };
  }

  async likePost(postId: string): Promise<boolean> {
    // Add anonymous like (no user tracking)
    const { error: updateError } = await supabase
      .from('posts')
      .update({ likes: supabase.raw('likes + 1') })
      .eq('id', postId);

    return !updateError;
  }

  async unlikePost(postId: string): Promise<boolean> {
    // Decrease like count anonymously
    const { error: updateError } = await supabase
      .from('posts')
      .update({ likes: supabase.raw('GREATEST(likes - 1, 0)') })
      .eq('id', postId);

    return !updateError;
  }


  // Token methods
  async getTokens(): Promise<Token[]> {
    const { data, error } = await supabase.from('tokens').select('*');

    if (error) throw new Error(`Failed to get tokens: ${error.message}`);
    
    return (data || []).map(token => ({
      ...token,
      created_at: new Date(token.created_at)
    }));
  }

  async getToken(id: string): Promise<Token | undefined> {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async createToken(token: InsertToken): Promise<Token> {
    const { data, error } = await supabase
      .from('tokens')
      .insert({
        mint_address: token.mint_address,
        name: token.name,
        symbol: token.symbol,
        supply: token.supply,
        image_url: token.image_url,
        description: token.description
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create token: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  // Activity methods
  async getActivities(limit: number = 50): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get activities: ${error.message}`);
    
    return (data || []).map(activity => ({
      ...activity,
      created_at: new Date(activity.created_at)
    }));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const { data, error } = await supabase
      .from('activities')
      .insert(activity)
      .select()
      .single();

    if (error) throw new Error(`Failed to create activity: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }


  // Live Stream methods
  async getLiveStreams(status?: string): Promise<LiveStream[]> {
    let query = supabase
      .from('live_streams')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get live streams: ${error.message}`);
    
    return (data || []).map(stream => ({
      ...stream,
      created_at: new Date(stream.created_at),
      ended_at: stream.ended_at ? new Date(stream.ended_at) : undefined
    }));
  }

  async getLiveStream(id: string): Promise<LiveStream | undefined> {
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    
    return {
      ...data,
      created_at: new Date(data.created_at),
      ended_at: data.ended_at ? new Date(data.ended_at) : undefined
    };
  }

  async createLiveStream(insertStream: InsertLiveStream): Promise<LiveStream> {
    const { data, error } = await supabase
      .from('live_streams')
      .insert(insertStream)
      .select()
      .single();

    if (error) throw new Error(`Failed to create live stream: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at),
      ended_at: data.ended_at ? new Date(data.ended_at) : undefined
    };
  }

  async updateLiveStream(id: string, updates: Partial<LiveStream>): Promise<LiveStream | undefined> {
    const { data, error } = await supabase
      .from('live_streams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update live stream: ${error.message}`);
    
    return data ? {
      ...data,
      created_at: new Date(data.created_at),
      ended_at: data.ended_at ? new Date(data.ended_at) : undefined
    } : undefined;
  }

  async endLiveStream(id: string): Promise<LiveStream | undefined> {
    const { data, error } = await supabase
      .from('live_streams')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to end live stream: ${error.message}`);
    
    return data ? {
      ...data,
      created_at: new Date(data.created_at),
      ended_at: data.ended_at ? new Date(data.ended_at) : undefined
    } : undefined;
  }

  async getActiveStreams(): Promise<LiveStream[]> {
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get active streams: ${error.message}`);
    
    return (data || []).map(stream => ({
      ...stream,
      created_at: new Date(stream.created_at),
      ended_at: stream.ended_at ? new Date(stream.ended_at) : undefined
    }));
  }

  async updateStreamViewerCount(id: string, viewerCount: number): Promise<LiveStream | undefined> {
    const { data, error } = await supabase
      .from('live_streams')
      .update({ 
        viewer_count: viewerCount,
        max_viewers: supabase.raw(`GREATEST(max_viewers, ${viewerCount})`)
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update stream viewer count: ${error.message}`);
    
    return data ? {
      ...data,
      created_at: new Date(data.created_at),
      ended_at: data.ended_at ? new Date(data.ended_at) : undefined
    } : undefined;
  }

  // Live Chat methods
  async getLiveChatMessages(streamId: string, limit: number, offset: number): Promise<any[]> {
    // For now, return empty array - in a real implementation, this would query a chat messages table
    return [];
  }

  async createLiveChatMessage(message: any): Promise<any> {
    // For now, return a mock message - in a real implementation, this would store in a chat messages table
    return {
      id: `msg_${Date.now()}`,
      ...message,
      created_at: new Date(),
    };
  }
}
