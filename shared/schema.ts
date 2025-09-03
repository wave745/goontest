import { z } from "zod";

// Simplified schema definitions using Zod only for now
// These represent the shape of our data models

export const insertUserSchema = z.object({
  id: z.string(),
  handle: z.string().optional(),
  avatar_url: z.string().optional(),
  banner_url: z.string().optional(),
  bio: z.string().optional(),
  age_verified: z.boolean().default(false),
  is_creator: z.boolean().default(false),
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

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type InsertTip = z.infer<typeof insertTipSchema>;
export type InsertAiPersona = z.infer<typeof insertAiPersonaSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type User = InsertUser & {
  created_at: Date;
};

export type Post = InsertPost & {
  id: string;
  views: number;
  likes: number;
  created_at: Date;
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