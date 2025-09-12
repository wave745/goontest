import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with service role key for uploads
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export { supabase };

// Storage bucket name
export const STORAGE_BUCKET = 'goonhub-media';

// Helper function to upload profile picture
export async function uploadProfilePicture(file: File, userId: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase not configured - file uploads are disabled');
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    
    console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }

    console.log('Upload successful:', data);

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Upload function error:', error);
    throw error;
  }
}

// Helper function to upload banner image
export async function uploadBannerImage(file: File, userId: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase not configured - file uploads are disabled');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/banner.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload banner image: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return publicUrl;
}
