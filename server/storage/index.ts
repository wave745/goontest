import { MemStorage } from '../storage.js';
import { SupabaseStorage } from './supabase-storage.js';
import type { IStorage } from '../storage.js';

let storage: IStorage;

// Initialize storage based on environment
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('🚀 Using Supabase storage');
  storage = new SupabaseStorage();
} else {
  console.log('⚠️  Using in-memory storage (Supabase not configured)');
  storage = new MemStorage();
}

export { storage };
