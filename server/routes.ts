import type { Express } from "express";
import type { Multer } from "multer";
import { createServer, type Server } from "http";
import { storage } from "./storage/index.js";
import { z } from "zod";
import { insertPostSchema, type Post } from "@shared/schema";
import { chatWithAI } from "./services/xai";
import { uploadToDigitalOcean } from "./services/upload-real";

// Helper function to create anonymous post responses - strips all sensitive data
function createAnonymousPost(post: Post) {
  const { solana_address, ...anonymousPost } = post;
  return {
    ...anonymousPost,
    creator: { id: 'anonymous', handle: 'Anonymous', is_creator: false }
  };
}


export async function registerRoutes(app: Express, upload?: Multer): Promise<Server> {

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
      
      // Strip sensitive data and add anonymous creator info
      const postsWithCreators = paginatedPosts.map(createAnonymousPost);
      
      res.json({
        posts: postsWithCreators,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: posts.length,
          hasMore: offsetNum + limitNum < posts.length
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
        creatorId: creator as string,
        type: type as string, // 'photo' or 'video'
        sort: sort as string, // 'latest', 'trending'
      });
      
      // Strip sensitive data and add anonymous creator info
      const postsWithCreators = posts.map(createAnonymousPost);
      
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
      if (!post) {
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
      const post = await storage.incrementPostViews(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({ success: true, views: post.views });
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
          solana_address: solana_address || null,
          is_live: false
        };
      } else {
        // Handle JSON data - Force anonymous regardless of input
        const { caption, solana_address, media_url, thumb_url, is_live, tags } = req.body;
        
        postData = {
          media_url: media_url || '',
          thumb_url: thumb_url || media_url || '',
          caption: caption || '',
          price_lamports: 0,
          visibility: 'public',
          solana_address: solana_address || null,
          is_live: is_live || false
        };
      }

      const validatedData = insertPostSchema.parse(postData);
      const post = await storage.createPost(validatedData);
      res.json(post);
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(400).json({ error: "Invalid post data", details: (error as Error).message });
    }
  });











  // AI Chat endpoint for direct AI responses
  app.post("/api/chat/ai", async (req, res) => {
    try {
      const { message, systemPrompt } = req.body;
      
      if (!message || !systemPrompt) {
        return res.status(400).json({ error: "Missing message or systemPrompt" });
      }

      // Get AI response using xAI
      const aiResponse = await chatWithAI(message, systemPrompt);
      
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Failed to get AI response:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });














  // Trending content endpoint
  app.get("/api/trending", async (req, res) => {
    try {
      const { type = 'all', timeframe = '24h', limit = 20 } = req.query;
      const searchLimit = Math.min(parseInt(limit as string) || 20, 100);
      
      // Get trending posts based on engagement
      const posts = await storage.getPosts({ sort: 'trending' });
      
      // Filter by type if specified
      let filteredPosts = posts;
      if (type === 'videos') {
        filteredPosts = posts.filter(post => 
          post.media_url.includes('.mp4') || post.media_url.includes('.webm') || post.media_url.includes('.mov')
        );
      } else if (type === 'photos') {
        filteredPosts = posts.filter(post => 
          post.media_url.includes('.jpg') || post.media_url.includes('.jpeg') || post.media_url.includes('.png') || 
          post.media_url.includes('.gif') || post.media_url.includes('.webp')
        );
      } else if (type === 'live') {
        filteredPosts = posts.filter(post => 
          post.tags?.includes('live') || post.tags?.includes('streaming') || post.is_live
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
      const [trendingPosts, recentPosts, liveStreams] = await Promise.all([
        storage.getPosts({ sort: 'trending' }),
        storage.getPosts({ sort: 'latest' }),
        storage.getActiveStreams()
      ]);
      
      // Mix content types for discovery
      const discoveryContent = [
        ...trendingPosts.slice(0, 5),
        ...recentPosts.slice(0, 5),
        ...liveStreams.slice(0, 3)
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
  
  // Get all live streams
  app.get("/api/streams", async (req, res) => {
    try {
      const { creatorId, status, limit = 20, offset = 0 } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offsetNum = parseInt(offset as string) || 0;
      
      const streams = await storage.getLiveStreams(creatorId as string, status as string);
      
      // Apply pagination
      const paginatedStreams = streams.slice(offsetNum, offsetNum + limitNum);
      
      // Add anonymous creator info to each stream
      const streamsWithCreators = paginatedStreams.map((stream) => {
        return { ...stream, creator: { id: 'anonymous', handle: 'Anonymous', is_creator: false } };
      });
      
      res.json({
        streams: streamsWithCreators,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: streams.length,
          hasMore: offsetNum + limitNum < streams.length
        }
      });
    } catch (error) {
      console.error("Failed to fetch live streams:", error);
      res.status(500).json({ error: "Failed to fetch live streams" });
    }
  });

  app.get("/api/streams/active", async (req, res) => {
    try {
      const streams = await storage.getActiveStreams();
      res.json(streams);
    } catch (error) {
      console.error("Failed to fetch active streams:", error);
      res.status(500).json({ error: "Failed to fetch active streams" });
    }
  });

  app.get("/api/streams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const stream = await storage.getLiveStream(id);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      res.json(stream);
    } catch (error) {
      console.error("Failed to fetch stream:", error);
      res.status(500).json({ error: "Failed to fetch stream" });
    }
  });

  app.post("/api/streams", async (req, res) => {
    try {
      const { creator_id, title, description, stream_key } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }

      const stream = await storage.createLiveStream({
        creator_id: 'anonymous',
        title,
        description,
        stream_key: stream_key || `stream_${Date.now()}`,
        status: 'live',
        viewer_count: 0,
        max_viewers: 0,
        duration: 0,
        metadata: {
          is_muted: false,
          is_camera_on: true,
          start_time: new Date().toISOString()
        }
      });

      res.json(stream);
    } catch (error) {
      console.error("Failed to create live stream:", error);
      res.status(500).json({ error: "Failed to create live stream" });
    }
  });

  app.put("/api/streams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const stream = await storage.updateLiveStream(id, updates);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      res.json(stream);
    } catch (error) {
      console.error("Failed to update stream:", error);
      res.status(500).json({ error: "Failed to update stream" });
    }
  });

  app.put("/api/streams/:id/end", async (req, res) => {
    try {
      const { id } = req.params;
      const stream = await storage.endLiveStream(id);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      res.json(stream);
    } catch (error) {
      console.error("Failed to end stream:", error);
      res.status(500).json({ error: "Failed to end stream" });
    }
  });

  // ===== LIVE CHAT ENDPOINTS =====
  
  // Get live chat messages for a stream
  app.get("/api/chat/live/:streamId", async (req, res) => {
    try {
      const { streamId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = parseInt(offset as string) || 0;
      
      const messages = await storage.getLiveChatMessages(streamId, limitNum, offsetNum);
      
      // Add anonymous user info to messages
      const messagesWithUsers = messages.map((msg) => {
        return { ...msg, user: { id: 'anonymous', handle: 'Anonymous', is_creator: false } };
      });
      
      res.json({
        messages: messagesWithUsers,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: messages.length === limitNum
        }
      });
    } catch (error) {
      console.error("Failed to fetch live chat messages:", error);
      res.status(500).json({ error: "Failed to fetch live chat messages" });
    }
  });

  // Send live chat message
  app.post("/api/chat/live/:streamId", async (req, res) => {
    try {
      const { streamId } = req.params;
      const { message, type = 'message' } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Create live chat message
      const chatMessage = await storage.createLiveChatMessage({
        stream_id: streamId,
        user_id: 'anonymous',
        message,
        type: type as 'message' | 'tip' | 'reaction',
        metadata: req.body.metadata || {}
      });

      // Add anonymous user info
      const messageWithUser = { ...chatMessage, user: { id: 'anonymous', handle: 'Anonymous', is_creator: false } };

      res.json(messageWithUser);
    } catch (error) {
      console.error("Failed to send live chat message:", error);
      res.status(500).json({ error: "Failed to send live chat message" });
    }
  });

  // Update stream viewer count
  app.put("/api/streams/:id/viewers", async (req, res) => {
    try {
      const { id } = req.params;
      const { viewerCount } = req.body;
      
      if (typeof viewerCount !== 'number') {
        return res.status(400).json({ error: "Viewer count must be a number" });
      }

      const stream = await storage.updateStreamViewerCount(id, viewerCount);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      res.json(stream);
    } catch (error) {
      console.error("Failed to update viewer count:", error);
      res.status(500).json({ error: "Failed to update viewer count" });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
