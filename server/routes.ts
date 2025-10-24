import type { Express } from "express";
import type { Multer } from "multer";
import { createServer, type Server } from "http";
import { storage } from "./storage/index.js";
import { z } from "zod";
import { insertPostSchema, insertTipSchema, type Post } from "@shared/schema";

import { chatWithAI } from "./services/xai";
import { uploadToDigitalOcean } from "./services/upload-real";

// Helper function to check if a post should be publicly visible
function isPublicPost(post: Post): boolean {
  // Live streams must be claimed (have owner_wallet) to be publicly visible
  if (post.is_live) {
    return !!post.owner_wallet;
  }
  // Non-live posts are always public
  return true;
}

// Helper function to create anonymous post responses - strips all sensitive data
function createAnonymousPost(post: Post) {
  const { solana_address, owner_wallet, ...anonymousPost } = post;
  return {
    ...anonymousPost,
    creator: { id: 'anonymous', handle: 'Anonymous', is_creator: false }
  };
}

// Helper function to filter posts to only include publicly visible ones
function filterPublicPosts(posts: Post[]): Post[] {
  return posts.filter(isPublicPost);
}


export async function registerRoutes(app: Express, upload?: Multer): Promise<Server> {

  // Like/unlike stream endpoints
  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post || !isPublicPost(post)) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      const success = await storage.likePost(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Failed to like post:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  app.delete("/api/posts/:id/like", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post || !isPublicPost(post)) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      const success = await storage.unlikePost(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Failed to unlike post:", error);
      res.status(500).json({ error: "Failed to unlike post" });
    }
  });

  // ===== AVATAR UPLOAD ENDPOINT =====
  
  // Upload avatar for streaming
  app.post("/api/upload/avatar", upload?.single('avatar') || ((req, res, next) => next()), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Avatar file is required" });
      }

      // Validate file type - only images allowed for avatars
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "Only image files are allowed for avatars" });
      }

      // Handle avatar upload
      const uploadResult = await uploadToDigitalOcean(req.file, 'avatars');

      res.json({ 
        success: true, 
        avatar_url: uploadResult.url,
        filename: uploadResult.filename
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // ===== CONTENT ENDPOINTS =====
  
  // Get real-time content feed
  app.get("/api/feed", async (req, res) => {
    try {
      const { type, limit = 20, offset = 0 } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;
      
      const posts = await storage.getPosts({
        type: type as string,
        sort: 'latest'
      });
      
      // Apply pagination
      const paginatedPosts = posts.slice(offsetNum, offsetNum + limitNum);
      
      // Filter to only public posts and strip sensitive data
      const publicPosts = filterPublicPosts(paginatedPosts);
      const postsWithCreators = publicPosts.map(createAnonymousPost);
      
      res.json({
        posts: postsWithCreators,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: publicPosts.length,
          hasMore: offsetNum + limitNum < publicPosts.length
        }
      });
    } catch (error) {
      console.error("Failed to fetch feed:", error);
      res.status(500).json({ error: "Failed to fetch feed" });
    }
  });
  
  // Get posts with optional filtering
  app.get("/api/posts", async (req, res) => {
    try {
      const { category, creator, type, sort } = req.query;
      const posts = await storage.getPosts({
        category: category as string,
        type: type as string, // 'photo' or 'video'
        sort: sort as string, // 'latest', 'trending'
      });
      
      // Filter to only public posts and strip sensitive data
      const publicPosts = filterPublicPosts(posts);
      const postsWithCreators = publicPosts.map(createAnonymousPost);
      
      res.json(postsWithCreators);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Get single post
  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post || !isPublicPost(post)) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json(createAnonymousPost(post));
    } catch (error) {
      console.error("Failed to fetch post:", error);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  // Track post view
  app.post("/api/posts/:id/view", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post || !isPublicPost(post)) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      const updatedPost = await storage.incrementPostViews(req.params.id);
      if (!updatedPost) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({ success: true, views: updatedPost.views });
    } catch (error) {
      console.error("Failed to track post view:", error);
      res.status(500).json({ error: "Failed to track post view" });
    }
  });


  // Create new post
  app.post("/api/posts", upload?.single('media') || ((req, res, next) => next()), async (req, res) => {
    try {
      // Handle both JSON and FormData
      let postData;
      
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Handle FormData from file upload
        const { caption, solana_address, tags } = req.body;
        
        if (!req.file) {
          return res.status(400).json({ error: "Media file is required" });
        }

        // Handle file upload
        const uploadResult = await uploadToDigitalOcean(req.file, 'posts');

        postData = {
          media_url: uploadResult.url,
          thumb_url: uploadResult.thumbnail || uploadResult.url,
          caption: caption || '',
          price_lamports: 0,
          visibility: 'public',
          solana_address: 'anonymous',
          is_live: false
        };
      } else {
        // Handle JSON data - Force anonymous regardless of input
        const { caption, solana_address, media_url, thumb_url, is_live, tags, metadata, walletAddress, signedMessage, streamId } = req.body;
        
        postData = {
          media_url: media_url || '',
          thumb_url: thumb_url || media_url || '',
          caption: caption || '',
          price_lamports: 0,
          visibility: 'public',
          solana_address: 'anonymous',
          is_live: is_live || false,
          metadata: metadata || {}
        };
      }

      const validatedData = insertPostSchema.parse(postData);
      
      // Create post first to get the canonical post.id (no authentication required at creation)
      const post = await storage.createPost(validatedData);
      
      // Note: Live streams are not broadcast until ownership is claimed via /api/posts/:id/claim
      
      // Return sanitized response to client
      res.json(createAnonymousPost(post));
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(400).json({ error: "Invalid post data", details: (error as Error).message });
    }
  });











  // AI Chat endpoint for direct AI responses
  app.post("/api/chat/ai", async (req, res) => {
    try {
      console.log("AI Chat API called with body:", req.body);
      const { message, systemPrompt } = req.body;
      
      if (!message || !systemPrompt) {
        console.log("Missing message or systemPrompt");
        return res.status(400).json({ error: "Missing message or systemPrompt" });
      }

      console.log("XAI_API_KEY exists:", !!process.env.XAI_API_KEY);
      console.log("XAI_API_KEY length:", process.env.XAI_API_KEY?.length || 0);
      
      if (!process.env.XAI_API_KEY) {
        console.log("XAI_API_KEY is not set");
        return res.status(500).json({ error: "AI service not configured", details: "XAI_API_KEY environment variable is not set" });
      }

      console.log("Calling chatWithAI with message:", message);

      // Get AI response using xAI
      const aiResponse = await chatWithAI(message, systemPrompt);
      
      console.log("AI response received:", aiResponse);
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Failed to get AI response:", error);
      console.error("Error details:", error);
      res.status(500).json({ error: "Failed to get AI response", details: error.message });
    }
  });














  // Trending content endpoint
  app.get("/api/trending", async (req, res) => {
    try {
      const { type = 'all', timeframe = '24h', limit = 20 } = req.query;
      const searchLimit = Math.min(parseInt(limit as string) || 20, 100);
      
      // Get trending posts based on engagement
      const posts = await storage.getPosts({ sort: 'trending' });
      
      // Filter to only public posts first
      const publicPosts = filterPublicPosts(posts);
      
      // Filter by type if specified
      let filteredPosts = publicPosts;
      if (type === 'videos') {
        filteredPosts = publicPosts.filter(post => 
          post.media_url.includes('.mp4') || post.media_url.includes('.webm') || post.media_url.includes('.mov')
        );
      } else if (type === 'photos') {
        filteredPosts = publicPosts.filter(post => 
          post.media_url.includes('.jpg') || post.media_url.includes('.jpeg') || post.media_url.includes('.png') || 
          post.media_url.includes('.gif') || post.media_url.includes('.webp')
        );
      }
      
      // Apply limit
      const trendingPosts = filteredPosts.slice(0, searchLimit);
      
      // Strip sensitive data and add anonymous creator info
      const postsWithCreators = trendingPosts.map(createAnonymousPost);
      
      res.json({
        posts: postsWithCreators,
        timeframe,
        type,
        total: filteredPosts.length
      });
    } catch (error) {
      console.error("Failed to fetch trending content:", error);
      res.status(500).json({ error: "Failed to fetch trending content" });
    }
  });

  // Discovery feed endpoint
  app.get("/api/discover", async (req, res) => {
    try {
      const { userId, limit = 20, offset = 0 } = req.query;
      const searchLimit = Math.min(parseInt(limit as string) || 20, 100);
      const searchOffset = parseInt(offset as string) || 0;
      
      // Get diverse content for discovery
      const [trendingPosts, recentPosts] = await Promise.all([
        storage.getPosts({ sort: 'trending' }),
        storage.getPosts({ sort: 'latest' })
      ]);
      
      // Filter all content to only include publicly visible posts
      const publicTrendingPosts = filterPublicPosts(trendingPosts);
      const publicRecentPosts = filterPublicPosts(recentPosts);
      
      // Mix content types for discovery
      const discoveryContent = [
        ...publicTrendingPosts.slice(0, 8),
        ...publicRecentPosts.slice(0, 8)
      ];
      
      // Shuffle and apply pagination
      const shuffled = discoveryContent.sort(() => Math.random() - 0.5);
      const paginatedContent = shuffled.slice(searchOffset, searchOffset + searchLimit);
      
      // Strip sensitive data and add anonymous creator info
      const contentWithCreators = paginatedContent.map(createAnonymousPost);
      
      res.json({
        content: contentWithCreators,
        pagination: {
          limit: searchLimit,
          offset: searchOffset,
          total: shuffled.length,
          hasMore: searchOffset + searchLimit < shuffled.length
        }
      });
    } catch (error) {
      console.error("Failed to fetch discovery content:", error);
      res.status(500).json({ error: "Failed to fetch discovery content" });
    }
  });


  // Core team announcement endpoint
  app.post("/api/activities/announcement", async (req, res) => {
    try {
      const { title, description, type = 'core_update', metadata = {} } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: "title and description are required" });
      }

      const activity = await storage.createActivity({
        type: type as any,
        title,
        description,
        metadata,
        is_read: false
      });

      res.json(activity);
    } catch (error) {
      console.error("Failed to create announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // ===== LIVE STREAMING ENDPOINTS =====
  
  // Remove duplicate - using existing /api/streams endpoint

  // Remove - using unified /api/streams endpoint

  // Remove duplicate - using existing /api/streams/:id endpoint

  // Remove - using unified /api/posts endpoint for stream creation

  // Remove - using unified post update approach

  // Remove duplicate - moved to end of file

  // ===== LIVE CHAT ENDPOINTS =====
  
  // Remove - replaced with /api/chat/:postId

  // Send live chat message
  // Remove - replaced with /api/chat/:postId

  // Remove duplicate - moved to end of file

  // File upload endpoint with DigitalOcean Spaces
  app.post("/api/upload", upload?.single('file') || ((req, res, next) => next()), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { type } = req.body;
      
      // Use the real upload service instead of mock
      const uploadResult = await uploadToDigitalOcean(req.file, type || 'posts');
      console.log('Upload completed successfully:', uploadResult.url);
      
      res.json({
        success: true,
        mediaUrl: uploadResult.url,
        thumbUrl: uploadResult.thumbnail || uploadResult.url,
        filename: uploadResult.filename,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // ===== WEBSOCKET CHAT SUPPORT =====
  
  // Add tip endpoint
  app.post("/api/tips", async (req, res) => {
    try {
      const tipData = insertTipSchema.parse(req.body);
      const tip = await storage.createTip(tipData);
      
      // Create activity for tip
      await storage.createActivity({
        type: 'core_update',
        title: `💰 New Tip Received`,
        description: `${tip.amount_lamports / 1000000000} SOL tip ${tip.message ? '- ' + tip.message : ''}`,
        is_read: false,
        metadata: {
          post_id: tip.post_id,
          tip_amount: tip.amount_lamports,
          tip_message: tip.message
        }
      });
      
      res.json(tip);
    } catch (error) {
      console.error("Failed to create tip:", error);
      res.status(400).json({ error: "Invalid tip data", details: (error as Error).message });
    }
  });
  
  // Get tips for a stream/post
  app.get("/api/tips/:postId", async (req, res) => {
    try {
      const tips = await storage.getTips(req.params.postId);
      res.json(tips);
    } catch (error) {
      console.error("Failed to fetch tips:", error);
      res.status(500).json({ error: "Failed to fetch tips" });
    }
  });
  
  const httpServer = createServer(app);
  
  return httpServer;
}
