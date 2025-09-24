import { randomUUID } from 'crypto';
import { promises as fs, createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export interface UploadResult {
  url: string;
  thumbnail?: string;
  filename: string;
  size: number;
  mimeType: string;
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

export async function uploadToDigitalOcean(
  file: Express.Multer.File,
  category: string = 'posts'
): Promise<UploadResult> {
  console.log('Processing real file upload:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);
  return uploadToLocalStorage(file, category);
}

// Optimized async file upload function for local storage
async function uploadToLocalStorage(
  file: Express.Multer.File,
  category: string = 'posts'
): Promise<UploadResult> {
  const fileExtension = file.originalname.split('.').pop() || '';
  const uniqueFilename = `${category}_${randomUUID()}.${fileExtension}`;
  const finalPath = path.join(uploadsDir, uniqueFilename);
  
  const startTime = Date.now();
  
  try {
    // For disk storage, file.path contains the temporary file path
    if (file.path) {
      // Move from temp location to final location (much faster than copying)
      await fs.rename(file.path, finalPath);
    } else if (file.buffer) {
      // Fallback for memory storage - use streaming
      const readable = Readable.from(file.buffer);
      const writeStream = createWriteStream(finalPath);
      await pipeline(readable, writeStream);
    } else {
      throw new Error('No file data available');
    }
    
    const uploadTime = Date.now() - startTime;
    console.log(`File saved to: ${finalPath} (${uploadTime}ms)`);
    
    // Generate the URL that will be served by Express
    const fileUrl = `/uploads/${uniqueFilename}`;
    
    return {
      url: fileUrl,
      thumbnail: fileUrl, // For now, use same file as thumbnail
      filename: uniqueFilename,
      size: file.size,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to save file to disk');
  }
}

export function generateThumbnail(file: Express.Multer.File): Promise<string> {
  // In a real implementation, you'd use a library like sharp or ffmpeg
  // to generate thumbnails for images and videos
  return Promise.resolve(file.originalname);
}
