import { MemStorage } from '../storage.js';
import { SupabaseStorage } from './supabase-storage.js';
import type { IStorage } from '../storage.js';

let storage: IStorage;

// Initialize storage based on environment
// Force in-memory storage for development
console.log('⚠️  Using in-memory storage (Development mode)');
storage = new MemStorage();

export { storage };
