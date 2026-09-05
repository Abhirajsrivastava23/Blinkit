/**
 * Centralized Image Resolution & Multi-Tier Fallback System for FATAFAT
 */

// Helper to create branded vector SVG data URIs that NEVER fail
function createCategorySvg(emoji: string, label: string, bgGradientFrom: string, bgGradientTo: string, accentColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradientFrom}"/>
        <stop offset="100%" stop-color="${bgGradientTo}"/>
      </linearGradient>
      <radialGradient id="r" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.25"/>
      </radialGradient>
    </defs>
    <rect width="600" height="600" fill="url(#g)"/>
    <rect width="600" height="600" fill="url(#r)"/>
    <circle cx="300" cy="260" r="130" fill="${accentColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="2" stroke-opacity="0.3"/>
    <text x="300" y="295" font-size="110" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${emoji}</text>
    <rect x="180" y="415" width="240" height="42" rx="21" fill="#6B1D2F" fill-opacity="0.9" stroke="#DFBA5E" stroke-width="1.5"/>
    <text x="300" y="442" font-size="16" font-weight="900" letter-spacing="2" text-anchor="middle" fill="#DFBA5E" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">⚡ FATAFAT</text>
    <text x="300" y="495" font-size="22" font-weight="800" text-anchor="middle" fill="#ffffff" font-family="'Playfair Display',Georgia,serif" letter-spacing="0.5">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CATEGORY_SVG_FALLBACKS: Record<string, string> = {
  'birthday cakes': createCategorySvg('🎂', 'Birthday Cakes', '#2D0A14', '#5A1624', '#DFBA5E'),
  'chocolate cakes': createCategorySvg('🍫', 'Chocolate Cakes', '#23120B', '#422416', '#DFBA5E'),
  'pastries': createCategorySvg('🧁', 'Sweet Pastries', '#3D1A0C', '#6B3419', '#E58B75'),
  'beer theme cakes': createCategorySvg('🍺', 'Beer Theme Cakes', '#2C1D06', '#54360C', '#E5A93C'),
  'desserts': createCategorySvg('🍮', 'Gourmet Desserts', '#28112B', '#4A1D50', '#E585B5'),
  cakes: createCategorySvg('🎂', 'Artisanal Cakes', '#2D0A14', '#5A1624', '#DFBA5E'),
  bakery: createCategorySvg('🥐', 'Fresh Bakery', '#3D1A0C', '#6B3419', '#E58B75'),
  flowers: createCategorySvg('💐', 'Luxury Bouquets', '#1C2E1F', '#2D4A32', '#9BC19D'),
  gifts: createCategorySvg('🎁', 'Curated Gifts', '#261C3B', '#442F69', '#DFBA5E'),
  chocolates: createCategorySvg('🍫', 'Artisanal Chocolates', '#23120B', '#422416', '#DFBA5E'),
  celebrations: createCategorySvg('🎈', 'Celebration Kits', '#142238', '#1F3C63', '#DFBA5E'),
  wellness: createCategorySvg('🌿', 'Wellness Collection', '#111827', '#1F2937', '#C28E58'),
  default: createCategorySvg('✨', 'FATAFAT Collection', '#2D0A14', '#5A1624', '#DFBA5E')
};

// Verified Tier-1 external image URLs with robust formatting
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'birthday cakes': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  'chocolate cakes': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  'pastries': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'beer theme cakes': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  'desserts': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  cakes: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  flowers: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80',
  gifts: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
  chocolates: 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=600&q=80',
  celebrations: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80',
  wellness: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
  default: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'
};

export function getCategoryFallbackSvg(category?: string): string {
  const key = category ? category.toLowerCase().trim() : 'default';
  return CATEGORY_SVG_FALLBACKS[key] || CATEGORY_SVG_FALLBACKS['default'];
}

/**
 * Resolves any raw database or catalog image string into a valid, production-ready URL.
 * Handles missing values, relative /public paths, absolute URLs, and category-based fallbacks.
 */
export function resolveImageUrl(src?: string | null, category?: string): string {
  const catKey = category ? category.toLowerCase().trim() : 'default';
  const defaultFallback = CATEGORY_FALLBACK_IMAGES[catKey] || CATEGORY_FALLBACK_IMAGES['default'];

  if (!src || typeof src !== 'string') {
    return defaultFallback;
  }

  const trimmed = src.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]') {
    return defaultFallback;
  }

  // Handle data URIs and blob URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Handle root-relative public assets
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Handle protocol-relative URLs
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // Upgrade HTTP to HTTPS for secure production rendering
  let resolved = trimmed.startsWith('http://') ? trimmed.replace('http://', 'https://') : trimmed;

  // Optimize Unsplash images for quick commerce mobile bandwidth
  if (resolved.includes('images.unsplash.com')) {
    try {
      const url = new URL(resolved);
      if (!url.searchParams.has('auto')) url.searchParams.set('auto', 'format');
      if (!url.searchParams.has('fit')) url.searchParams.set('fit', 'crop');
      if (!url.searchParams.has('q')) url.searchParams.set('q', '75');
      // If width is unreasonably large (> 800) or missing, set to 500 for fast mobile rendering
      const currentWidth = parseInt(url.searchParams.get('w') || '0', 10);
      if (!currentWidth || currentWidth > 800) {
        url.searchParams.set('w', '500');
      }
      return url.toString();
    } catch {
      return resolved;
    }
  }

  // Handle standard absolute HTTPS URLs
  if (resolved.startsWith('https://')) {
    return resolved;
  }

  // If it's a relative filename without leading slash (e.g. "images/cake.jpg")
  if (!resolved.includes('://')) {
    return `/${resolved}`;
  }

  return resolved;
}
