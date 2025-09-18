-- GoonHub Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Solana wallet address
  handle TEXT UNIQUE,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  age_verified BOOLEAN DEFAULT FALSE,
  is_creator BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  price_lamports BIGINT DEFAULT 0 CHECK (price_lamports >= 0),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'subscribers', 'goon')),
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden')),
  tags TEXT[],
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tokens table
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mint_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  supply BIGINT NOT NULL CHECK (supply > 0),
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  amount_lamports BIGINT NOT NULL CHECK (amount_lamports > 0),
  txn_sig TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_lamports BIGINT NOT NULL CHECK (amount_lamports > 0),
  message TEXT,
  txn_sig TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_tip CHECK (from_user != to_user)
);

-- Create ai_personas table
CREATE TABLE IF NOT EXISTS ai_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt TEXT NOT NULL,
  price_per_message BIGINT DEFAULT 1000000 CHECK (price_per_message >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  txn_sig TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create follows table for user relationships
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('core_update', 'user_streaming', 'new_launch', 'following_post', 'following_stream', 'following_tip')),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create live_streams table
CREATE TABLE IF NOT EXISTS live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'live' CHECK (status IN ('live', 'ended', 'scheduled')),
  stream_key TEXT,
  viewer_count INTEGER DEFAULT 0 CHECK (viewer_count >= 0),
  max_viewers INTEGER DEFAULT 0 CHECK (max_viewers >= 0),
  duration INTEGER DEFAULT 0 CHECK (duration >= 0),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_post_id ON purchases(post_id);
CREATE INDEX IF NOT EXISTS idx_tips_from_user ON tips(from_user);
CREATE INDEX IF NOT EXISTS idx_tips_to_user ON tips(to_user);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_creator ON chat_messages(user_id, creator_id);
-- Critical indexes for 1M+ users performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_composite ON follows(follower_id, following_id);

-- Indexes for post_likes table
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_composite ON post_likes(post_id, user_id);

CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_is_creator ON users(is_creator);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_price ON posts(price_lamports);
CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(likes DESC);

CREATE INDEX IF NOT EXISTS idx_tokens_creator_id ON tokens(creator_id);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_personas_creator_id ON ai_personas(creator_id);
CREATE INDEX IF NOT EXISTS idx_ai_personas_active ON ai_personas(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_personas_created_at ON ai_personas(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_creator ON chat_messages(user_id, creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_creator_user ON chat_messages(creator_id, user_id);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_creator_id ON purchases(creator_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tips_from_user ON tips(from_user);
CREATE INDEX IF NOT EXISTS idx_tips_to_user ON tips(to_user);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON tips(created_at DESC);

-- Indexes for activities table
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_target_user_id ON activities(target_user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_is_read ON activities(is_read);

-- Indexes for live_streams table
CREATE INDEX IF NOT EXISTS idx_live_streams_creator_id ON live_streams(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_created_at ON live_streams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_streams_viewer_count ON live_streams(viewer_count DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users
DROP POLICY IF EXISTS "Public read users" ON users;
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Create RLS policies for posts
DROP POLICY IF EXISTS "Public read published posts" ON posts;
CREATE POLICY "Public read published posts" ON posts FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Creators can read own posts" ON posts;
CREATE POLICY "Creators can read own posts" ON posts FOR SELECT USING (auth.uid()::text = creator_id);

DROP POLICY IF EXISTS "Creators can manage own posts" ON posts;
CREATE POLICY "Creators can manage own posts" ON posts FOR ALL USING (auth.uid()::text = creator_id);

-- Create RLS policies for tokens
DROP POLICY IF EXISTS "Public read tokens" ON tokens;
CREATE POLICY "Public read tokens" ON tokens FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can manage own tokens" ON tokens;
CREATE POLICY "Creators can manage own tokens" ON tokens FOR ALL USING (auth.uid()::text = creator_id);

-- Create RLS policies for purchases
DROP POLICY IF EXISTS "Users can read own purchases" ON purchases;
CREATE POLICY "Users can read own purchases" ON purchases FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create purchases" ON purchases;
CREATE POLICY "Users can create purchases" ON purchases FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policies for tips
DROP POLICY IF EXISTS "Users can read own tips" ON tips;
CREATE POLICY "Users can read own tips" ON tips FOR SELECT USING (auth.uid()::text = from_user OR auth.uid()::text = to_user);

DROP POLICY IF EXISTS "Users can create tips" ON tips;
CREATE POLICY "Users can create tips" ON tips FOR INSERT WITH CHECK (auth.uid()::text = from_user);

-- Create RLS policies for ai_personas
DROP POLICY IF EXISTS "Public read active personas" ON ai_personas;
CREATE POLICY "Public read active personas" ON ai_personas FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Creators can manage own personas" ON ai_personas;
CREATE POLICY "Creators can manage own personas" ON ai_personas FOR ALL USING (auth.uid()::text = creator_id);

-- Create RLS policies for chat_messages
DROP POLICY IF EXISTS "Users can read own messages" ON chat_messages;
CREATE POLICY "Users can read own messages" ON chat_messages FOR SELECT USING (auth.uid()::text = user_id OR auth.uid()::text = creator_id);

DROP POLICY IF EXISTS "Users can create messages" ON chat_messages;
CREATE POLICY "Users can create messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policies for follows
DROP POLICY IF EXISTS "Public read follows" ON follows;
CREATE POLICY "Public read follows" ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own follows" ON follows;
CREATE POLICY "Users can manage own follows" ON follows FOR ALL USING (auth.uid()::text = follower_id);

-- Create RLS policies for post_likes
DROP POLICY IF EXISTS "Public read post likes" ON post_likes;
CREATE POLICY "Public read post likes" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own post likes" ON post_likes;
CREATE POLICY "Users can manage own post likes" ON post_likes FOR ALL USING (auth.uid()::text = user_id);

-- Create RLS policies for activities
DROP POLICY IF EXISTS "Public read activities" ON activities;
CREATE POLICY "Public read activities" ON activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create activities" ON activities;
CREATE POLICY "Users can create activities" ON activities FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own activities" ON activities;
CREATE POLICY "Users can update own activities" ON activities FOR UPDATE USING (auth.uid()::text = user_id OR auth.uid()::text = target_user_id);

-- Create RLS policies for live_streams
DROP POLICY IF EXISTS "Public read live streams" ON live_streams;
CREATE POLICY "Public read live streams" ON live_streams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can manage own streams" ON live_streams;
CREATE POLICY "Creators can manage own streams" ON live_streams FOR ALL USING (auth.uid()::text = creator_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_personas_updated_at BEFORE UPDATE ON ai_personas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data removed - database will start empty

-- Verify tables were created
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'posts', 'tokens', 'purchases', 'tips', 'ai_personas', 'chat_messages', 'follows', 'activities', 'live_streams')
ORDER BY table_name, ordinal_position;
