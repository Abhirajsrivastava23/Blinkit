export interface Review {
  id: string;
  user: string;
  rating: number;
  text: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'Birthday Cakes' | 'Chocolate Cakes' | 'Pastries' | 'Beer Theme Cakes' | 'Desserts' | 'cakes' | 'bakery' | 'chocolates' | 'flowers' | 'gifts' | 'celebrations' | 'wellness' | 'pending' | string;
  subCategory?: string;
  shortDescription?: string;
  price: number;
  originalPrice: number;
  discount: number; // e.g. 20 for 20%
  rating: number;
  reviewCount: number;
  image: string;
  deliveryTime: string; // e.g. "30-60 mins"
  egglessAvailable?: boolean;
  isEgglessDefault?: boolean;
  inStock: boolean;
  description: string;
  ingredients: string[];
  allergens: string[];
  storageInstructions: string;
  occasions: string[]; // e.g. ["Birthday", "Anniversary"]
  tags?: string[];
  variants?: string[]; // e.g. ["0.5 KG", "1 KG"] or ["Pack of 10", "Pack of 20"]
  wellnessBrand?: string;
  wellnessType?: 'Condoms' | 'Lubricants' | 'Intimate Care';
  wellnessMaterial?: string;
  wellnessPackSize?: string;
  wellnessLubrication?: string;
  wellnessTexture?: string;
  wellnessFlavor?: string;
  wellnessVerified?: boolean;
  wellnessSku?: string;
  wellnessDetails?: {
    material: string;
    lubrication: string;
    texture: string;
    sizeFit?: string;
    flavor?: string;
    storage: string;
    manufacturer: string;
  };
  gallery?: string[];
}

export interface Combo {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  description: string;
  items: string[];
  deliveryTime: string;
}

import productsJson from './db/products.json';

export const CATEGORIES = [
  { id: 'cakes', name: 'Cakes', desc: 'Freshly baked celebratory & designer cakes', image: '/categories/category-cakes.jpg' },
  { id: 'pastries', name: 'Pastries', desc: 'Fresh individual pastry slices & party boxes', image: '/categories/category-pastries.png' },
  { id: 'desserts', name: 'Desserts', desc: 'Cheesecakes, jar cakes, verrine cups & cookies', image: '/categories/category-desserts.jpg' },
  { id: 'flowers', name: 'Flowers', desc: 'Fresh flower bouquets & floral arrangements', image: '/categories/category-flowers.jpg' },
  { id: 'chocolates', name: 'Chocolates', desc: 'Handcrafted luxury chocolate truffles & bars', image: '/categories/category-chocolates.png' },
  { id: 'gifts', name: 'Gift Hampers', desc: 'Curated celebration gift hampers & boxes', image: '/categories/category-gifts.jpg' },
  { id: 'wellness', name: 'Wellness (18+)', desc: 'Discreet and lawful adult-wellness essentials', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80' }
];

export const OCCASIONS = [
  { id: 'birthday', name: 'Birthday', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80' },
  { id: 'valentines', name: "Valentine's Day", image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80' },
  { id: 'congratulations', name: 'Congratulations', image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80' },
  { id: 'thankyou', name: 'Thank You', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80' },
  { id: 'justbecause', name: 'Just Because', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&auto=format&fit=crop&q=80' }
];

export const COMBOS: Combo[] = [];

export const PRODUCTS: Product[] = (productsJson || []) as unknown as Product[];

export const MOCK_REVIEWS: Review[] = [
  { id: 'rev-1', user: 'Aman Sharma', rating: 5, text: 'The Chocolate Truffle cake was incredibly fresh! It was delivered in exactly 35 minutes and was very rich and delicious. Highly recommend FATAFAT.', date: '2026-08-15' },
  { id: 'rev-2', user: 'Priya Iyer', rating: 4, text: 'Very elegant packaging. The roses bouquet looked exactly like the picture. A bit pricey but worth the premium feel.', date: '2026-08-18' },
  { id: 'rev-3', user: 'Rajiv Bhatia', rating: 5, text: 'I ordered the Anniversary combo. The red velvet cake was super moist and eggless. The calligraphic card was a very premium touch.', date: '2026-08-19' },
  { id: 'rev-4', user: 'Sneha Roy', rating: 5, text: 'Very quick delivery! Ordered bento cake for a small office celebration and it came with a candle and cute wooden spoon.', date: '2026-08-20' }
];
