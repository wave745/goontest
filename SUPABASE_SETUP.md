# 🚀 Supabase Pro Plan Setup Guide

## Step 1: Database Schema Setup

1. **Go to your Supabase Dashboard**
   - Navigate to your project dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Run the Database Schema**
   - Copy the contents of `supabase-schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the schema

   This will create all the necessary tables:
   - `users` - User profiles and wallet data
   - `posts` - Content posts
   - `tokens` - GOON tokens
   - `purchases` - Content purchases
   - `tips` - Creator tips
   - `ai_personas` - AI chat personas
   - `chat_messages` - Chat history
   - `follows` - User relationships

## Step 2: Environment Configuration

1. **Get your Supabase credentials**
   - Go to Settings > API in your Supabase dashboard
   - Copy your Project URL and API keys

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Update your `.env` file with your credentials:**
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   
   # Database
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   
   # Development
   NODE_ENV=development
   PORT=5000
   
   # File Storage
   SUPABASE_STORAGE_BUCKET=goonhub-media
   ```

## Step 3: Storage Bucket Setup

1. **Create Storage Bucket**
   - Go to Storage in your Supabase dashboard
   - Click "New bucket"
   - Name: `goonhub-media`
   - Make it public: ✅
   - Click "Create bucket"

2. **Set up Storage Policies**
   ```sql
   -- Allow public read access to media
   CREATE POLICY "Public read access" ON storage.objects
   FOR SELECT USING (bucket_id = 'goonhub-media');
   
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated users can upload" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'goonhub-media' AND 
     auth.role() = 'authenticated'
   );
   
   -- Allow users to update their own files
   CREATE POLICY "Users can update own files" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'goonhub-media' AND 
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

## Step 4: Enable Supabase Storage

Update your server configuration to use Supabase storage instead of in-memory storage:

```typescript
// In server/index.ts, replace the storage import:
import { SupabaseStorage } from './storage/supabase-storage.js';
import { storage } from './storage.js';

// Replace with:
const storage = new SupabaseStorage();
```

## Step 5: Test the Integration

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the profile endpoints:**
   ```bash
   # Test profile creation
   curl -X GET http://localhost:5000/api/profile/test_wallet_address
   
   # Test profile update
   curl -X PUT http://localhost:5000/api/profile \
     -H "Content-Type: application/json" \
     -d '{"walletAddress": "test_wallet_address", "handle": "test_user", "bio": "Test bio"}'
   ```

## Step 6: File Upload Configuration

The profile picture upload is now configured to use Supabase Storage. When users upload profile pictures, they will be stored in your `goonhub-media` bucket.

## Benefits of Supabase Pro Plan

With your Pro plan, you now have:

- ✅ **Dedicated CPU** - Better performance for your app
- ✅ **1 GB RAM** - Improved responsiveness
- ✅ **100K MAU** - Handle more users
- ✅ **8 GB Database** - Store all user data
- ✅ **250 GB Bandwidth** - Serve content faster
- ✅ **100 GB File Storage** - Store profile pictures and media
- ✅ **Real-time subscriptions** - Live updates
- ✅ **Row Level Security** - Secure data access
- ✅ **Automatic backups** - Data protection

## Next Steps

1. Run the database schema setup
2. Configure your environment variables
3. Set up the storage bucket
4. Test the integration
5. Deploy your app with the new Supabase backend!

Your GoonHub profile system is now ready to scale with Supabase Pro! 🎉
