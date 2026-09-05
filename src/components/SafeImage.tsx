'use client';

import React, { useState, useEffect } from 'react';
import { resolveImageUrl, CATEGORY_FALLBACK_IMAGES, getCategoryFallbackSvg } from '../utils/imageUtils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  category?: string;
}

export default function SafeImage({ src, alt, className, fallbackSrc, category, ...props }: SafeImageProps) {
  // Fallback stages: 0 = primary URL, 1 = category Unsplash fallback, 2 = inline SVG fallback
  const [fallbackStage, setFallbackStage] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const initialResolved = resolveImageUrl(typeof src === 'string' ? src : undefined, category);
  const categoryUnsplashFallback = fallbackSrc || (category ? CATEGORY_FALLBACK_IMAGES[category.toLowerCase()] : undefined) || CATEGORY_FALLBACK_IMAGES['default'];
  const categorySvgFallback = getCategoryFallbackSvg(category);

  // Reset state on src change
  useEffect(() => {
    setFallbackStage(0);
    setIsLoaded(false);
  }, [src, category]);

  const handleError = () => {
    if (fallbackStage === 0) {
      // If primary failed, try category Unsplash fallback (if different) or jump to SVG
      if (categoryUnsplashFallback && initialResolved !== categoryUnsplashFallback) {
        setFallbackStage(1);
      } else {
        setFallbackStage(2);
      }
    } else if (fallbackStage === 1) {
      // If category Unsplash failed, transition to 100% reliable SVG Data-URI
      setFallbackStage(2);
    }
  };

  const getCurrentSrc = (): string => {
    if (fallbackStage === 0) return initialResolved;
    if (fallbackStage === 1) return categoryUnsplashFallback;
    return categorySvgFallback;
  };

  const currentSrc = getCurrentSrc();

  return (
    <img 
      src={currentSrc} 
      alt={alt || 'FATAFAT Item'} 
      className={`${className || ''} ${isLoaded ? 'opacity-100' : 'opacity-95'} transition-opacity duration-300`} 
      onError={handleError}
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
      crossOrigin="anonymous"
      {...props}
    />
  );
}
