import { supabase } from '../lib/supabase.js';
import type { 
  User, 
  InsertUser, 
  Post, 
  InsertPost, 
  Token, 
  InsertToken, 
  Purchase, 
  InsertPurchase, 
  Tip, 
  InsertTip, 
  AiPersona, 
  InsertAiPersona, 
  ChatMessage, 
  InsertChatMessage,
  Follow,
  InsertFollow,
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

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get all users: ${error.message}`);
    
    return (data || []).map(user => ({
      ...user,
      created_at: new Date(user.created_at)
    }));
  }

  async getUserByHandle(handle: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('handle', handle)
      .single();

    if (error || !data) return undefined;
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }


  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        handle: user.handle,
        avatar_url: user.avatar_url,
        banner_url: user.banner_url,
        bio: user.bio,
        age_verified: user.age_verified,
        is_creator: user.is_creator,
        solana_address: user.solana_address,
        created_at: user.created_at,
        last_active: user.last_active
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
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



  // Post methods
  async getPosts(filters?: { category?: string; creatorId?: string; type?: string; sort?: string }): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('status', 'published');

    if (filters?.creatorId) {
      query = query.eq('creator_id', filters.creatorId);
    }

    if (filters?.type) {
      if (filters.type === 'photo') {
        query = query.or('media_url.like.%.jpg%,media_url.like.%.jpeg%,media_url.like.%.png%,media_url.like.%.gif%,media_url.like.%.webp%');
      } else if (filters.type === 'video') {
        query = query.or('media_url.like.%.mp4%,media_url.like.%.webm%,media_url.like.%.mov%,media_url.like.%.avi%,tags.cs.{video}');
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
        creator_id: post.creator_id,
        media_url: post.media_url,
        thumb_url: post.thumb_url,
        caption: post.caption,
        price_lamports: post.price_lamports,
        visibility: post.visibility,
        status: post.status,
        tags: post.tags
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

  async likePost(postId: string, userId: string): Promise<boolean> {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) return false;

    // Add like
    const { error: likeError } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });

    if (likeError) return false;

    // Update post like count
    const { error: updateError } = await supabase
      .from('posts')
      .update({ likes: supabase.raw('likes + 1') })
      .eq('id', postId);

    return !updateError;
  }

  async unlikePost(postId: string, userId: string): Promise<boolean> {
    // Remove like
    const { error: deleteError } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (deleteError) return false;

    // Update post like count
    const { error: updateError } = await supabase
      .from('posts')
      .update({ likes: supabase.raw('GREATEST(likes - 1, 0)') })
      .eq('id', postId);

    return !updateError;
  }

  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  }

  // Token methods
  async getTokens(creatorId?: string): Promise<Token[]> {
    let query = supabase.from('tokens').select('*');
    
    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    const { data, error } = await query;

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
        creator_id: token.creator_id,
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

  // Purchase methods
  async getPurchases(userId: string): Promise<Purchase[]> {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to get purchases: ${error.message}`);
    
    return (data || []).map(purchase => ({
      ...purchase,
      created_at: new Date(purchase.created_at)
    }));
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        user_id: purchase.user_id,
        post_id: purchase.post_id,
        amount_lamports: purchase.amount_lamports,
        txn_sig: purchase.txn_sig
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create purchase: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async hasPurchased(userId: string, postId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    return !error && !!data;
  }

  // Tip methods
  async getTips(userId: string): Promise<Tip[]> {
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .or(`from_user.eq.${userId},to_user.eq.${userId}`);

    if (error) throw new Error(`Failed to get tips: ${error.message}`);
    
    return (data || []).map(tip => ({
      ...tip,
      created_at: new Date(tip.created_at)
    }));
  }

  async createTip(tip: InsertTip): Promise<Tip> {
    const { data, error } = await supabase
      .from('tips')
      .insert({
        from_user: tip.from_user,
        to_user: tip.to_user,
        amount_lamports: tip.amount_lamports,
        message: tip.message,
        txn_sig: tip.txn_sig
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create tip: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  // AI Persona methods
  async getPersona(creatorId: string): Promise<AiPersona | undefined> {
    const { data, error } = await supabase
      .from('ai_personas')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    if (error || !data) return undefined;
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async createPersona(persona: InsertAiPersona): Promise<AiPersona> {
    const { data, error } = await supabase
      .from('ai_personas')
      .insert({
        creator_id: persona.creator_id,
        system_prompt: persona.system_prompt,
        price_per_message: persona.price_per_message,
        is_active: persona.is_active
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create persona: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async upsertPersona(persona: InsertAiPersona): Promise<AiPersona> {
    const { data, error } = await supabase
      .from('ai_personas')
      .upsert({
        creator_id: persona.creator_id,
        system_prompt: persona.system_prompt,
        price_per_message: persona.price_per_message,
        is_active: persona.is_active
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to upsert persona: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  // Chat Message methods
  async getChatMessages(creatorId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to get chat messages: ${error.message}`);
    
    return (data || []).map(message => ({
      ...message,
      created_at: new Date(message.created_at)
    }));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: message.user_id,
        creator_id: message.creator_id,
        role: message.role,
        content: message.content,
        txn_sig: message.txn_sig
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create chat message: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  // Follow methods
  async getFollowers(userId: string): Promise<User[]> {
    // First get the follower IDs
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (followsError) throw new Error(`Failed to get followers: ${followsError.message}`);
    
    if (!follows || follows.length === 0) return [];

    // Then get the user details for each follower
    const followerIds = follows.map(f => f.follower_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', followerIds);

    if (usersError) throw new Error(`Failed to get follower users: ${usersError.message}`);
    
    return (users || []).map(user => ({
      ...user,
      created_at: new Date(user.created_at)
    }));
  }

  async getFollowing(userId: string): Promise<User[]> {
    // First get the following IDs
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followsError) throw new Error(`Failed to get following: ${followsError.message}`);
    
    if (!follows || follows.length === 0) return [];

    // Then get the user details for each following
    const followingIds = follows.map(f => f.following_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', followingIds);

    if (usersError) throw new Error(`Failed to get following users: ${usersError.message}`);
    
    return (users || []).map(user => ({
      ...user,
      created_at: new Date(user.created_at)
    }));
  }

  async getFollowerCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (error) throw new Error(`Failed to get follower count: ${error.message}`);
    return count || 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (error) throw new Error(`Failed to get following count: ${error.message}`);
    return count || 0;
  }

  async followUser(followerId: string, followingId: string): Promise<Follow> {
    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to follow user: ${error.message}`);
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    return !error;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    return !error && !!data;
  }

  // Search methods
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`handle.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to search users: ${error.message}`);
    
    return (data || []).map(user => ({
      ...user,
      created_at: new Date(user.created_at)
    }));
  }

  async searchPosts(query: string, limit: number = 10): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .or(`caption.ilike.%${query}%,tags.cs.{${query}}`)
      .eq('status', 'published')
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to search posts: ${error.message}`);
    
    return (data || []).map(post => ({
      ...post,
      created_at: new Date(post.created_at),
      updated_at: new Date(post.updated_at)
    }));
  }

  async searchAll(query: string, limit: number = 10): Promise<{
    users: User[];
    posts: Post[];
    tokens: Token[];
  }> {
    const [users, posts, tokensResult] = await Promise.all([
      this.searchUsers(query, limit),
      this.searchPosts(query, limit),
      this.searchTokens(query, limit)
    ]);

    return { users, posts, tokens: tokensResult };
  }

  private async searchTokens(query: string, limit: number = 10): Promise<Token[]> {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .or(`name.ilike.%${query}%,symbol.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to search tokens: ${error.message}`);
    
    return (data || []).map(token => ({
      ...token,
      created_at: new Date(token.created_at)
    }));
  }

  // Activity methods
  async getActivities(userId?: string, limit: number = 50): Promise<Activity[]> {
    let query = supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.or(`user_id.is.null,user_id.eq.${userId},target_user_id.eq.${userId}`);
    }

    const { data, error } = await query;

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

  async markActivityAsRead(activityId: string): Promise<Activity | undefined> {
    const { data, error } = await supabase
      .from('activities')
      .update({ is_read: true })
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw new Error(`Failed to mark activity as read: ${error.message}`);
    
    return data ? {
      ...data,
      created_at: new Date(data.created_at)
    } : undefined;
  }

  async getUnreadActivityCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .or(`user_id.is.null,user_id.eq.${userId},target_user_id.eq.${userId}`);

    if (error) throw new Error(`Failed to get unread activity count: ${error.message}`);
    
    return count || 0;
  }

  // Live Stream methods
  async getLiveStreams(creatorId?: string, status?: string): Promise<LiveStream[]> {
    let query = supabase
      .from('live_streams')
      .select('*')
      .order('created_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

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
}
