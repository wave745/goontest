import { useEffect, useState } from 'react';

interface PreloadedImages {
  [key: string]: string;
}

export function useImagePreloader(imageUrls: string[]) {
  const [preloadedImages, setPreloadedImages] = useState<PreloadedImages>({});
  const [isPreloading, setIsPreloading] = useState(false); // Start as false for non-blocking
  const [preloadProgress, setPreloadProgress] = useState(0);

  useEffect(() => {
    if (!imageUrls.length) {
      setIsPreloading(false);
      return;
    }

    let loadedCount = 0;
    const totalImages = imageUrls.length;
    const loadedImages: PreloadedImages = {};

    const preloadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          loadedImages[url] = url;
          loadedCount++;
          setPreloadProgress(Math.round((loadedCount / totalImages) * 100));
          
          if (loadedCount === totalImages) {
            setPreloadedImages(loadedImages);
            setIsPreloading(false);
            console.log('✅ All images preloaded successfully');
          }
          resolve();
        };

        img.onerror = () => {
          console.error(`❌ Failed to preload image: ${url}`);
          loadedCount++;
          setPreloadProgress(Math.round((loadedCount / totalImages) * 100));
          
          if (loadedCount === totalImages) {
            setPreloadedImages(loadedImages);
            setIsPreloading(false);
          }
          reject(new Error(`Failed to load ${url}`));
        };

        img.src = url;
      });
    };

    // Start preloading all images
    Promise.allSettled(imageUrls.map(preloadImage))
      .then(() => {
        console.log('🎯 Image preloading completed');
      })
      .catch((error) => {
        console.error('❌ Image preloading failed:', error);
      });

  }, [imageUrls]);

  return { preloadedImages, isPreloading, preloadProgress };
}

