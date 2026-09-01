'use client';

import React, { useState, useEffect } from 'react';
import { resolveImageUrl, CATEGORY_FALLBACK_IMAGES } from '../utils/imageUtils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  category?: string;
}

export default function SafeImage({ src, alt, className, fallbackSrc, category, ...props }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [fallbackTried, setFallbackTried] = useState(false);

  const initialResolved = resolveImageUrl(typeof src === 'string' ? src : undefined, category);
  const effectiveFallback = fallbackSrc || (category ? CATEGORY_FALLBACK_IMAGES[category.toLowerCase()] : undefined) || CATEGORY_FALLBACK_IMAGES['default'];

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
    setFallbackTried(false);
  }, [src]);

  const handleError = () => {
    if (!fallbackTried && effectiveFallback && src !== effectiveFallback) {
      setFallbackTried(true);
    } else {
      setHasError(true);
    }
  };

  const currentSrc = fallbackTried ? effectiveFallback : initialResolved;

  if (hasError || !currentSrc) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF0EE] to-[#FDFBF7] border border-brand-blush font-sans p-4 text-center select-none overflow-hidden relative ${className || ''}`}
      >
        <div className="absolute inset-0 bg-brand-gold/5 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-brand-burgundy/10 flex items-center justify-center text-brand-burgundy font-serif font-black text-xs">
            F
          </div>
        </div>
      </div>
    );
  }

  return (
    <img 
      key={currentSrc}
      src={currentSrc} 
      alt={alt || 'FATAFAT Item'} 
      className={className} 
      onError={handleError}
      loading="lazy"
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}
