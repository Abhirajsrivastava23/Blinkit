'use client';

import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export default function SafeImage({ src, alt, className, fallbackSrc, ...props }: SafeImageProps) {
  const [error, setError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setError(false);
  }, [src]);

  const handleError = () => {
    setError(true);
  };

  if (error || !src) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF0EE] to-[#FDFBF7] text-[#6B1D2F]/50 border border-[#E58B75]/10 font-sans p-4 text-center select-none ${className}`}
      >
        <ImageOff className="h-5 w-5 mb-1.5 opacity-60 text-[#6B1D2F]" />
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#6B1D2F] line-clamp-2 px-2">
          {alt || 'FATAFAT Item'}
        </span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={handleError}
      loading="lazy"
      {...props}
    />
  );
}
