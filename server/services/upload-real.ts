import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export interface UploadResult {
  url: string;
  thumbnail?: string;
  filename: string;
  size: number;
  mimeType: string;
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function uploadToDigitalOcean(
  file: Express.Multer.File,
  category: string = 'posts'
): Promise<UploadResult> {
  console.log('Processing real file upload:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);
  return uploadToLocalStorage(file, category);
}

// Real file upload function for local storage
function uploadToLocalStorage(
  file: Express.Multer.File,
  category: string = 'posts'
): UploadResult {
  const fileExtension = file.originalname.split('.').pop() || '';
  const uniqueFilename = `${category}_${randomUUID()}.${fileExtension}`;
  const filePath = path.join(uploadsDir, uniqueFilename);
  
  // Write the file to disk
  fs.writeFileSync(filePath, file.buffer);
  console.log('File saved to:', filePath);
  
  // Generate the URL that will be served by Express
  const fileUrl = `/uploads/${uniqueFilename}`;
  
  return {
    url: fileUrl,
    thumbnail: fileUrl, // For now, use same file as thumbnail
    filename: uniqueFilename,
    size: file.size,
    mimeType: file.mimetype,
  };
}

export function generateThumbnail(file: Express.Multer.File): Promise<string> {
  // In a real implementation, you'd use a library like sharp or ffmpeg
  // to generate thumbnails for images and videos
  return Promise.resolve(file.originalname);
}
