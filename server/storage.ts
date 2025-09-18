import { type Post, type InsertPost, type Token, type InsertToken, type Activity, type InsertActivity, type Tip, type InsertTip, type LiveChatMessage, type InsertLiveChatMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Posts
  getPosts(filters?: { category?: string; type?: string; sort?: string }): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined>;
  incrementPostViews(id: string): Promise<Post | undefined>;
  likePost(postId: string): Promise<boolean>;
  unlikePost(postId: string): Promise<boolean>;

  // Tokens
  getTokens(): Promise<Token[]>;
  getToken(id: string): Promise<Token | undefined>;
  createToken(token: InsertToken): Promise<Token>;

  // Activities
  getActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Tips
  getTips(postId?: string): Promise<Tip[]>;
  createTip(tip: InsertTip): Promise<Tip>;

  // Live Chat (for streams)
  getLiveChatMessages(postId: string, limit?: number, offset?: number): Promise<LiveChatMessage[]>;
  createLiveChatMessage(message: InsertLiveChatMessage): Promise<LiveChatMessage>;

  // Stream helpers (using Post with is_live: true)
  getLiveStreams(): Promise<Post[]>;
  endLiveStream(postId: string): Promise<Post | undefined>;
  updateStreamViewerCount(postId: string, viewerCount: number): Promise<Post | undefined>;

}

export class MemStorage implements IStorage {
  private posts: Map<string, Post>;
  private tokens: Map<string, Token>;
  private likes: Map<string, { postId: string; created_at: Date }>;
  private activities: Map<string, Activity>;
  private tips: Map<string, Tip>;
  private chatMessages: Map<string, LiveChatMessage>;

  constructor() {
    this.posts = new Map();
    this.tokens = new Map();
    this.likes = new Map();
    this.activities = new Map();
    this.tips = new Map();
    this.chatMessages = new Map();

    // Initialize empty storage
  }


  // Post methods
  async getPosts(filters?: { category?: string; type?: string; sort?: string }): Promise<Post[]> {
    let posts = Array.from(this.posts.values());
    
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
    
    // Create anonymous activity for new post
    await this.createActivity({
      type: 'content_update',
      title: 'New content posted',
      description: insertPost.caption || 'New anonymous post',
      is_read: false,
      metadata: {
        post_id: id,
        post_preview: insertPost.caption
      }
    });
    
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

  async likePost(postId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) return false;

    // Add anonymous like
    const likeKey = `${postId}-${Date.now()}`;
    this.likes.set(likeKey, { postId, created_at: new Date() });
    
    // Update post like count
    const updatedPost = { ...post, likes: post.likes + 1 };
    this.posts.set(postId, updatedPost);
    
    return true;
  }

  async unlikePost(postId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) return false;

    // Find and remove any like for this post (anonymous)
    const likesToRemove = Array.from(this.likes.entries())
      .filter(([_, like]) => like.postId === postId)
      .slice(0, 1); // Remove only one like
    
    if (likesToRemove.length === 0) return false;

    // Remove like
    this.likes.delete(likesToRemove[0][0]);
    
    // Update post like count
    const updatedPost = { ...post, likes: Math.max(0, post.likes - 1) };
    this.posts.set(postId, updatedPost);
    
    return true;
  }


  // Token methods
  async getTokens(): Promise<Token[]> {
    return Array.from(this.tokens.values());
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

  // Activity methods
  async getActivities(limit: number = 50): Promise<Activity[]> {
    let activities = Array.from(this.activities.values());
    
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


  // Tips methods
  async getTips(postId?: string): Promise<Tip[]> {
    let tips = Array.from(this.tips.values());
    
    if (postId) {
      tips = tips.filter(tip => tip.post_id === postId);
    }
    
    // Sort by creation date (newest first)
    tips.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    return tips;
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

  // Live Chat methods (using post_id for streams)
  async getLiveChatMessages(postId: string, limit: number = 50, offset: number = 0): Promise<LiveChatMessage[]> {
    let messages = Array.from(this.chatMessages.values())
      .filter(msg => msg.post_id === postId);
    
    // Sort by creation date (oldest first for chat)
    messages.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    
    // Apply pagination
    return messages.slice(offset, offset + limit);
  }

  async createLiveChatMessage(insertMessage: InsertLiveChatMessage): Promise<LiveChatMessage> {
    const id = randomUUID();
    const message: LiveChatMessage = {
      ...insertMessage,
      id,
      created_at: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  // Stream helper methods (using Post with is_live: true)
  async getLiveStreams(): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.is_live && !post.ended_at)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async endLiveStream(postId: string): Promise<Post | undefined> {
    const post = this.posts.get(postId);
    if (!post || !post.is_live) return undefined;
    
    const endedPost = { ...post, ended_at: new Date() };
    this.posts.set(postId, endedPost);
    return endedPost;
  }

  async updateStreamViewerCount(postId: string, viewerCount: number): Promise<Post | undefined> {
    const post = this.posts.get(postId);
    if (!post || !post.is_live) return undefined;
    
    const currentMetadata = post.metadata || {};
    const updatedPost = { 
      ...post, 
      metadata: {
        ...currentMetadata,
        viewer_count: viewerCount,
        max_viewers: Math.max(currentMetadata.max_viewers || 0, viewerCount)
      }
    };
    this.posts.set(postId, updatedPost);
    return updatedPost;
  }
}

// Remove singleton - will be imported from index.ts
