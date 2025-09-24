import type { Express } from "express";
import type { Multer } from "multer";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage/index.js";
import { z } from "zod";
import { insertPostSchema, insertTipSchema, insertLiveChatMessageSchema, type Post } from "@shared/schema";
import { chatWithAI } from "./services/xai";
import { uploadToDigitalOcean } from "./services/upload-real";
import { generateLiveKitToken, tokenRequestSchema } from "./services/livekit-tokens";
import { 
  generateNonce, 
  verifyWalletSignature, 
  canUserPublish, 
  validateStreamAccess, 
  checkTokenRateLimit,
  checkTokenRateLimitByIP,
  type NonceRequest 
} from "./services/auth";
import { nonceRequestSchema } from "./services/auth-nonce";

// Global type declaration for WebSocket server
declare global {
  var wss: WebSocketServer;
}

// Helper function to create anonymous post responses - strips all sensitive data
function createAnonymousPost(post: Post) {
  const { solana_address, owner_wallet, ...anonymousPost } = post;
  return {
    ...anonymousPost,
    creator: { id: 'anonymous', handle: 'Anonymous', is_creator: false }
  };
}


export async function registerRoutes(app: Express, upload?: Multer): Promise<Server> {

  // ===== LIVE STREAMING ENDPOINTS =====
  
  // Get all live streams
  app.get("/api/streams", async (req, res) => {
    try {
      const liveStreams = await storage.getLiveStreams();
      
      // Strip sensitive data and add anonymous creator info
      const streamsWithCreators = liveStreams.map(createAnonymousPost);
      
      res.json(streamsWithCreators);
    } catch (error) {
      console.error("Failed to fetch streams:", error);
      res.status(500).json({ error: "Failed to fetch streams" });
    }
  });

  // Get single stream by ID
  app.get("/api/streams/:id", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post || !post.is_live) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      res.json(createAnonymousPost(post));
    } catch (error) {
      console.error("Failed to fetch stream:", error);
      res.status(500).json({ error: "Failed to fetch stream" });
    }
  });

  // Like/unlike stream endpoints
  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      const success = await storage.likePost(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Failed to like post:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  app.delete("/api/posts/:id/like", async (req, res) => {
    try {
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
      
      // Create post first to get the canonical post.id
      let post = await storage.createPost(validatedData);
      
      // For live streams, require authentication and set canonical ownership using post.id
      if (post.is_live) {
        const { walletAddress, signedMessage } = req.body;
        
        if (!walletAddress || !signedMessage) {
          return res.status(400).json({
            error: "Live streams require authentication: walletAddress and signedMessage"
          });
        }
        
        // Use post.id as the canonical stream identifier for LiveKit
        const streamId = post.id;
        
        // Verify wallet signature for stream ownership
        const isAuthenticated = verifyWalletSignature(walletAddress, streamId, signedMessage);
        if (!isAuthenticated) {
          return res.status(401).json({
            error: "Invalid wallet signature. Please authenticate first."
          });
        }
        
        // Update post with canonical ownership and proper media_url using post.id
        const updatedPost = await storage.updatePost(post.id, {
          owner_wallet: walletAddress, // Server-set canonical ownership
          media_url: `live://stream/${post.id}`, // Use post.id as LiveKit room identifier
          thumb_url: post.thumb_url || `live://stream/${post.id}`
        });
        
        if (updatedPost) {
          post = updatedPost;
        }
      }
      
      // If this is a live stream, create activity and broadcast to all clients
      if (post.is_live && post.metadata) {
        await storage.createActivity({
          type: 'core_update',
          title: `🔴 Live Stream Started`,
          description: post.metadata.stream_title || post.caption || 'New live stream',
          is_read: false,
          metadata: {
            post_id: post.id,
            stream_title: post.metadata.stream_title,
            streamer_name: post.metadata.streamer_name
          }
        });

        // Broadcast new live stream to all connected clients
        if (global.wss) {
          global.wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'stream_started',
                stream: createAnonymousPost(post)
              }));
            }
          });
        }
      }
      
      res.json(post);
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(400).json({ error: "Invalid post data", details: (error as Error).message });
    }
  });











  // Authentication nonce generation endpoint with comprehensive validation
  app.post("/api/auth/nonce", async (req, res) => {
    try {
      // Validate request with Zod schema
      const validation = nonceRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validation.error.format()
        });
      }
      
      const { walletAddress, streamId } = validation.data;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      const nonceData = generateNonce({ walletAddress, streamId }, clientIP);
      res.json(nonceData);
      
    } catch (error) {
      console.error("Failed to generate nonce:", error);
      if (error instanceof Error && error.message.includes('Rate limit')) {
        return res.status(429).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to generate nonce" });
    }
  });

  // LiveKit token generation endpoint with comprehensive security
  app.post("/api/livekit/token", async (req, res) => {
    try {
      // Validate request body with Zod
      const validation = tokenRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validation.error.format()
        });
      }
      
      const { streamId, participantName, walletAddress, signedMessage } = validation.data;
      
      // CRITICAL: Verify signature FIRST before any rate limiting
      const isAuthenticated = verifyWalletSignature(walletAddress, streamId, signedMessage);
      if (!isAuthenticated) {
        return res.status(401).json({ 
          error: "Invalid wallet signature. Please authenticate first."
        });
      }
      
      // Rate limiting AFTER authentication (prevents DoS via wallet spoofing)
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      if (!checkTokenRateLimit(walletAddress) || !checkTokenRateLimitByIP(clientIP)) {
        return res.status(429).json({ 
          error: "Rate limit exceeded. Too many token requests."
        });
      }
      
      // Validate stream exists and is accessible
      const hasStreamAccess = await validateStreamAccess(streamId, walletAddress);
      if (!hasStreamAccess) {
        return res.status(403).json({ 
          error: "Stream not found or not accessible"
        });
      }
      
      // Determine role server-side based on stream ownership
      const isPublisher = await canUserPublish(streamId, walletAddress);
      
      // Generate secure token with short TTL
      const token = generateLiveKitToken(streamId, walletAddress, participantName, isPublisher);
      
      // Log token issuance for auditing
      console.log(`Token issued: ${walletAddress} as ${isPublisher ? 'publisher' : 'viewer'} for stream ${streamId}`);
      
      res.json({ 
        token,
        role: isPublisher ? 'publisher' : 'viewer',
        expiresIn: 300 // 5 minutes
      });
      
    } catch (error) {
      console.error("Failed to generate LiveKit token:", error);
      res.status(500).json({ 
        error: "Failed to generate token",
        message: error instanceof Error ? error.message : "Unknown error"
      });
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
          post.is_live
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
        storage.getLiveStreams()
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
      
      // Strip sensitive data and add anonymous creator info - filter out non-post types first
      const contentWithCreators = paginatedContent.filter((item): item is Post => 'media_url' in item).map(createAnonymousPost);
      
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
  
  // Chat endpoints
  app.get("/api/chat/:postId", async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const messages = await storage.getLiveChatMessages(
        req.params.postId,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(messages);
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });
  
  app.post("/api/chat/:postId", async (req, res) => {
    try {
      const chatData = {
        ...req.body,
        post_id: req.params.postId
      };
      const validatedData = insertLiveChatMessageSchema.parse(chatData);
      const message = await storage.createLiveChatMessage(validatedData);
      
      // Broadcast to WebSocket clients if connected
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'chat_message',
              postId: req.params.postId,
              message
            }));
          }
        });
      }
      
      res.json(message);
    } catch (error) {
      console.error("Failed to create chat message:", error);
      res.status(400).json({ error: "Invalid message data", details: (error as Error).message });
    }
  });
  
  // End stream endpoint
  app.post("/api/streams/:id/end", async (req, res) => {
    try {
      const stream = await storage.endLiveStream(req.params.id);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      res.json(createAnonymousPost(stream));
    } catch (error) {
      console.error("Failed to end stream:", error);
      res.status(500).json({ error: "Failed to end stream" });
    }
  });
  
  // Update stream viewer count
  app.post("/api/streams/:id/viewers", async (req, res) => {
    try {
      const { viewer_count } = req.body;
      if (typeof viewer_count !== 'number') {
        return res.status(400).json({ error: "Invalid viewer count" });
      }
      
      const stream = await storage.updateStreamViewerCount(req.params.id, viewer_count);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      res.json({ success: true, viewer_count: stream.metadata?.viewer_count || 0 });
    } catch (error) {
      console.error("Failed to update viewer count:", error);
      res.status(500).json({ error: "Failed to update viewer count" });
    }
  });
  
  const httpServer = createServer(app);
  
  // Setup WebSocket server for live chat on a specific path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/chat-ws'
  });
  
  // Make WebSocket server globally accessible for broadcasting
  global.wss = wss;
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'join_stream') {
          // Client joining a stream chat
          (ws as any).streamId = message.postId;
        } else if (message.type === 'chat_message') {
          // Handle chat message
          const chatData = {
            post_id: message.postId,
            username: message.username || 'Anonymous',
            message: message.content,
            type: message.messageType || 'message',
            sender_address: message.senderAddress
          };
          
          const validatedData = insertLiveChatMessageSchema.parse(chatData);
          const savedMessage = await storage.createLiveChatMessage(validatedData);
          
          // Broadcast to all clients in the same stream
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && (client as any).streamId === message.postId) {
              client.send(JSON.stringify({
                type: 'chat_message',
                message: savedMessage
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });
  
  return httpServer;
}
