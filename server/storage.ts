import { type User, type InsertUser, type Post, type InsertPost, type Token, type InsertToken, type Purchase, type InsertPurchase, type Tip, type InsertTip, type AiPersona, type InsertAiPersona, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByHandle(handle: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Posts
  getPosts(filters?: { category?: string; creatorId?: string }): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined>;

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
  createTip(tip: InsertTip): Promise<Tip>;

  // AI Personas
  getPersona(creatorId: string): Promise<AiPersona | undefined>;
  createPersona(persona: InsertAiPersona): Promise<AiPersona>;
  upsertPersona(persona: InsertAiPersona): Promise<AiPersona>;

  // Chat Messages
  getChatMessages(userId: string, creatorId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private tokens: Map<string, Token>;
  private purchases: Map<string, Purchase>;
  private tips: Map<string, Tip>;
  private personas: Map<string, AiPersona>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.tokens = new Map();
    this.purchases = new Map();
    this.tips = new Map();
    this.personas = new Map();
    this.chatMessages = new Map();

    // Initialize with sample data for development
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample creators
    const creators = [
      {
        id: 'creator1',
        handle: 'sarah_creates',
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
        banner_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=200&fit=crop',
        bio: 'Premium crypto content creator • 1.2M followers',
        age_verified: true,
        is_creator: true,
        created_at: new Date(),
      },
      {
        id: 'creator2',
        handle: 'crypto_queen',
        avatar_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
        banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=200&fit=crop',
        bio: 'Digital artist & GOON token innovator',
        age_verified: true,
        is_creator: true,
        created_at: new Date(),
      },
    ];

    creators.forEach(creator => this.users.set(creator.id, creator));

    // Sample posts
    const samplePosts = [
      {
        id: 'post1',
        creator_id: 'creator1',
        media_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
        caption: 'Premium Content - Studio Session',
        price_lamports: 50000000, // 0.05 SOL
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['premium', 'studio'],
        views: 2100000,
        likes: 45000,
        created_at: new Date(),
      },
      {
        id: 'post2',
        creator_id: 'creator2',
        media_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=533&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=533&fit=crop',
        caption: 'Artistic Portrait Series',
        price_lamports: 0,
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['art', 'portrait'],
        views: 856000,
        likes: 23000,
        created_at: new Date(),
      },
    ];

    samplePosts.forEach(post => this.posts.set(post.id, post));

    // Sample tokens
    const sampleTokens = [
      {
        id: 'token1',
        creator_id: 'creator1',
        mint_address: '2BxkGHtRjyZp3Q7vL8sM9XN4JeRaKjWzDxYpGqNvgoon',
        name: 'SARAH GOON',
        symbol: 'GOON',
        supply: 1000000,
        image_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=200&h=200&fit=crop',
        description: 'Official token for Sarah Creates',
        created_at: new Date(),
      },
    ];

    sampleTokens.forEach(token => this.tokens.set(token.id, token));

    // Sample AI personas
    const samplePersona1 = {
      id: 'persona1',
      creator_id: 'creator1',
      system_prompt: 'You are Sarah, a flirty and engaging content creator. Respond in character with a playful, confident tone. Keep responses concise and engaging.',
      price_per_message: 1000000, // 0.001 SOL
      is_active: true,
      created_at: new Date(),
    };

    const samplePersona2 = {
      id: 'persona2',
      creator_id: 'creator2',
      system_prompt: 'You are Crypto Queen, a digital artist and GOON token innovator. You are creative, artistic, and love to inspire others. You have a playful personality and enjoy flirting while sharing your artistic vision.',
      price_per_message: 1500000, // 0.0015 SOL
      is_active: true,
      created_at: new Date(),
    };

    this.personas.set('creator1', samplePersona1);
    this.personas.set('creator2', samplePersona2);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByHandle(handle: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.handle === handle);
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

  // Post methods
  async getPosts(filters?: { category?: string; creatorId?: string }): Promise<Post[]> {
    let posts = Array.from(this.posts.values());
    
    if (filters?.creatorId) {
      posts = posts.filter(post => post.creator_id === filters.creatorId);
    }
    
    return posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    return post;
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, ...updates };
    this.posts.set(id, updatedPost);
    return updatedPost;
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
}

export const storage = new MemStorage();
