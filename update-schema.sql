-- Add new tables for activities and live streams
-- Run this in your Supabase SQL Editor

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
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Create indexes for activities table
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_target_user_id ON activities(target_user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_is_read ON activities(is_read);

-- Create indexes for live_streams table
CREATE INDEX IF NOT EXISTS idx_live_streams_creator_id ON live_streams(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_created_at ON live_streams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_streams_viewer_count ON live_streams(viewer_count DESC);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

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
