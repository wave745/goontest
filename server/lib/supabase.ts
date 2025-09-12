import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Only create clients if environment variables are available
let supabase: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAnon: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  // Create Supabase client with service role key for server-side operations
  supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn('Supabase environment variables not configured - using in-memory storage');
}

if (supabaseUrl && supabaseAnonKey) {
  // Create Supabase client with anon key for client-side operations
  supabaseAnon = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}

export { supabase, supabaseAnon };

// Database types (will be generated from Supabase)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          handle: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          bio: string | null;
          age_verified: boolean;
          is_creator: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          age_verified?: boolean;
          is_creator?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          handle?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          age_verified?: boolean;
          is_creator?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          creator_id: string;
          media_url: string;
          thumb_url: string;
          caption: string;
          price_lamports: number;
          visibility: 'public' | 'subscribers' | 'goon';
          status: 'draft' | 'published' | 'hidden';
          tags: string[] | null;
          views: number;
          likes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          media_url: string;
          thumb_url: string;
          caption: string;
          price_lamports?: number;
          visibility?: 'public' | 'subscribers' | 'goon';
          status?: 'draft' | 'published' | 'hidden';
          tags?: string[] | null;
          views?: number;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          media_url?: string;
          thumb_url?: string;
          caption?: string;
          price_lamports?: number;
          visibility?: 'public' | 'subscribers' | 'goon';
          status?: 'draft' | 'published' | 'hidden';
          tags?: string[] | null;
          views?: number;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      tokens: {
        Row: {
          id: string;
          creator_id: string;
          mint_address: string;
          name: string;
          symbol: string;
          supply: number;
          image_url: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          mint_address: string;
          name: string;
          symbol: string;
          supply: number;
          image_url?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          mint_address?: string;
          name?: string;
          symbol?: string;
          supply?: number;
          image_url?: string | null;
          description?: string | null;
          created_at?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          amount_lamports: number;
          txn_sig: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          amount_lamports: number;
          txn_sig: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          amount_lamports?: number;
          txn_sig?: string;
          created_at?: string;
        };
      };
      tips: {
        Row: {
          id: string;
          from_user: string;
          to_user: string;
          amount_lamports: number;
          message: string | null;
          txn_sig: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user: string;
          to_user: string;
          amount_lamports: number;
          message?: string | null;
          txn_sig: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user?: string;
          to_user?: string;
          amount_lamports?: number;
          message?: string | null;
          txn_sig?: string;
          created_at?: string;
        };
      };
      ai_personas: {
        Row: {
          id: string;
          creator_id: string;
          system_prompt: string;
          price_per_message: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          system_prompt: string;
          price_per_message?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          system_prompt?: string;
          price_per_message?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          creator_id: string;
          role: 'user' | 'assistant';
          content: string;
          txn_sig: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          creator_id: string;
          role: 'user' | 'assistant';
          content: string;
          txn_sig?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          creator_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          txn_sig?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
