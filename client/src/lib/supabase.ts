import { createClient } from '@supabase/supabase-js';

// Use hardcoded values for now (in production, these should be environment variables)
const supabaseUrl = 'https://rjgpjuxrxtsdlssdrqby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqZ3BqdXhyeHRzZGxzc2RycWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTM2MzgsImV4cCI6MjA3MjMyOTYzOH0.Tni2CEx6bXGLvJhJkkH_51PRGg3-hhyDxOndg5CaUxQ';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqZ3BqdXhyeHRzZGxzc2RycWJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc1MzYzOCwiZXhwIjoyMDcyMzI5NjM4fQ.0HCcJo8H1mtwwHzjvQVo6I6fYaHGLH-Ldj16PpieJew';

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
