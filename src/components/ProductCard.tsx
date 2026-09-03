'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Heart } from 'lucide-react';
import { Product } from '../data/mockData';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from './Toast';
import SafeImage from './SafeImage';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { cartItems, addToCart, updateQuantity } = useCart();
  const { wishlist, toggleWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  const [location, setLocation] = useState('Nawabganj, Unnao');

  // Listen to delivery location changes
  useEffect(() => {
    const handleLocChange = () => {
      setLocation(localStorage.getItem('fatafat_location') || 'Nawabganj, Unnao');
    };
    handleLocChange();
    window.addEventListener('fatafat_location_changed', handleLocChange);
    return () => window.removeEventListener('fatafat_location_changed', handleLocChange);
  }, []);

  const isFavorited = isInWishlist(product.id);
  const isWellness = product.category === 'wellness';

  const cartItem = cartItems.find((item) => item.product.id === product.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  // Dynamically calculate location-specific delivery time estimates
  const getDeliveryTime = () => {
    return 'Within 12 hours';
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    showToast(`Added ${product.name} to cart`, 'success');
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    showToast(isFavorited ? 'Removed from favorites' : 'Saved to favorites', 'success');
  };

  // Determine badges
  let badgeText = '';
  if (product.rating >= 4.8 && product.reviewCount > 15) {
    badgeText = 'BESTSELLER';
  } else if (product.discount >= 20) {
    badgeText = `${product.discount}% OFF`;
  }

  return (
    <div className={`group relative flex flex-col transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 rounded-2xl overflow-hidden border p-3 ${
      isWellness
        ? 'bg-wellness-card border-zinc-900 text-wellness-text hover:border-wellness-bronze/30 shadow-lg'
        : 'bg-white text-zinc-950 border-zinc-150/40 shadow-sm'
    }`}>
      
      {/* Aspect Ratio Square Product Image wrapper */}
      <Link 
        href={isWellness ? `/wellness/product/${product.id}` : `/product/${product.id}`} 
        className="relative block aspect-square overflow-hidden rounded-xl bg-zinc-50 border border-zinc-100/50"
      >
        <SafeImage
          src={product.image}
          alt={product.name}
          category={product.category}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
        />
        
        {/* Quick View Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('fatafat_quickview', { detail: product }));
          }}
          className="absolute inset-x-0 bottom-0 bg-white/90 text-[#6B1D2F] font-sans font-black text-[9px] uppercase tracking-wider py-2 text-center border-t opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 hidden sm:block shadow-sm"
        >
          Quick View
        </button>
        
        {/* Wishlist Button Overlay */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all z-10 ${
            isWellness
              ? isFavorited 
                ? 'bg-wellness-bronze text-zinc-950 shadow' 
                : 'bg-wellness-black/60 text-wellness-text hover:bg-wellness-black/90'
              : isFavorited
                ? 'bg-brand-burgundy text-white shadow'
                : 'bg-white/80 text-zinc-650 hover:bg-white hover:scale-105 border'
          }`}
        >
          <Heart className="h-3 w-3" fill={isFavorited ? 'currentColor' : 'none'} />
        </button>

        {/* Bestseller / Offer Badge */}
        {badgeText && (
          <span className={`absolute top-2.5 left-2.5 text-[7px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full text-white shadow-sm select-none ${
            isWellness ? 'bg-wellness-bronze text-zinc-950' : 'bg-brand-burgundy'
          }`}>
            {badgeText}
          </span>
        )}

        {/* Eggless Indicator */}
        {!isWellness && product.egglessAvailable && (
          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-[6px] font-black bg-white/90 text-green-700 px-1.5 py-0.5 rounded border border-green-200 shadow-sm select-none">
            <span className="h-1 w-1 rounded-full bg-green-600 inline-block"></span>
            EGGLESS
          </span>
        )}

        {/* Out of Stock Overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-zinc-900/90 text-white font-sans font-black text-[8px] tracking-[0.15em] uppercase px-3 py-1 rounded-full border border-white/10 shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Info details */}
      <div className="pt-2 flex flex-col justify-between flex-grow space-y-1">
        <div className="space-y-0.5">
          {/* Subheader category & Delivery estimate */}
          <div className="flex justify-between items-center text-[7px] opacity-50 font-bold uppercase tracking-wider select-none">
            <span>{product.category}</span>
            <span className="text-brand-burgundy font-black">⚡ {getDeliveryTime()}</span>
          </div>

          {/* Title */}
          <Link href={isWellness ? `/wellness/product/${product.id}` : `/product/${product.id}`} className="block">
            <h3 className="text-xs font-bold leading-tight line-clamp-1 hover:text-brand-burgundy transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-0.5 text-zinc-500">
            <Star className={`h-2.5 w-2.5 fill-current text-amber-400`} />
            <span className="text-[9px] font-black text-zinc-800">{product.rating}</span>
            <span className="text-[8px] opacity-40">({product.reviewCount})</span>
          </div>
        </div>

        {/* Buy Actions Row */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-200/10">
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-extrabold text-zinc-900">₹{product.price}</span>
            {product.discount > 0 && (
              <span className="text-[9px] line-through opacity-30 font-medium">₹{product.originalPrice}</span>
            )}
          </div>

          {product.inStock ? (
            quantityInCart > 0 ? (
              <div className={`flex items-center rounded-lg overflow-hidden border select-none ${
                isWellness
                  ? 'border-wellness-bronze bg-wellness-bronze text-zinc-950'
                  : 'border-brand-burgundy bg-brand-burgundy text-white'
              }`}>
                <button
                  onClick={() => updateQuantity(product.id, quantityInCart - 1)}
                  className="px-2 py-0.5 font-black hover:brightness-90 transition-all text-xs"
                >
                  −
                </button>
                <span className={`px-2 py-0.5 text-[9px] font-extrabold font-mono min-w-[18px] text-center ${
                  isWellness ? 'bg-wellness-dark text-wellness-text' : 'bg-white text-zinc-900'
                }`}>
                  {quantityInCart}
                </span>
                <button
                  onClick={() => updateQuantity(product.id, quantityInCart + 1)}
                  className="px-2 py-0.5 font-black hover:brightness-90 transition-all text-xs"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                className={`text-[8px] font-black uppercase tracking-wider py-1 px-3.5 rounded-lg border transition-all duration-300 hover:scale-103 ${
                  isWellness
                    ? 'border-wellness-bronze text-wellness-bronze hover:bg-wellness-bronze hover:text-zinc-950'
                    : 'border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy hover:text-white'
                }`}
              >
                ADD
              </button>
            )
          ) : (
            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 select-none">
              SOLD OUT
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
