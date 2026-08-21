'use client';

import React from 'react';
import Link from 'next/link';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    desc: string;
    image: string;
  };
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const isWellness = category.id === 'wellness';

  return (
    <Link
      href={isWellness ? '/wellness' : `/${category.id}`}
      className={`group relative h-48 sm:h-56 rounded-2xl overflow-hidden block transition-all duration-300 border ${
        isWellness 
          ? 'border-wellness-bronze/10 hover:border-wellness-bronze/55 wellness-shadow' 
          : 'border-zinc-100 premium-shadow'
      }`}
    >
      {/* Background Image */}
      <div className="absolute inset-0 bg-zinc-950">
        <img
          src={category.image}
          alt={category.name}
          className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Elegant overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 p-5 flex flex-col justify-end">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${isWellness ? 'text-wellness-bronze-light' : 'text-brand-gold-light'}`}>
          Category
        </span>
        <h3 className="text-base font-serif font-bold text-white tracking-wide mt-1">
          {category.name}
        </h3>
        <p className="text-[10px] text-zinc-300 leading-snug max-w-xs mt-1 opacity-90 truncate">
          {category.desc}
        </p>
      </div>
    </Link>
  );
}
