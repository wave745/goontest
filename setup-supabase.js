#!/usr/bin/env node

/**
 * Supabase Setup Script for GoonHub
 * 
 * This script helps you set up the required database tables and policies.
 * Run the SQL commands in your Supabase dashboard SQL editor.
 */

console.log(`
🚀 GoonHub Supabase Setup
==========================

Please run the following SQL commands in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the following SQL commands:

`);

const sqlCommands = `
-- Create tokens table
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL,
  mint_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  supply BIGINT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goon_keypairs table for pre-generated vanity addresses
CREATE TABLE IF NOT EXISTS goon_keypairs (
  id SERIAL PRIMARY KEY,
  public_key TEXT UNIQUE NOT NULL,
  secret_key TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE goon_keypairs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Public read tokens" ON tokens;
CREATE POLICY "Public read tokens" ON tokens FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner write tokens" ON tokens;
CREATE POLICY "Owner write tokens" ON tokens FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read keypairs" ON goon_keypairs;
CREATE POLICY "Public read keypairs" ON goon_keypairs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin update keypairs" ON goon_keypairs;
CREATE POLICY "Admin update keypairs" ON goon_keypairs FOR UPDATE USING (true);

-- Insert some sample data (optional)
INSERT INTO goon_keypairs (public_key, secret_key, used) VALUES
  ('BkgPQZirJDceEp82JmguB7WFvomwqMwxdSSM9XfXgoon', 'sample-secret-key-1', false),
  ('CkgPQZirJDceEp82JmguB7WFvomwqMwxdSSM9XfXgoon', 'sample-secret-key-2', false),
  ('DkgPQZirJDceEp82JmguB7WFvomwqMwxdSSM9XfXgoon', 'sample-secret-key-3', false)
ON CONFLICT (public_key) DO NOTHING;

-- Verify tables were created
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('tokens', 'goon_keypairs')
ORDER BY table_name, ordinal_position;
`;

console.log(sqlCommands);

console.log(`
✅ After running the SQL commands:

1. Check that both tables were created successfully
2. Verify the RLS policies are in place
3. Note your Supabase URL and anon key from Settings > API
4. Create a .env.local file with your credentials

Next steps:
- Run the pre-generation script: npx ts-node pregenGoonKeypairs.ts
- Upload the generated keypairs to the goon_keypairs table
- Start the development server: yarn dev
- Visit http://localhost:3000/coins

Need help? Check the README.md file for detailed instructions.
`);
