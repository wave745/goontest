import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertPostSchema, insertTokenSchema, insertChatMessageSchema, insertPurchaseSchema, insertTipSchema } from "@shared/schema";
import { generateGoonToken } from "./services/solana";
import { chatWithAI } from "./services/xai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get posts with optional filtering
  app.get("/api/posts", async (req, res) => {
    try {
      const { category, creator } = req.query;
      const posts = await storage.getPosts({
        category: category as string,
        creatorId: creator as string,
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

  // Create new post
  app.post("/api/posts", async (req, res) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(validatedData);
      res.json(post);
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(400).json({ error: "Invalid post data" });
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
        txn_sig: `mock_${Date.now()}`, // Replace with actual transaction signature
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to unlock post:", error);
      res.status(500).json({ error: "Failed to unlock post" });
    }
  });

  // Get all creators
  app.get("/api/creators", async (req, res) => {
    try {
      // Get all users that are creators
      const allUsers = Array.from(storage.users.values());
      const creators = allUsers.filter(user => user.is_creator);

      const creatorsWithStats = await Promise.all(
        creators.map(async (creator) => {
          const posts = await storage.getPosts({ creatorId: creator.id });
          const tokens = await storage.getTokens(creator.id);

          return {
            ...creator,
            posts,
            tokens,
            followerCount: 1200, // Mock data
            postCount: posts.length,
          };
        })
      );

      res.json(creatorsWithStats);
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

      res.json({
        ...creator,
        posts,
        tokens,
        followerCount: 1200, // Mock data
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
        txn_sig: `mock_${Date.now()}`, // Replace with actual transaction signature
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

  // Get user's subscriptions (mock for now)
  app.get("/api/subscriptions", async (req, res) => {
    try {
      // TODO: Implement actual subscription logic
      const sampleCreators = [
        {
          id: 'creator1',
          handle: 'sarah_creates',
          avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
          bio: 'Premium creator',
          age_verified: true,
          is_creator: true,
          created_at: new Date(),
        }
      ];
      res.json(sampleCreators);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
