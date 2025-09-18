import { z } from "zod";

// Simplified schema definitions using Zod only for now
// These represent the shape of our data models

export const insertUserSchema = z.object({
  id: z.string(),
  goon_username: z.string(),
  handle: z.string().optional(),
  avatar_url: z.string().optional(),
  banner_url: z.string().optional(),
  bio: z.string().optional(),
  age_verified: z.boolean().default(false),
  is_creator: z.boolean().default(false),
  solana_address: z.string().optional(),
  created_at: z.string().optional(),
  last_active: z.string().optional(),
});

export const createGoonUserSchema = z.object({
  goon_username: z.string(),
  solana_address: z.string().optional(),
});

export const insertPostSchema = z.object({
  creator_id: z.string(),
  media_url: z.string(),
  thumb_url: z.string(),
  caption: z.string(),
  price_lamports: z.number().default(0),
  visibility: z.enum(["public", "subscribers", "goon"]).default("public"),
  status: z.enum(["draft", "published", "hidden"]).default("published"),
  tags: z.array(z.string()).optional(),
  solana_address: z.string().optional(),
  is_live: z.boolean().default(false),
});

export const insertTokenSchema = z.object({
  creator_id: z.string(),
  mint_address: z.string(),
  name: z.string(),
  symbol: z.string(),
  supply: z.number(),
  image_url: z.string().optional(),
  description: z.string().optional(),
});

export const insertPurchaseSchema = z.object({
  user_id: z.string(),
  post_id: z.string(),
  amount_lamports: z.number(),
  txn_sig: z.string(),
});

export const insertTipSchema = z.object({
  from_user: z.string(),
  to_user: z.string(),
  amount_lamports: z.number(),
  message: z.string().optional(),
  txn_sig: z.string(),
});

export const insertAiPersonaSchema = z.object({
  creator_id: z.string(),
  system_prompt: z.string(),
  price_per_message: z.number().default(1000000),
  is_active: z.boolean().default(true),
});

export const insertChatMessageSchema = z.object({
  user_id: z.string(),
  creator_id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  txn_sig: z.string().optional(),
});

export const insertFollowSchema = z.object({
  follower_id: z.string(),
  following_id: z.string(),
});

export const insertActivitySchema = z.object({
  type: z.enum(["core_update", "user_streaming", "new_launch", "following_post", "following_stream", "following_tip"]),
  user_id: z.string().optional(), // For user-specific activities
  target_user_id: z.string().optional(), // For activities about other users
  post_id: z.string().optional(), // For post-related activities
  title: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).optional(), // Additional data like stream title, post preview, etc.
  is_read: z.boolean().default(false),
});

export const insertLiveStreamSchema = z.object({
  creator_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["live", "ended", "scheduled"]).default("live"),
  stream_key: z.string().optional(),
  viewer_count: z.number().default(0),
  max_viewers: z.number().default(0),
  duration: z.number().default(0), // in seconds
  metadata: z.record(z.any()).optional(), // Additional stream data
});

export const insertLiveChatMessageSchema = z.object({
  stream_id: z.string(),
  user_id: z.string(),
  message: z.string(),
  type: z.enum(["message", "tip", "reaction"]).default("message"),
  metadata: z.record(z.any()).optional(),
});

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateGoonUser = z.infer<typeof createGoonUserSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type InsertTip = z.infer<typeof insertTipSchema>;
export type InsertAiPersona = z.infer<typeof insertAiPersonaSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type InsertLiveStream = z.infer<typeof insertLiveStreamSchema>;
export type InsertLiveChatMessage = z.infer<typeof insertLiveChatMessageSchema>;

export type User = InsertUser & {
  created_at: Date;
  goon_username?: string; // Make sure TypeScript knows about this field
};

export type Post = InsertPost & {
  id: string;
  views: number;
  likes: number;
  created_at: Date;
  creator?: User;
};

export type Token = InsertToken & {
  id: string;
  created_at: Date;
};

export type Purchase = InsertPurchase & {
  id: string;
  created_at: Date;
};

export type Tip = InsertTip & {
  id: string;
  created_at: Date;
};

export type AiPersona = InsertAiPersona & {
  id: string;
  created_at: Date;
};

export type ChatMessage = InsertChatMessage & {
  id: string;
  created_at: Date;
};

export type Follow = InsertFollow & {
  id: string;
  created_at: Date;
};

export type Activity = InsertActivity & {
  id: string;
  created_at: Date;
};

export type LiveStream = InsertLiveStream & {
  id: string;
  created_at: Date;
  ended_at?: Date;
};