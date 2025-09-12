import { useState, useEffect, useRef } from 'react';

interface UseImageLoaderOptions {
  retries?: number;
  retryDelay?: number;
  enableCacheBusting?: boolean;
}

export function useImageLoader(src: string, options: UseImageLoaderOptions = {}) {
  const { retries = 3, retryDelay = 1000, enableCacheBusting = true } = options;
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAttemptRef = useRef<number>(0);

  useEffect(() => {
    if (!src) {
      setImageSrc('');
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
    currentAttemptRef.current = 0;

    const loadImage = (attemptSrc: string, attempt: number = 0) => {
      // Create new abort controller for this attempt
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const img = new Image();
      
      img.onload = () => {
        // Check if this request was aborted
        if (signal.aborted) return;
        
        setImageSrc(attemptSrc);
        setIsLoading(false);
        setHasError(false);
        console.log(`✅ Image loaded successfully: ${src} (attempt ${attempt + 1})`);
      };

      img.onerror = () => {
        // Check if this request was aborted
        if (signal.aborted) return;
        
        console.error(`❌ Image load failed: ${src} (attempt ${attempt + 1})`);
        
        if (attempt < retries) {
          setTimeout(() => {
            // Check if component is still mounted and not aborted
            if (signal.aborted) return;
            
            setRetryCount(attempt + 1);
            currentAttemptRef.current = attempt + 1;
            loadImage(attemptSrc, attempt + 1);
          }, retryDelay);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      };

      // Add abort signal to image loading
      if (signal.aborted) return;
      img.src = attemptSrc;
    };

    // Create cache-busted URL only once per effect
    const baseSrc = enableCacheBusting ? `${src}?v=${Date.now()}` : src;
    loadImage(baseSrc);

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [src, retries, retryDelay, enableCacheBusting]);

  return { imageSrc, isLoading, hasError, retryCount };
}
