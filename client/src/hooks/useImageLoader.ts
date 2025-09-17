import { useState, useEffect } from 'react';

interface UseImageLoaderOptions {
  enableCacheBusting?: boolean;
}

export function useImageLoader(src: string, options: UseImageLoaderOptions = {}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setImageSrc(null);

    const img = new Image();
    
    const finalSrc = options.enableCacheBusting 
      ? `${src}?t=${Date.now()}` 
      : src;

    img.onload = () => {
      setImageSrc(finalSrc);
      setIsLoading(false);
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };

    img.src = finalSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, options.enableCacheBusting]);

  return {
    imageSrc,
    isLoading,
    hasError,
  };
}