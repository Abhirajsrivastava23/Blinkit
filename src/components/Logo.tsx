'use client';

import React from 'react';

interface LogoProps {
  isWellness?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export default function Logo({ isWellness = false, className = '', size = 'md', iconOnly = false }: LogoProps) {
  const sizeClasses = {
    sm: 'text-sm sm:text-base',
    md: 'text-lg sm:text-xl md:text-2xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl'
  }[size];

  if (iconOnly) {
    return (
      <div 
        className={`inline-flex items-center justify-center font-sans font-black select-none rounded-xl shrink-0 ${
          isWellness ? 'bg-wellness-bronze text-zinc-950' : 'bg-brand-burgundy text-white'
        } ${size === 'sm' ? 'h-6 w-6 text-xs' : size === 'lg' ? 'h-12 w-12 text-lg' : 'h-8 w-8 text-sm'} ${className}`}
      >
        F
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center select-none font-sans font-black tracking-tighter ${sizeClasses} ${className}`}>
      <span className={isWellness ? 'text-wellness-bronze' : 'text-brand-burgundy'}>
        FATA
      </span>
      <span 
        className={`ml-1 px-1.5 py-0.5 rounded-lg text-white font-black text-[0.85em] uppercase leading-none shadow-sm ${
          isWellness ? 'bg-wellness-bronze text-zinc-950' : 'bg-brand-coral'
        }`}
      >
        FAT
      </span>
    </div>
  );
}
