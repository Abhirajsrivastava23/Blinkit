'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  isWellness?: boolean;
}

export default function Breadcrumbs({ isWellness = false }: BreadcrumbsProps) {
  const pathname = usePathname();
  
  if (pathname === '/') return null;

  // Split path into segments and filter empty entries
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center space-x-1.5 text-[10px] uppercase font-bold tracking-wider opacity-60 mb-6 py-2 select-none">
      <Link 
        href={isWellness ? '/wellness' : '/'} 
        className={`flex items-center gap-1 transition-colors ${
          isWellness ? 'hover:text-wellness-bronze-light' : 'hover:text-brand-burgundy'
        }`}
      >
        <Home className="h-3 w-3" />
        <span>Home</span>
      </Link>
      
      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        
        // Clean display name
        let displayName = decodeURIComponent(segment).replace(/-/g, ' ');
        if (segment.startsWith('VM') && segment.length > 4) {
          displayName = `Order #${segment}`;
        }

        return (
          <React.Fragment key={url}>
            <ChevronRight className="h-3 w-3 opacity-60 shrink-0" />
            {isLast ? (
              <span className="truncate max-w-[150px] text-current">{displayName}</span>
            ) : (
              <Link 
                href={url}
                className={`transition-colors truncate max-w-[120px] ${
                  isWellness ? 'hover:text-wellness-bronze-light' : 'hover:text-brand-burgundy'
                }`}
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
