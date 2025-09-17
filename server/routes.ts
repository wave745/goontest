import type { Express } from "express";
import type { Multer } from "multer";
import { createServer, type Server } from "http";
import { storage } from "./storage/index.js";
import { z } from "zod";
import { insertPostSchema, insertTokenSchema, insertChatMessageSchema, insertPurchaseSchema, insertTipSchema, createGoonUserSchema, insertUserSchema } from "@shared/schema";
import { generateGoonToken } from "./services/solana";
import { chatWithAI } from "./services/xai";
import { uploadToDigitalOcean } from "./services/upload-real";

export async function registerRoutes(app: Express, upload?: Multer): Promise<Server> {
  // ===== USER MANAGEMENT ENDPOINTS =====
  
  // Create or get goon user
  app.post("/api/users/goon", async (req, res) => {
    try {
      const { goon_username, solana_address } = createGoonUserSchema.parse(req.body);
      
      // Check if goon username already exists
      const existingUser = await storage.getUserByGoonUsername(goon_username);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      // Create new goon user
      const userData = insertUserSchema.parse({
        id: `goon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        goon_username,
        solana_address,
        is_creator: false,
        age_verified: false,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      });
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Failed to create/get goon user:", error);
      res.status(400).json({ error: "Invalid user data", details: (error as Error).message });
    }
  });

  // Get user by goon username
  app.get("/api/users/goon/:username", async (req, res) => {
    try {
      const user = await storage.getUserByGoonUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update user solana address
  app.put("/api/users/:id/solana", async (req, res) => {
    try {
      const { solana_address } = req.body;
      if (!solana_address) {
        return res.status(400).json({ error: "Solana address is required" });
      }
      
      const user = await storage.updateUserSolanaAddress(req.params.id, solana_address);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Failed to update solana address:", error);
      res.status(500).json({ error: "Failed to update solana address" });
    }
  });

  // Update user last active
  app.put("/api/users/:id/active", async (req, res) => {
    try {
      const user = await storage.updateUserLastActive(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Failed to update last active:", error);
      res.status(500).json({ error: "Failed to update last active" });
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
      
      // Add creator info to each post
      const postsWithCreators = await Promise.all(
        paginatedPosts.map(async (post) => {
          const creator = await storage.getUser(post.creator_id);
          return { ...post, creator };
        })
      );
      
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
      
      // Add creator info to each post
      const postsWithCreators = await Promise.all(
        posts.map(async (post) => {
          const creator = await storage.getUser(post.creator_id);
          return { ...post, creator };
        })
      );
      
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
      
      const creator = await storage.getUser(post.creator_id);
      res.json({ ...post, creator });
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

  // Like post
  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const success = await storage.likePost(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to like post:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  // Unlike post
  app.delete("/api/posts/:id/like", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const success = await storage.unlikePost(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to unlike post:", error);
      res.status(500).json({ error: "Failed to unlike post" });
    }
  });

  // Check if user liked post
  app.get("/api/posts/:id/like", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const isLiked = await storage.isPostLiked(req.params.id, userId as string);
      res.json({ isLiked });
    } catch (error) {
      console.error("Failed to check like status:", error);
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  // Create new post
  app.post("/api/posts", upload?.single('media') || ((req, res, next) => next()), async (req, res) => {
    try {
      // Handle both JSON and FormData
      let postData;
      
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Handle FormData from file upload
        const { media, creator_id, caption, price_lamports, visibility, tags } = req.body;
        
        console.log('FormData request:', {
          contentType: req.headers['content-type'],
          body: req.body,
          file: req.file,
          creator_id
        });
        
        if (!req.file || !creator_id) {
          return res.status(400).json({ error: "Media file and creator_id are required" });
        }

        // Handle file upload
        let mediaUrl, thumbUrl;
        
        if (req.file) {
          // Upload to storage service (S3, Cloudinary, etc.)
          const uploadResult = await uploadToDigitalOcean(req.file, 'posts');
          mediaUrl = uploadResult.url;
          thumbUrl = uploadResult.thumbnail || uploadResult.url;
        } else {
          return res.status(400).json({ error: "Media file is required" });
        }

        postData = {
          creator_id,
          media_url: mediaUrl,
          thumb_url: thumbUrl,
          caption: caption || '',
          price_lamports: parseInt(price_lamports) || 0,
          visibility: visibility || 'public',
          tags: tags ? JSON.parse(tags) : [],
          solana_address: req.body.solana_address || null,
          is_live: req.body.is_live || false
        };
      } else {
        // Handle JSON data
        postData = req.body;
      }

      const validatedData = insertPostSchema.parse(postData);
      const post = await storage.createPost(validatedData);
      res.json(post);
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(400).json({ error: "Invalid post data", details: (error as Error).message });
    }
  });

  // Get posts by creator (for studio)
  app.get("/api/posts/my", async (req, res) => {
    try {
      const { creatorId } = req.query;
      if (!creatorId) {
        return res.status(400).json({ error: "Creator ID required" });
      }

      const posts = await storage.getPosts({ creatorId: creatorId as string });
      res.json(posts);
    } catch (error) {
      console.error("Failed to fetch user posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Get content analytics
  app.get("/api/analytics/content", async (req, res) => {
    try {
      const { creatorId, timeframe = '7d' } = req.query;
      
      if (!creatorId) {
        return res.status(400).json({ error: "Creator ID required" });
      }

      const posts = await storage.getPosts({ creatorId: creatorId as string });
      
      // Calculate analytics
      const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
      const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
      const totalPosts = posts.length;
      
      // Calculate engagement rate
      const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
      
      // Get recent posts (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentPosts = posts.filter(post => 
        new Date(post.created_at) > sevenDaysAgo
      );
      
      res.json({
        totalViews,
        totalLikes,
        totalPosts,
        engagementRate: Math.round(engagementRate * 100) / 100,
        recentPosts: recentPosts.length,
        topPost: posts.length > 0 ? posts.reduce((top, post) => 
          post.views > top.views ? post : top
        ) : null
      });
    } catch (error) {
      console.error("Failed to fetch content analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Unlock post content
  app.post("/api/posts/unlock", async (req, res) => {
    try {
      const { postId, userPubkey } = req.body;
      
      if (!postId || !userPubkey) {
        return res.status(400).json({ error: "Missing postId or userPubkey" });
      }

      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check if already purchased
      const hasPurchased = await storage.hasPurchased(userPubkey, postId);
      if (hasPurchased) {
        return res.json({ success: true, message: "Already unlocked" });
      }

      // TODO: Verify Solana transaction here
      // For now, we'll simulate successful payment
      
      await storage.createPurchase({
        user_id: userPubkey,
        post_id: postId,
        amount_lamports: post.price_lamports,
        txn_sig: `txn_${Date.now()}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to unlock post:", error);
      res.status(500).json({ error: "Failed to unlock post" });
    }
  });

  // Get all creators with pagination
  app.get("/api/creators", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
      const offset = (page - 1) * limit;

      // Get all users that are creators from Supabase
      const allUsers = await storage.getAllUsers();
      const creators = allUsers.filter(user => user.is_creator);

      // Apply pagination
      const paginatedCreators = creators.slice(offset, offset + limit);

      const creatorsWithStats = await Promise.all(
        paginatedCreators.map(async (creator) => {
          const posts = await storage.getPosts({ creatorId: creator.id });
          const tokens = await storage.getTokens(creator.id);
          const followerCount = await storage.getFollowerCount(creator.id);

          return {
            ...creator,
            posts,
            tokens,
            followerCount,
            postCount: posts.length,
          };
        })
      );

      res.json({
        creators: creatorsWithStats,
        pagination: {
          page,
          limit,
          total: creators.length,
          totalPages: Math.ceil(creators.length / limit),
          hasNext: offset + limit < creators.length,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Failed to fetch creators:", error);
      res.status(500).json({ error: "Failed to fetch creators" });
    }
  });

  // Get creator by handle
  app.get("/api/creators/:handle", async (req, res) => {
    try {
      const creator = await storage.getUserByHandle(req.params.handle);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      const posts = await storage.getPosts({ creatorId: creator.id });
      const tokens = await storage.getTokens(creator.id);
      const followerCount = await storage.getFollowerCount(creator.id);

      res.json({
        ...creator,
        posts,
        tokens,
        followerCount,
        postCount: posts.length,
      });
    } catch (error) {
      console.error("Failed to fetch creator:", error);
      res.status(500).json({ error: "Failed to fetch creator" });
    }
  });

  // Launch GOON token
  app.post("/api/tokens/launch", async (req, res) => {
    try {
      const { name, symbol, supply, imageUrl, creatorId } = req.body;
      
      if (!name.toUpperCase().endsWith('GOON')) {
        return res.status(400).json({ error: "Token name must end with GOON" });
      }
      
      if (symbol.toUpperCase() !== 'GOON') {
        return res.status(400).json({ error: "Token symbol must be GOON" });
      }

      // Generate vanity mint address ending in "goon"
      const mintAddress = await generateGoonToken();
      
      const tokenData = insertTokenSchema.parse({
        creator_id: creatorId,
        mint_address: mintAddress,
        name,
        symbol,
        supply: parseInt(supply),
        image_url: imageUrl,
      });

      const token = await storage.createToken(tokenData);
      res.json(token);
    } catch (error) {
      console.error("Failed to launch token:", error);
      res.status(500).json({ error: "Failed to launch token" });
    }
  });

  // Get tokens for creator
  app.get("/api/tokens/my", async (req, res) => {
    try {
      const { creatorId } = req.query;
      if (!creatorId) {
        return res.status(400).json({ error: "Creator ID required" });
      }
      
      const tokens = await storage.getTokens(creatorId as string);
      res.json(tokens);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });

  // ===== SOLANA TIP SYSTEM =====
  
  // Send tip to creator
  app.post("/api/tips/send", async (req, res) => {
    try {
      const tipData = insertTipSchema.parse(req.body);
      const tip = await storage.createTip(tipData);
      res.json(tip);
    } catch (error) {
      console.error("Failed to send tip:", error);
      res.status(400).json({ error: "Invalid tip data" });
    }
  });

  // Get tip history for a user
  app.get("/api/tips/history", async (req, res) => {
    try {
      const { userId, type = 'all' } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const tips = await storage.getTips(userId as string);
      
      // Filter by type if specified
      let filteredTips = tips;
      if (type === 'sent') {
        filteredTips = tips.filter(tip => tip.from_user === userId);
      } else if (type === 'received') {
        filteredTips = tips.filter(tip => tip.to_user === userId);
      }
      
      res.json(filteredTips);
    } catch (error) {
      console.error("Failed to fetch tip history:", error);
      res.status(500).json({ error: "Failed to fetch tip history" });
    }
  });

  // Get tip statistics for a user
  app.get("/api/tips/stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const tips = await storage.getTips(userId);
      
      const stats = {
        totalReceived: tips.filter(tip => tip.to_user === userId)
          .reduce((sum, tip) => sum + tip.amount_lamports, 0),
        totalSent: tips.filter(tip => tip.from_user === userId)
          .reduce((sum, tip) => sum + tip.amount_lamports, 0),
        totalTips: tips.length,
        recentTips: tips.slice(0, 10)
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch tip stats:", error);
      res.status(500).json({ error: "Failed to fetch tip stats" });
    }
  });

  // Verify Solana transaction (placeholder for now)
  app.post("/api/tips/verify", async (req, res) => {
    try {
      const { transactionSignature, fromAddress, toAddress, amount } = req.body;
      
      // TODO: Implement actual Solana transaction verification
      // For now, we'll simulate successful verification
      
      const verification = {
        verified: true,
        transactionSignature,
        fromAddress,
        toAddress,
        amount,
        timestamp: new Date().toISOString()
      };
      
      res.json(verification);
    } catch (error) {
      console.error("Failed to verify transaction:", error);
      res.status(500).json({ error: "Failed to verify transaction" });
    }
  });

  // Get AI persona for creator
  app.get("/api/personas/:creatorHandle", async (req, res) => {
    try {
      const creator = await storage.getUserByHandle(req.params.creatorHandle);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      const persona = await storage.getPersona(creator.id);
      if (!persona) {
        return res.status(404).json({ error: "AI persona not found" });
      }

      res.json(persona);
    } catch (error) {
      console.error("Failed to fetch persona:", error);
      res.status(500).json({ error: "Failed to fetch persona" });
    }
  });

  // Create or update AI persona for creator
  app.post("/api/personas", async (req, res) => {
    try {
      const { creator_id, system_prompt, price_per_message } = req.body;
      
      if (!creator_id || !system_prompt) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const creator = await storage.getUserByHandle(creator_id);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Create or update persona
      const persona = await storage.upsertPersona({
        creator_id: creator.id,
        system_prompt,
        price_per_message: price_per_message || 1000000, // Default 0.001 SOL
        is_active: true,
      });

      res.json(persona);
    } catch (error) {
      console.error("Failed to create/update persona:", error);
      res.status(500).json({ error: "Failed to create/update persona" });
    }
  });

  // Get chat messages
  app.get("/api/chat/messages/:creatorHandle", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const creator = await storage.getUserByHandle(req.params.creatorHandle);
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      const messages = await storage.getChatMessages(userId as string, creator.id);
      
      // Add user info to messages
      const messagesWithUsers = await Promise.all(
        messages.map(async (msg) => {
          const user = await storage.getUser(msg.user_id);
          return { ...msg, user };
        })
      );

      res.json(messagesWithUsers);
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Send chat message
  app.post("/api/chat/send", async (req, res) => {
    try {
      const { creatorId, content, userPubkey } = req.body;
      
      if (!creatorId || !content || !userPubkey) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get AI persona
      const persona = await storage.getPersona(creatorId);
      if (!persona || !persona.is_active) {
        return res.status(404).json({ error: "AI persona not available" });
      }

      // TODO: Verify payment transaction for chat message
      
      // Store user message
      await storage.createChatMessage({
        user_id: userPubkey,
        creator_id: creatorId,
        role: 'user',
        content,
        txn_sig: `txn_${Date.now()}`,
      });

      // Get AI response
      const aiResponse = await chatWithAI(content, persona.system_prompt);
      
      // Store AI response
      await storage.createChatMessage({
        user_id: userPubkey,
        creator_id: creatorId,
        role: 'assistant',
        content: aiResponse,
      });

      res.json({ success: true, response: aiResponse });
    } catch (error) {
      console.error("Failed to send chat message:", error);
      res.status(500).json({ error: "Failed to send chat message" });
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

  // Get user's subscriptions
  app.get("/api/subscriptions", async (req, res) => {
    try {
      // TODO: Implement actual subscription logic
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // Check if user is following another user (must be before /api/profile/:walletAddress)
  app.get("/api/profile/is-following", async (req, res) => {
    try {
      const { followerId, followingId } = req.query;
      
      if (!followerId || !followingId) {
        return res.status(400).json({ error: "Both followerId and followingId are required" });
      }

      const isFollowing = await storage.isFollowing(followerId as string, followingId as string);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Failed to check follow status:", error);
      res.status(500).json({ error: "Failed to check follow status" });
    }
  });

  // Profile endpoints
  app.get("/api/profile/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      // Get or create user
      let user = await storage.getUser(walletAddress);
      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({
          id: walletAddress,
          goon_username: `User${walletAddress.slice(0, 8)}`,
          handle: undefined,
          avatar_url: undefined,
          banner_url: undefined,
          bio: undefined,
          age_verified: false,
          is_creator: false,
        });
      }

      // Get follower and following counts
      const followerCount = await storage.getFollowerCount(walletAddress);
      const followingCount = await storage.getFollowingCount(walletAddress);
      
      // Get user's posts for stats
      const posts = await storage.getPosts({ creatorId: walletAddress });
      
      // Calculate total views and earnings
      const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
      const totalEarnings = 0; // TODO: Calculate from purchases/tips

      const profileWithStats = {
        ...user,
        followerCount,
        followingCount,
        postCount: posts.length,
        totalViews,
        totalEarnings,
      };

      res.json(profileWithStats);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", async (req, res) => {
    try {
      const { walletAddress, ...updates } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      // Get or create user (same behavior as GET endpoint)
      let user = await storage.getUser(walletAddress);
      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({
          id: walletAddress,
          goon_username: `User${walletAddress.slice(0, 8)}`,
          handle: updates.handle || undefined,
          avatar_url: updates.avatar_url || undefined,
          banner_url: updates.banner_url || undefined,
          bio: updates.bio || undefined,
          age_verified: updates.age_verified || false,
          is_creator: updates.is_creator || false,
        });
      } else {
        // Update existing user
        user = await storage.updateUser(walletAddress, updates);
        if (!user) {
          return res.status(500).json({ error: "Failed to update profile" });
        }
      }

      res.json(user);
    } catch (error) {
      console.error("Failed to update profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/profile/avatar", async (req, res) => {
    try {
      // TODO: Implement file upload handling
      res.status(501).json({ error: "File upload not implemented" });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  app.get("/api/profile/followers/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const followers = await storage.getFollowers(walletAddress);
      const paginatedFollowers = followers.slice(offset, offset + limit);

      res.json({
        followers: paginatedFollowers,
        pagination: {
          page,
          limit,
          total: followers.length,
          totalPages: Math.ceil(followers.length / limit),
          hasNext: offset + limit < followers.length,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Failed to fetch followers:", error);
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  app.get("/api/profile/following/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const following = await storage.getFollowing(walletAddress);
      const paginatedFollowing = following.slice(offset, offset + limit);

      res.json({
        following: paginatedFollowing,
        pagination: {
          page,
          limit,
          total: following.length,
          totalPages: Math.ceil(following.length / limit),
          hasNext: offset + limit < following.length,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Failed to fetch following:", error);
      res.status(500).json({ error: "Failed to fetch following" });
    }
  });

  app.post("/api/profile/follow", async (req, res) => {
    try {
      const { followerId, followingId } = req.body;
      
      if (!followerId || !followingId) {
        return res.status(400).json({ error: "Both followerId and followingId are required" });
      }

      if (followerId === followingId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }

      const follow = await storage.followUser(followerId, followingId);
      res.json(follow);
    } catch (error) {
      console.error("Failed to follow user:", error);
      res.status(500).json({ error: "Failed to follow user" });
    }
  });

  app.delete("/api/profile/follow", async (req, res) => {
    try {
      const { followerId, followingId } = req.body;
      
      if (!followerId || !followingId) {
        return res.status(400).json({ error: "Both followerId and followingId are required" });
      }

      const success = await storage.unfollowUser(followerId, followingId);
      res.json({ success });
    } catch (error) {
      console.error("Failed to unfollow user:", error);
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  });


  // Test endpoint to create users
  app.post("/api/test/create-user", async (req, res) => {
    try {
      const { id, handle, name, bio, avatar, wallet_address } = req.body;
      
      const user = await storage.createUser({
        id: id || `test_${Date.now()}`,
        goon_username: name || `TestUser${Date.now()}`,
        handle: handle || `testuser_${Date.now()}`,
        bio: bio || "Test bio",
        avatar_url: avatar || null,
        age_verified: false,
        is_creator: true,
      });
      
      res.json(user);
    } catch (error) {
      console.error("Failed to create test user:", error);
      res.status(500).json({ error: "Failed to create test user" });
    }
  });

  // ===== SEARCH AND DISCOVERY API =====
  
  // Enhanced search endpoint
  app.get("/api/search", async (req, res) => {
    try {
      const { q: query, type, limit = 10, offset = 0 } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
      }

      const searchLimit = Math.min(parseInt(limit as string) || 10, 50); // Max 50 results
      const searchOffset = parseInt(offset as string) || 0;

      if (type === 'users') {
        const users = await storage.searchUsers(query, searchLimit);
        res.json({ 
          users,
          pagination: {
            limit: searchLimit,
            offset: searchOffset,
            total: users.length,
            hasMore: users.length === searchLimit
          }
        });
      } else if (type === 'posts') {
        const posts = await storage.searchPosts(query, searchLimit);
        
        // Add creator info to each post
        const postsWithCreators = await Promise.all(
          posts.map(async (post) => {
            const creator = await storage.getUser(post.creator_id);
            return { ...post, creator };
          })
        );
        
        res.json({ 
          posts: postsWithCreators,
          pagination: {
            limit: searchLimit,
            offset: searchOffset,
            total: posts.length,
            hasMore: posts.length === searchLimit
          }
        });
      } else {
        // Search all types
        const results = await storage.searchAll(query, searchLimit);
        
        // Add creator info to posts
        const postsWithCreators = await Promise.all(
          results.posts.map(async (post) => {
            const creator = await storage.getUser(post.creator_id);
            return { ...post, creator };
          })
        );
        
        res.json({
          users: results.users,
          posts: postsWithCreators,
          tokens: results.tokens,
          pagination: {
            limit: searchLimit,
            offset: searchOffset,
            total: results.users.length + results.posts.length + results.tokens.length,
            hasMore: (results.users.length + results.posts.length + results.tokens.length) === searchLimit
          }
        });
      }
    } catch (error) {
      console.error("Failed to search:", error);
      res.status(500).json({ error: "Failed to search" });
    }
  });

  // Search suggestions endpoint
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const { q: query, limit = 5 } = req.query;
      
      if (!query || typeof query !== 'string' || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      const searchLimit = Math.min(parseInt(limit as string) || 5, 10);
      
      // Get quick suggestions from users and posts
      const [users, posts] = await Promise.all([
        storage.searchUsers(query, searchLimit),
        storage.searchPosts(query, searchLimit)
      ]);

      const suggestions = [
        ...users.map(user => ({
          type: 'user',
          id: user.id,
          title: user.goon_username || user.handle || user.id,
          subtitle: user.bio,
          avatar: user.avatar_url
        })),
        ...posts.map(post => ({
          type: 'post',
          id: post.id,
          title: post.caption?.substring(0, 50) + (post.caption?.length > 50 ? '...' : ''),
          subtitle: post.tags?.join(', '),
          thumbnail: post.thumb_url
        }))
      ];

      res.json({ suggestions: suggestions.slice(0, searchLimit) });
    } catch (error) {
      console.error("Failed to get search suggestions:", error);
      res.status(500).json({ error: "Failed to get search suggestions" });
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
      
      // Add creator info
      const postsWithCreators = await Promise.all(
        trendingPosts.map(async (post) => {
          const creator = await storage.getUser(post.creator_id);
          return { ...post, creator };
        })
      );
      
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
      
      // Add creator info
      const contentWithCreators = await Promise.all(
        paginatedContent.map(async (item) => {
          const creator = await storage.getUser(item.creator_id);
          return { ...item, creator };
        })
      );
      
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

  // Activity endpoints
  app.get("/api/activities", async (req, res) => {
    try {
      const { userId, limit = 50 } = req.query;
      const activities = await storage.getActivities(userId as string, parseInt(limit as string));
      res.json(activities);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const activity = await storage.createActivity(req.body);
      res.json(activity);
    } catch (error) {
      console.error("Failed to create activity:", error);
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.put("/api/activities/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const activity = await storage.markActivityAsRead(id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      console.error("Failed to mark activity as read:", error);
      res.status(500).json({ error: "Failed to mark activity as read" });
    }
  });

  app.get("/api/activities/unread-count", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const count = await storage.getUnreadActivityCount(userId as string);
      res.json({ count });
    } catch (error) {
      console.error("Failed to get unread activity count:", error);
      res.status(500).json({ error: "Failed to get unread activity count" });
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
      
      // Add creator info to each stream
      const streamsWithCreators = await Promise.all(
        paginatedStreams.map(async (stream) => {
          const creator = await storage.getUser(stream.creator_id);
          return { ...stream, creator };
        })
      );
      
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
      
      if (!creator_id || !title) {
        return res.status(400).json({ error: "creator_id and title are required" });
      }

      const stream = await storage.createLiveStream({
        creator_id,
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
      
      // Add user info to messages
      const messagesWithUsers = await Promise.all(
        messages.map(async (msg) => {
          const user = await storage.getUser(msg.user_id);
          return { ...msg, user };
        })
      );
      
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
      const { userId, message, type = 'message' } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: "User ID and message are required" });
      }

      // Create live chat message
      const chatMessage = await storage.createLiveChatMessage({
        stream_id: streamId,
        user_id: userId,
        message,
        type: type as 'message' | 'tip' | 'reaction',
        metadata: req.body.metadata || {}
      });

      // Add user info
      const user = await storage.getUser(userId);
      const messageWithUser = { ...chatMessage, user };

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
