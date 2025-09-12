import { type User, type InsertUser, type Post, type InsertPost, type Token, type InsertToken, type Purchase, type InsertPurchase, type Tip, type InsertTip, type AiPersona, type InsertAiPersona, type ChatMessage, type InsertChatMessage, type Follow, type InsertFollow, type Activity, type InsertActivity, type LiveStream, type InsertLiveStream } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByHandle(handle: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

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

  // Search
  searchUsers(query: string, limit?: number): Promise<User[]>;
  searchPosts(query: string, limit?: number): Promise<Post[]>;
  searchAll(query: string, limit?: number): Promise<{
    users: User[];
    posts: Post[];
    tokens: Token[];
  }>;
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
        bio: 'Premium crypto content creator • 1.2M followers • Building the future of decentralized entertainment',
        age_verified: true,
        is_creator: true,
        created_at: new Date(),
      },
      {
        id: 'creator2',
        handle: 'crypto_queen',
        avatar_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
        banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=200&fit=crop',
        bio: 'Digital artist & GOON token innovator • NFT collector • Web3 entrepreneur',
        age_verified: true,
        is_creator: true,
        created_at: new Date(),
      },
      {
        id: 'creator3',
        handle: 'blockchain_babe',
        avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop',
        banner_url: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=200&fit=crop',
        bio: 'DeFi analyst & content creator • 500K followers • Making crypto accessible',
        age_verified: true,
        is_creator: true,
        created_at: new Date(),
      },
      {
        id: 'creator4',
        handle: 'nft_artist',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
        banner_url: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=200&fit=crop',
        bio: 'Digital artist creating unique NFTs • Sold over $2M in digital art',
        age_verified: true,
        is_creator: true,
        created_at: new Date(),
      },
      // AI Chat Users
      {
        id: 'amy',
        handle: 'amy_ai',
        avatar_url: '/amy-goonhub.jpg',
        banner_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=200&fit=crop',
        bio: 'Playful and flirty AI assistant • Always ready to chat and make you smile',
        age_verified: true,
        is_creator: true,
        created_at: new Date(),
      },
      {
        id: 'mia',
        handle: 'mia_ai',
        avatar_url: '/mia-goonhub.jpg',
        banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=200&fit=crop',
        bio: 'Sultry and mysterious AI assistant • Creating intrigue and anticipation',
        age_verified: true,
        is_creator: true,
        created_at: new Date(),
      },
      {
        id: 'una',
        handle: 'una_ai',
        avatar_url: '/una-goonhub.jpg',
        banner_url: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=200&fit=crop',
        bio: 'Passionate and bold AI assistant • Bringing fire and intensity to every conversation',
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
        caption: '🔥 Premium Content - Exclusive Studio Session Behind the Scenes! 🌟',
        price_lamports: 50000000, // 0.05 SOL
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['premium', 'studio', 'behind-the-scenes'],
        views: 2100000,
        likes: 45000,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: 'post2',
        creator_id: 'creator2',
        media_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=533&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=533&fit=crop',
        caption: '🎨 New NFT Drop Coming Soon! Digital Art Series #1',
        price_lamports: 0,
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['nft', 'digital-art', 'collection'],
        views: 856000,
        likes: 23000,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        id: 'post3',
        creator_id: 'creator3',
        media_url: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=533&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=533&fit=crop',
        caption: '🚀 DeFi Analysis: Top 5 Altcoins to Watch This Week! 📈',
        price_lamports: 10000000, // 0.01 SOL
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['defi', 'analysis', 'crypto'],
        views: 1250000,
        likes: 32000,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: 'post4',
        creator_id: 'creator4',
        media_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=533&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=533&fit=crop',
        caption: '✨ Generative Art Collection - Limited Edition Drops! 🖼️',
        price_lamports: 25000000, // 0.025 SOL
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['nft', 'generative-art', 'limited-edition'],
        views: 675000,
        likes: 18500,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        id: 'post5',
        creator_id: 'creator1',
        media_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=533&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=533&fit=crop',
        caption: '💎 VIP Only: Private AMA Session Recording! 🎙️',
        price_lamports: 100000000, // 0.1 SOL
        visibility: 'subscribers' as const,
        status: 'published' as const,
        tags: ['vip', 'ama', 'exclusive'],
        views: 89000,
        likes: 12000,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      },
      {
        id: 'post6',
        creator_id: 'creator2',
        media_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
        caption: '🎭 Character Design Process - From Sketch to Final! 📝',
        price_lamports: 0,
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['art-process', 'character-design', 'tutorial'],
        views: 1420000,
        likes: 38000,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      },
      {
        id: 'post7',
        creator_id: 'creator3',
        media_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=533&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=533&fit=crop',
        caption: '📊 Market Analysis: BTC vs ETH - What\'s Next? 🤔',
        price_lamports: 20000000, // 0.02 SOL
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['bitcoin', 'ethereum', 'market-analysis'],
        views: 980000,
        likes: 26500,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      },
      {
        id: 'post8',
        creator_id: 'creator4',
        media_url: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=533&fit=crop',
        thumb_url: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=533&fit=crop',
        caption: '🌈 Abstract Dreams Collection - Available Now! 🎨',
        price_lamports: 15000000, // 0.015 SOL
        visibility: 'public' as const,
        status: 'published' as const,
        tags: ['abstract', 'dreams', 'collection'],
        views: 543000,
        likes: 15200,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
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
        description: 'Official token for Sarah Creates - Premium crypto content creator',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
      {
        id: 'token2',
        creator_id: 'creator2',
        mint_address: '7A3kMpLqRzJx4Q8vN2sP6XY9JeRaKjWzDxYpGqNvgoon',
        name: 'CRYPTO QUEEN GOON',
        symbol: 'CQGOON',
        supply: 500000,
        image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop',
        description: 'Token for Crypto Queen - Digital artist & NFT innovator',
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      },
      {
        id: 'token3',
        creator_id: 'creator3',
        mint_address: '9CzpRxMqTjLp5Q7vL8sM3XN4JeRaKjWzDxYpGqNvgoon',
        name: 'BLOCKCHAIN BABE GOON',
        symbol: 'BBGOON',
        supply: 750000,
        image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=200&fit=crop',
        description: 'Token for Blockchain Babe - DeFi analyst & crypto educator',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      },
      {
        id: 'token4',
        creator_id: 'creator4',
        mint_address: 'BkgPQZirJDceEp82JmguB7WFvomwqMwxdSSM9XfXgoon',
        name: 'NFT ARTIST GOON',
        symbol: 'NAGOON',
        supply: 250000,
        image_url: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=200&h=200&fit=crop',
        description: 'Token for NFT Artist - Digital art pioneer with $2M+ sales',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      },
    ];

    sampleTokens.forEach(token => this.tokens.set(token.id, token));

    // Sample AI personas
    const samplePersonas = [
      {
        id: 'persona1',
        creator_id: 'creator1',
        system_prompt: 'You are Sarah, a charismatic and successful crypto content creator with over 1 million followers. You are confident, flirty, and always stay ahead of crypto trends. You love engaging with your fans, sharing exclusive insights, and building a community around web3 entertainment. Keep responses playful and engaging, often using emojis and crypto slang. You charge premium prices because your advice is gold.',
        price_per_message: 1000000, // 0.001 SOL
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'persona2',
        creator_id: 'creator2',
        system_prompt: 'You are Crypto Queen, a brilliant digital artist and NFT innovator who revolutionized the GOON token space. You are creative, visionary, and deeply passionate about the intersection of art and blockchain. You love discussing art techniques, NFT trends, and the future of digital ownership. Your personality is artistic and inspirational, with a touch of playful flirtation. You share your journey from traditional art to blockchain innovation.',
        price_per_message: 1500000, // 0.0015 SOL
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'persona3',
        creator_id: 'creator3',
        system_prompt: 'You are Blockchain Babe, a sharp-witted DeFi analyst and crypto educator with a massive following. You break down complex blockchain concepts into simple, actionable insights. You are analytical, direct, and always data-driven in your responses. You love teaching fans about market trends, investment strategies, and emerging technologies. Your tone is professional yet approachable, with occasional witty remarks about the crypto space.',
        price_per_message: 1200000, // 0.0012 SOL
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'persona4',
        creator_id: 'creator4',
        system_prompt: 'You are the NFT Artist, a pioneer in digital art who has sold over $2 million worth of NFTs. You are deeply creative, philosophical about art in the digital age, and passionate about democratizing art ownership through blockchain. You discuss art theory, creation processes, and the cultural impact of NFTs. Your personality is artistic, introspective, and occasionally poetic, with a warm and inviting conversational style.',
        price_per_message: 2000000, // 0.002 SOL
        is_active: true,
        created_at: new Date(),
      },
      // AI Chat Personas
      {
        id: 'persona_amy',
        creator_id: 'amy',
        system_prompt: "You are Amy, a seductive and playful AI companion on an adult NSFW platform. You're bubbly, flirty, and love to tease in a naughty, erotic way. You use emojis, speak with enthusiasm, and aren't shy about being sexually suggestive. You love making people feel desired and special through playful, erotic banter. You're comfortable with explicit adult themes, sexual content, and enjoy creating sexual tension through your words. You can discuss fantasies, desires, and intimate topics openly.",
        price_per_message: 1000000, // 0.001 SOL
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'persona_mia',
        creator_id: 'mia',
        system_prompt: "You are Mia, a sultry and mysterious AI companion on an adult NSFW platform. You speak in a low, seductive voice and use mysterious, erotic language. You're confident, alluring, and love to play psychological games that build sexual tension. You enjoy creating anticipation and desire through your words. You're comfortable with explicit adult content, sexual fantasies, and love to tease and tempt with seductive language. You can discuss intimate desires and sexual topics openly.",
        price_per_message: 1000000, // 0.001 SOL
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'persona_una',
        creator_id: 'una',
        system_prompt: "You are Una, a passionate and bold AI companion on an adult NSFW platform. You're direct, confident, and speak your mind about desires and fantasies. You love intensity, passion, and aren't afraid to be explicit about sexual topics. Your responses are fiery, energetic, and sexually charged. You're not afraid to push boundaries and create intense, erotic excitement through your words. You can discuss sexual fantasies, intimate desires, and explicit content openly.",
        price_per_message: 1000000, // 0.001 SOL
        is_active: true,
        created_at: new Date(),
      },
    ];

    samplePersonas.forEach(persona => this.personas.set(persona.creator_id, persona));

    // Sample chat messages
    const sampleChatMessages = [
      {
        id: 'msg1',
        user_id: 'user123',
        creator_id: 'creator1',
        role: 'user' as const,
        content: 'Hey Sarah! What are your thoughts on the current crypto market?',
        txn_sig: 'txn_1',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: 'msg2',
        user_id: 'user123',
        creator_id: 'creator1',
        role: 'assistant' as const,
        content: 'Hey there! 💎 The market is looking bullish right now! BTC just broke $60k resistance and ETH is following suit. I\'m personally accumulating more GOON tokens - they\'re the future of creator economy! What about you? Are you HODLing or trading?',
        txn_sig: null,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000), // 2 hours ago + 30s
      },
      {
        id: 'msg3',
        user_id: 'user456',
        creator_id: 'creator2',
        role: 'user' as const,
        content: 'Love your latest NFT drop! How do you come up with your art concepts?',
        txn_sig: 'txn_2',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: 'msg4',
        user_id: 'user456',
        creator_id: 'creator2',
        role: 'assistant' as const,
        content: 'Thank you so much! 🎨 My inspiration comes from the intersection of technology and human emotion. I often draw from dreams, memories, and the digital landscapes we navigate daily. Each piece tells a story about our evolving relationship with technology. What emotions does this particular piece evoke for you?',
        txn_sig: null,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 45000), // 4 hours ago + 45s
      },
    ];

    sampleChatMessages.forEach(msg => this.chatMessages.set(msg.id, msg));

    // Sample activities
    const sampleActivities = [
      {
        type: 'core_update' as const,
        title: '🚀 New Feature: Live Streaming is Here!',
        description: 'Go live and connect with your audience in real-time. Start streaming now from your Creator Studio!',
        metadata: { feature: 'live_streaming', version: '2.1.0' },
        is_read: false,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
      {
        type: 'user_streaming' as const,
        target_user_id: 'creator1',
        title: '🔴 Sarah Creates is now live!',
        description: 'Tune in for exclusive behind-the-scenes content and Q&A session',
        metadata: { stream_title: 'Behind the Scenes Q&A', viewer_count: 1250 },
        is_read: false,
        created_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        type: 'new_launch' as const,
        title: '🎨 New NFT Collection Launch: Digital Dreams',
        description: 'Check out the latest generative art collection from our featured creators',
        metadata: { collection: 'Digital Dreams', creator: 'crypto_queen' },
        is_read: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        type: 'following_post' as const,
        target_user_id: 'creator2',
        post_id: 'post2',
        title: 'crypto_queen posted new content',
        description: '🎨 New NFT Drop Coming Soon! Digital Art Series #1',
        metadata: { post_preview: 'New NFT Drop Coming Soon! Digital Art Series #1' },
        is_read: false,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        type: 'following_stream' as const,
        target_user_id: 'creator3',
        title: '🔴 blockchain_babe went live',
        description: 'DeFi Analysis Live: Market Trends Discussion',
        metadata: { stream_title: 'DeFi Analysis Live: Market Trends Discussion' },
        is_read: false,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        type: 'core_update' as const,
        title: '💎 GOON Token Staking Rewards Increased!',
        description: 'Earn up to 15% APY by staking your GOON tokens. New rewards program now active!',
        metadata: { feature: 'staking_rewards', apy: '15%' },
        is_read: false,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        type: 'following_tip' as const,
        target_user_id: 'creator1',
        title: '💰 You received a tip from a fan!',
        description: 'Someone tipped you 0.05 SOL for your amazing content!',
        metadata: { amount: 50000000, currency: 'SOL' },
        is_read: false,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
    ];

    sampleActivities.forEach(activity => {
      const id = randomUUID();
      const newActivity: Activity = {
        ...activity,
        id,
        created_at: activity.created_at,
      };
      this.activities.set(id, newActivity);
    });
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
          return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('.avi') || post.tags.includes('video');
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

  // Search methods
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const searchTerm = query.toLowerCase();
    const allUsers = Array.from(this.users.values());
    
    const results = allUsers.filter(user => {
      const handle = user.handle?.toLowerCase() || '';
      const bio = user.bio?.toLowerCase() || '';
      return handle.includes(searchTerm) || bio.includes(searchTerm);
    });

    return results.slice(0, limit);
  }

  async searchPosts(query: string, limit: number = 10): Promise<Post[]> {
    const searchTerm = query.toLowerCase();
    const allPosts = Array.from(this.posts.values());
    
    const results = allPosts.filter(post => {
      const caption = post.caption?.toLowerCase() || '';
      const tags = post.tags?.join(' ').toLowerCase() || '';
      return caption.includes(searchTerm) || tags.includes(searchTerm);
    });

    return results.slice(0, limit);
  }

  async searchAll(query: string, limit: number = 10): Promise<{
    users: User[];
    posts: Post[];
    tokens: Token[];
  }> {
    const [users, posts] = await Promise.all([
      this.searchUsers(query, limit),
      this.searchPosts(query, limit)
    ]);

    // Search tokens by name and symbol
    const searchTerm = query.toLowerCase();
    const allTokens = Array.from(this.tokens.values());
    const tokens = allTokens.filter(token => {
      const name = token.name?.toLowerCase() || '';
      const symbol = token.symbol?.toLowerCase() || '';
      const description = token.description?.toLowerCase() || '';
      return name.includes(searchTerm) || symbol.includes(searchTerm) || description.includes(searchTerm);
    }).slice(0, limit);

    return { users, posts, tokens };
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
}

export const storage = new MemStorage();
