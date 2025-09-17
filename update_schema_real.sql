-- Update Supabase Schema for GoonHub Real Functionality
-- Run this in your Supabase SQL Editor

-- Add content type and live status to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_type TEXT CHECK (content_type IN ('video', 'photo', 'live'));
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;

-- Add new flag for GOON coins
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT TRUE;

-- Create follows table for real follower system
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Create activities table for recent page
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('post', 'coin', 'follow', 'stream')),
  target_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_content_type ON posts(content_type);
CREATE INDEX IF NOT EXISTS idx_posts_is_live ON posts(is_live);
CREATE INDEX IF NOT EXISTS idx_tokens_is_new ON tokens(is_new);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);

-- Create RLS policies
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Follows policies
CREATE POLICY "Users can view follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can create follows" ON follows FOR INSERT WITH CHECK (follower_id = auth.uid()::text);
CREATE POLICY "Users can delete their follows" ON follows FOR DELETE USING (follower_id = auth.uid()::text);

-- Activities policies
CREATE POLICY "Users can view activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Users can create activities" ON activities FOR INSERT WITH CHECK (user_id = auth.uid()::text);
