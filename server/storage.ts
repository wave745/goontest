import { type User, type InsertUser, type Post, type InsertPost, type Token, type InsertToken, type Purchase, type InsertPurchase, type Tip, type InsertTip, type AiPersona, type InsertAiPersona, type ChatMessage, type InsertChatMessage, type Follow, type InsertFollow, type Activity, type InsertActivity, type LiveStream, type InsertLiveStream } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByHandle(handle: string): Promise<User | undefined>;
  getUserByGoonUsername(goonUsername: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserSolanaAddress(id: string, solanaAddress: string): Promise<User | undefined>;
  updateUserLastActive(id: string): Promise<User | undefined>;

  // Posts
  getPosts(filters?: { category?: string; creatorId?: string; type?: string; sort?: string }): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined>;
  incrementPostViews(id: string): Promise<Post | undefined>;
  likePost(postId: string, userId: string): Promise<boolean>;
  unlikePost(postId: string, userId: string): Promise<boolean>;
  isPostLiked(postId: string, userId: string): Promise<boolean>;

  // Tokens
  getTokens(creatorId?: string): Promise<Token[]>;
  getToken(id: string): Promise<Token | undefined>;
  createToken(token: InsertToken): Promise<Token>;

  // Purchases
  getPurchases(userId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  hasPurchased(userId: string, postId: string): Promise<boolean>;

  // Tips
  getTips(userId: string): Promise<Tip[]>;
  getAllTips(): Promise<Tip[]>;
  createTip(tip: InsertTip): Promise<Tip>;

  // AI Personas
  getPersona(creatorId: string): Promise<AiPersona | undefined>;
  createPersona(persona: InsertAiPersona): Promise<AiPersona>;
  upsertPersona(persona: InsertAiPersona): Promise<AiPersona>;

  // Chat Messages
  getChatMessages(userId: string, creatorId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Follows
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  followUser(followerId: string, followingId: string): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // Activities
  getActivities(userId?: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  markActivityAsRead(activityId: string): Promise<Activity | undefined>;
  getUnreadActivityCount(userId: string): Promise<number>;

  // Live Streams
  getLiveStreams(creatorId?: string, status?: string): Promise<LiveStream[]>;
  getLiveStream(id: string): Promise<LiveStream | undefined>;
  createLiveStream(stream: InsertLiveStream): Promise<LiveStream>;
  updateLiveStream(id: string, updates: Partial<LiveStream>): Promise<LiveStream | undefined>;
  endLiveStream(id: string): Promise<LiveStream | undefined>;
  getActiveStreams(): Promise<LiveStream[]>;
  updateStreamViewerCount(id: string, viewerCount: number): Promise<LiveStream | undefined>;

  // Live Chat
  getLiveChatMessages(streamId: string, limit: number, offset: number): Promise<any[]>;
  createLiveChatMessage(message: InsertLiveChatMessage): Promise<any>;

}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private tokens: Map<string, Token>;
  private purchases: Map<string, Purchase>;
  private tips: Map<string, Tip>;
  private personas: Map<string, AiPersona>;
  private chatMessages: Map<string, ChatMessage>;
  private follows: Map<string, Follow>;
  private likes: Map<string, { postId: string; userId: string; created_at: Date }>;
  private activities: Map<string, Activity>;
  private liveStreams: Map<string, LiveStream>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.tokens = new Map();
    this.purchases = new Map();
    this.tips = new Map();
    this.personas = new Map();
    this.chatMessages = new Map();
    this.follows = new Map();
    this.likes = new Map();
    this.activities = new Map();
    this.liveStreams = new Map();

    // Initialize empty storage
  }


  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByHandle(handle: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.handle === handle);
  }

  async getUserByGoonUsername(goonUsername: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.goon_username === goonUsername);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      created_at: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserSolanaAddress(id: string, solanaAddress: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, solana_address: solanaAddress };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserLastActive(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, last_active: new Date().toISOString() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Post methods
  async getPosts(filters?: { category?: string; creatorId?: string; type?: string; sort?: string }): Promise<Post[]> {
    let posts = Array.from(this.posts.values());
    
    if (filters?.creatorId) {
      posts = posts.filter(post => post.creator_id === filters.creatorId);
    }
    
    if (filters?.type) {
      if (filters.type === 'photo') {
        posts = posts.filter(post => {
          const url = post.media_url.toLowerCase();
          return url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp');
        });
      } else if (filters.type === 'video') {
        posts = posts.filter(post => {
          const url = post.media_url.toLowerCase();
          return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('.avi');
        });
      }
    }
    
    // Sort posts
    if (filters?.sort === 'trending') {
      // Sort by engagement (likes + views)
      posts = posts.sort((a, b) => (b.likes + b.views) - (a.likes + a.views));
    } else {
      // Default: sort by latest
      posts = posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return posts;
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = randomUUID();
    const post: Post = {
      ...insertPost,
      id,
      views: 0,
      likes: 0,
      created_at: new Date(),
    };
    this.posts.set(id, post);
    
    // Create following activity for followers
    const creator = this.users.get(insertPost.creator_id);
    if (creator) {
      const followers = await this.getFollowers(insertPost.creator_id);
      for (const follower of followers) {
        await this.createActivity({
          type: 'following_post',
          user_id: follower.id,
          target_user_id: insertPost.creator_id,
          post_id: id,
          title: `${creator.handle || creator.id} posted new content`,
          description: insertPost.caption,
          metadata: {
            post_preview: insertPost.caption,
            creator_handle: creator.handle,
            creator_avatar: creator.avatar_url
          }
        });
      }
    }
    
    return post;
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, ...updates };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async incrementPostViews(id: string): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, views: post.views + 1 };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async likePost(postId: string, userId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) return false;

    // Check if already liked
    const likeKey = `${postId}-${userId}`;
    if (this.likes.has(likeKey)) return false;

    // Add like
    this.likes.set(likeKey, { postId, userId, created_at: new Date() });
    
    // Update post like count
    const updatedPost = { ...post, likes: post.likes + 1 };
    this.posts.set(postId, updatedPost);
    
    return true;
  }

  async unlikePost(postId: string, userId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) return false;

    const likeKey = `${postId}-${userId}`;
    if (!this.likes.has(likeKey)) return false;

    // Remove like
    this.likes.delete(likeKey);
    
    // Update post like count
    const updatedPost = { ...post, likes: Math.max(0, post.likes - 1) };
    this.posts.set(postId, updatedPost);
    
    return true;
  }

  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const likeKey = `${postId}-${userId}`;
    return this.likes.has(likeKey);
  }

  // Token methods
  async getTokens(creatorId?: string): Promise<Token[]> {
    let tokens = Array.from(this.tokens.values());
    
    if (creatorId) {
      tokens = tokens.filter(token => token.creator_id === creatorId);
    }
    
    return tokens;
  }

  async getToken(id: string): Promise<Token | undefined> {
    return this.tokens.get(id);
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    const id = randomUUID();
    const token: Token = {
      ...insertToken,
      id,
      created_at: new Date(),
    };
    this.tokens.set(id, token);
    return token;
  }

  // Purchase methods
  async getPurchases(userId: string): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter(purchase => purchase.user_id === userId);
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = randomUUID();
    const purchase: Purchase = {
      ...insertPurchase,
      id,
      created_at: new Date(),
    };
    this.purchases.set(id, purchase);
    return purchase;
  }

  async hasPurchased(userId: string, postId: string): Promise<boolean> {
    return Array.from(this.purchases.values()).some(
      purchase => purchase.user_id === userId && purchase.post_id === postId
    );
  }

  // Tip methods
  async getTips(userId: string): Promise<Tip[]> {
    return Array.from(this.tips.values()).filter(tip => tip.from_user === userId || tip.to_user === userId);
  }

  async getAllTips(): Promise<Tip[]> {
    return Array.from(this.tips.values());
  }

  async createTip(insertTip: InsertTip): Promise<Tip> {
    const id = randomUUID();
    const tip: Tip = {
      ...insertTip,
      id,
      created_at: new Date(),
    };
    this.tips.set(id, tip);
    return tip;
  }

  // AI Persona methods
  async getPersona(creatorId: string): Promise<AiPersona | undefined> {
    return this.personas.get(creatorId);
  }

  async createPersona(insertPersona: InsertAiPersona): Promise<AiPersona> {
    const id = randomUUID();
    const persona: AiPersona = {
      ...insertPersona,
      id,
      created_at: new Date(),
    };
    this.personas.set(insertPersona.creator_id, persona);
    return persona;
  }

  async upsertPersona(insertPersona: InsertAiPersona): Promise<AiPersona> {
    const existingPersona = this.personas.get(insertPersona.creator_id);
    
    if (existingPersona) {
      // Update existing persona
      const updatedPersona: AiPersona = {
        ...existingPersona,
        system_prompt: insertPersona.system_prompt,
        price_per_message: insertPersona.price_per_message,
        is_active: insertPersona.is_active,
        updated_at: new Date(),
      };
      this.personas.set(insertPersona.creator_id, updatedPersona);
      return updatedPersona;
    } else {
      // Create new persona
      return this.createPersona(insertPersona);
    }
  }

  // Chat Message methods
  async getChatMessages(userId: string, creatorId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(
      msg => (msg.user_id === userId && msg.creator_id === creatorId)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      created_at: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  // Follow methods
  async getFollowers(userId: string): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(follow => follow.following_id === userId)
      .map(follow => follow.follower_id);
    
    return followerIds.map(id => this.users.get(id)).filter(Boolean) as User[];
  }

  async getFollowing(userId: string): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(follow => follow.follower_id === userId)
      .map(follow => follow.following_id);
    
    return followingIds.map(id => this.users.get(id)).filter(Boolean) as User[];
  }

  async getFollowerCount(userId: string): Promise<number> {
    return Array.from(this.follows.values())
      .filter(follow => follow.following_id === userId).length;
  }

  async getFollowingCount(userId: string): Promise<number> {
    return Array.from(this.follows.values())
      .filter(follow => follow.follower_id === userId).length;
  }

  async followUser(followerId: string, followingId: string): Promise<Follow> {
    // Check if already following
    const existingFollow = Array.from(this.follows.values()).find(
      follow => follow.follower_id === followerId && follow.following_id === followingId
    );
    
    if (existingFollow) {
      return existingFollow;
    }

    const id = randomUUID();
    const follow: Follow = {
      id,
      follower_id: followerId,
      following_id: followingId,
      created_at: new Date(),
    };
    this.follows.set(id, follow);
    
    // Create activity for the user being followed
    const follower = this.users.get(followerId);
    const following = this.users.get(followingId);
    
    if (follower && following) {
      await this.createActivity({
        type: 'following_tip', // Using this type for new followers
        user_id: followingId,
        target_user_id: followerId,
        title: `🎉 New follower: ${follower.handle || follower.id}`,
        description: `${follower.handle || follower.id} started following you!`,
        metadata: {
          follower_handle: follower.handle,
          follower_avatar: follower.avatar_url,
          follower_id: followerId
        }
      });
    }
    
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const followToRemove = Array.from(this.follows.values()).find(
      follow => follow.follower_id === followerId && follow.following_id === followingId
    );
    
    if (followToRemove) {
      this.follows.delete(followToRemove.id);
      return true;
    }
    return false;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      follow => follow.follower_id === followerId && follow.following_id === followingId
    );
  }


  // Activity methods
  async getActivities(userId?: string, limit: number = 50): Promise<Activity[]> {
    let activities = Array.from(this.activities.values());
    
    // If userId is provided, filter for user-specific activities or global activities
    if (userId) {
      activities = activities.filter(activity => 
        !activity.user_id || // Global activities (core updates, launches)
        activity.user_id === userId || // User's own activities
        activity.target_user_id === userId // Activities about the user
      );
    }
    
    // Sort by creation date (newest first)
    activities.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    return activities.slice(0, limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const newActivity: Activity = {
      ...activity,
      id,
      created_at: new Date(),
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async markActivityAsRead(activityId: string): Promise<Activity | undefined> {
    const activity = this.activities.get(activityId);
    if (activity) {
      activity.is_read = true;
      this.activities.set(activityId, activity);
    }
    return activity;
  }

  async getUnreadActivityCount(userId: string): Promise<number> {
    const activities = Array.from(this.activities.values());
    return activities.filter(activity => 
      !activity.is_read && 
      (!activity.user_id || activity.user_id === userId || activity.target_user_id === userId)
    ).length;
  }

  // Live Stream methods
  async getLiveStreams(creatorId?: string, status?: string): Promise<LiveStream[]> {
    let streams = Array.from(this.liveStreams.values());
    
    if (creatorId) {
      streams = streams.filter(stream => stream.creator_id === creatorId);
    }
    
    if (status) {
      streams = streams.filter(stream => stream.status === status);
    }
    
    // Sort by creation date (newest first)
    streams.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    return streams;
  }

  async getLiveStream(id: string): Promise<LiveStream | undefined> {
    return this.liveStreams.get(id);
  }

  async createLiveStream(insertStream: InsertLiveStream): Promise<LiveStream> {
    const id = randomUUID();
    const stream: LiveStream = {
      ...insertStream,
      id,
      created_at: new Date(),
    };
    this.liveStreams.set(id, stream);
    return stream;
  }

  async updateLiveStream(id: string, updates: Partial<LiveStream>): Promise<LiveStream | undefined> {
    const stream = this.liveStreams.get(id);
    if (!stream) return undefined;
    
    const updatedStream = { ...stream, ...updates };
    this.liveStreams.set(id, updatedStream);
    return updatedStream;
  }

  async endLiveStream(id: string): Promise<LiveStream | undefined> {
    const stream = this.liveStreams.get(id);
    if (!stream) return undefined;
    
    const endedStream: LiveStream = {
      ...stream,
      status: 'ended',
      ended_at: new Date(),
    };
    this.liveStreams.set(id, endedStream);
    return endedStream;
  }

  async getActiveStreams(): Promise<LiveStream[]> {
    return Array.from(this.liveStreams.values())
      .filter(stream => stream.status === 'live')
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async updateStreamViewerCount(id: string, viewerCount: number): Promise<LiveStream | undefined> {
    const stream = this.liveStreams.get(id);
    if (!stream) return undefined;
    
    const updatedStream = { 
      ...stream, 
      viewer_count: viewerCount,
      max_viewers: Math.max(stream.max_viewers, viewerCount)
    };
    this.liveStreams.set(id, updatedStream);
    return updatedStream;
  }

  // Live Chat methods
  async getLiveChatMessages(streamId: string, limit: number, offset: number): Promise<any[]> {
    // For now, return empty array - in a real implementation, this would query a chat messages table
    return [];
  }

  async createLiveChatMessage(message: InsertLiveChatMessage): Promise<any> {
    // For now, return a mock message - in a real implementation, this would store in a chat messages table
    return {
      id: randomUUID(),
      ...message,
      created_at: new Date(),
    };
  }
}

export const storage = new MemStorage();
