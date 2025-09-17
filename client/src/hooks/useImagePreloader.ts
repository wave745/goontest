import { useState, useEffect } from 'react';

export function useImagePreloader(imageUrls: string[]) {
  const [preloadedImages, setPreloadedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const preloadImages = async () => {
      const promises = imageUrls.map(url => {
        return new Promise<{ url: string; success: boolean }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ url, success: true });
          img.onerror = () => resolve({ url, success: false });
          img.src = url;
        });
      });

      const results = await Promise.all(promises);
      const preloadedMap: Record<string, boolean> = {};
      
      results.forEach(({ url, success }) => {
        preloadedMap[url] = success;
      });

      setPreloadedImages(preloadedMap);
    };

    if (imageUrls.length > 0) {
      preloadImages();
    }
  }, [imageUrls.join(',')]);

  return {
    preloadedImages,
  };
}