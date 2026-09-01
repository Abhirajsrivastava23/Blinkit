/**
 * Centralized Image Resolution & Fallback System for FATAFAT
 */

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  cakes: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  pastries: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  flowers: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&auto=format&fit=crop&q=80',
  gifts: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80',
  chocolates: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&auto=format&fit=crop&q=80',
  celebrations: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80',
  wellness: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80'
};

/**
 * Resolves any raw database or catalog image string into a valid, production-ready URL.
 * Handles missing values, relative /public paths, absolute URLs, and category-based fallbacks.
 */
export function resolveImageUrl(src?: string | null, category?: string): string {
  if (!src || typeof src !== 'string') {
    const catKey = category ? category.toLowerCase().trim() : 'default';
    return CATEGORY_FALLBACK_IMAGES[catKey] || CATEGORY_FALLBACK_IMAGES['default'] || '';
  }

  const trimmed = src.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]') {
    const catKey = category ? category.toLowerCase().trim() : 'default';
    return CATEGORY_FALLBACK_IMAGES[catKey] || CATEGORY_FALLBACK_IMAGES['default'] || '';
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
  if (trimmed.startsWith('http://')) {
    return trimmed.replace('http://', 'https://');
  }

  // Handle standard absolute HTTPS URLs
  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  // If it's a relative filename without leading slash (e.g. "images/cake.jpg")
  if (!trimmed.includes('://')) {
    return `/${trimmed}`;
  }

  return trimmed;
}
