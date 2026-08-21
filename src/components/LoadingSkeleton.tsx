'use client';

import React from 'react';

interface SkeletonProps {
  count?: number;
  isWellness?: boolean;
}

export function ProductCardSkeleton({ isWellness = false }) {
  return (
    <div className={`rounded-2xl overflow-hidden border p-4 space-y-4 ${
      isWellness ? 'bg-wellness-card border-wellness-bronze/10' : 'bg-white border-zinc-100'
    }`}>
      {/* Image Block */}
      <div className={`aspect-square w-full rounded-xl animate-pulse relative overflow-hidden ${
        isWellness ? 'bg-wellness-dark/70' : 'bg-zinc-100'
      }`}>
        <div className="shimmer absolute inset-0" />
      </div>
      
      {/* Title & Info lines */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className={`h-3 w-12 rounded animate-pulse relative overflow-hidden ${
            isWellness ? 'bg-wellness-dark/70' : 'bg-zinc-100'
          }`}>
            <div className="shimmer absolute inset-0" />
          </div>
          <div className={`h-3 w-16 rounded animate-pulse relative overflow-hidden ${
            isWellness ? 'bg-wellness-dark/70' : 'bg-zinc-100'
          }`}>
            <div className="shimmer absolute inset-0" />
          </div>
        </div>

        <div className={`h-4 w-3/4 rounded animate-pulse relative overflow-hidden ${
          isWellness ? 'bg-wellness-dark/70' : 'bg-zinc-100'
        }`}>
          <div className="shimmer absolute inset-0" />
        </div>

        <div className="flex items-center gap-1">
          <div className={`h-3.5 w-16 rounded animate-pulse relative overflow-hidden ${
            isWellness ? 'bg-wellness-dark/70' : 'bg-zinc-100'
          }`}>
            <div className="shimmer absolute inset-0" />
          </div>
        </div>
      </div>

      {/* Pricing & Button line */}
      <div className="flex items-center justify-between pt-3 border-t border-opacity-5 border-zinc-500">
        <div className="space-y-1">
          <div className={`h-4.5 w-12 rounded animate-pulse relative overflow-hidden ${
            isWellness ? 'bg-wellness-dark/70' : 'bg-zinc-100'
          }`}>
            <div className="shimmer absolute inset-0" />
          </div>
          <div className={`h-2.5 w-16 rounded animate-pulse relative overflow-hidden ${
            isWellness ? 'bg-wellness-dark/70' : 'bg-zinc-100'
          }`}>
            <div className="shimmer absolute inset-0" />
          </div>
        </div>
        <div className={`h-8 w-16 rounded-full animate-pulse relative overflow-hidden ${
          isWellness ? 'bg-wellness-dark/70' : 'bg-zinc-100'
        }`}>
          <div className="shimmer absolute inset-0" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, isWellness = false }: SkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(count)].map((_, i) => (
        <ProductCardSkeleton key={i} isWellness={isWellness} />
      ))}
    </div>
  );
}

export function CategoryGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-48 sm:h-56 rounded-2xl bg-zinc-100 border border-zinc-200 border-opacity-40 animate-pulse relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
          <div className="absolute bottom-5 left-5 right-5 space-y-2">
            <div className="h-3 w-12 bg-zinc-300 rounded" />
            <div className="h-5 w-2/3 bg-zinc-300 rounded" />
            <div className="h-3 w-3/4 bg-zinc-300 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
