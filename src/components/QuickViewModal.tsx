'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Star, Sparkles, Check, Heart, ArrowRight } from 'lucide-react';
import { Product } from '../data/mockData';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from './Toast';
import SafeImage from './SafeImage';

export default function QuickViewModal() {
  const [product, setProduct] = useState<Product | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const { cartItems, addToCart, updateQuantity } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedType, setSelectedType] = useState('Eggless');
  const [cakeMessage, setCakeMessage] = useState('');
  const [location, setLocation] = useState('Nawabganj, Unnao');

  useEffect(() => {
    const handleQuickView = (e: Event) => {
      const detail = (e as CustomEvent<Product>).detail;
      const prod = detail as Product;
      setProduct(prod);
      setSelectedSize(prod.variants?.[0] || '');
      setSelectedType(prod.egglessAvailable ? (prod.isEgglessDefault ? 'Eggless' : 'Egg') : 'Eggless');
      setCakeMessage('');
      setIsOpen(true);
    };

    const handleLocChange = () => {
      setLocation(localStorage.getItem('fatafat_location') || 'Nawabganj, Unnao');
    };

    window.addEventListener('fatafat_quickview', handleQuickView);
    window.addEventListener('fatafat_location_changed', handleLocChange);
    handleLocChange();

    return () => {
      window.removeEventListener('fatafat_quickview', handleQuickView);
      window.removeEventListener('fatafat_location_changed', handleLocChange);
    };
  }, []);

  if (!isOpen || !product) return null;

  const isFavorited = isInWishlist(product.id);
  const isWellness = product.category === 'wellness';

  const cartItem = cartItems.find(
    (item) => 
      item.product.id === product.id && 
      (!selectedSize || item.selectedSize === selectedSize) &&
      (!product.egglessAvailable || item.selectedType === selectedType)
  );
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  // Location delivery estimate helper
  const getDeliveryTime = () => {
    if (isWellness) return 'Next-day Discreet';
    switch (location) {
      case 'Nawabganj, Unnao': return '30–45 min';
      case 'Chandigarh University, Uttar Pradesh': return '45–60 min';
      default: return product.deliveryTime || '30–60 min';
    }
  };

  const handleAddToCart = () => {
    addToCart(product, 1, {
      size: selectedSize || undefined,
      type: product.egglessAvailable ? selectedType : undefined,
      message: cakeMessage || undefined
    });
    showToast(`Added ${product.name} to cart.`, 'success');
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product.id);
    showToast(isFavorited ? 'Removed from favorites' : 'Saved to favorites', 'success');
  };

  const handleClose = () => {
    setIsOpen(false);
    setProduct(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className={`relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border text-left flex flex-col md:flex-row animate-scale-in max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible ${
        isWellness 
          ? 'bg-wellness-dark border-wellness-bronze/25 text-wellness-text' 
          : 'bg-[#FDFBF7] border-[#E58B75]/25 text-brand-charcoal'
      }`}>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-full z-20 transition-all ${
            isWellness 
              ? 'bg-wellness-black text-zinc-400 hover:text-white' 
              : 'bg-white border text-zinc-400 hover:text-zinc-800'
          }`}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left Column: Image view */}
        <div className="w-full md:w-1/2 aspect-square relative bg-zinc-55/5 overflow-hidden border-r">
          <SafeImage
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {product.discount > 0 && (
            <span className={`absolute top-4 left-4 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full text-white ${
              isWellness ? 'bg-wellness-bronze text-zinc-950' : 'bg-brand-burgundy'
            }`}>
              {product.discount}% OFF
            </span>
          )}
        </div>

        {/* Right Column: Shopping Details */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div>
              {/* Category, Sourcing & Delivery Time */}
              <div className="flex justify-between items-center text-[8px] font-extrabold uppercase tracking-widest opacity-50 mb-1">
                <span>{product.category} • {product.wellnessBrand || 'FATAFAT'}</span>
                <span className="text-brand-burgundy">⚡ {getDeliveryTime()}</span>
              </div>
              <h2 className="text-lg font-serif font-black leading-snug">{product.name}</h2>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
              <span className="font-extrabold">{product.rating}</span>
              <span className="opacity-45">({product.reviewCount} customer reviews)</span>
            </div>

            {/* Prices */}
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-brand-burgundy">₹{product.price}</span>
              {product.discount > 0 && (
                <span className="text-xs line-through opacity-35 font-medium">MRP ₹{product.originalPrice}</span>
              )}
            </div>

            <p className="text-[11px] opacity-75 leading-relaxed font-medium">
              {product.description}
            </p>

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">Select Variant / Size</span>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants.map((v) => (
                    <button
                      key={v}
                      onClick={() => setSelectedSize(v)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                        selectedSize === v
                          ? isWellness
                            ? 'border-wellness-bronze bg-wellness-bronze/10 text-wellness-bronze-light font-black'
                            : 'border-brand-burgundy bg-brand-blush text-brand-burgundy font-black'
                          : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-650'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Eggless Option (for Cakes/Bakery) */}
            {product.egglessAvailable && (
              <div className="space-y-1.5">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">Dietary Preference</span>
                <div className="flex gap-2">
                  {['Eggless', 'With Egg'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedType(t)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                        selectedType === t
                          ? 'border-green-600 bg-green-50 text-green-700 font-black'
                          : 'border-zinc-200 bg-white text-zinc-650'
                      }`}
                    >
                      {t === 'Eggless' ? '🟢 ' : '🔴 '} {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Cake Message */}
            {product.category === 'cakes' && (
              <div className="space-y-1">
                <label className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">Message on Cake (Optional)</label>
                <input
                  type="text"
                  maxLength={30}
                  placeholder="e.g. Happy Birthday Papa"
                  value={cakeMessage}
                  onChange={(e) => setCakeMessage(e.target.value)}
                  className="w-full p-2 border rounded-xl text-[11px] bg-white focus:outline-none focus:border-brand-burgundy font-medium"
                />
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t flex items-center justify-between gap-4">
            {/* Wishlist Toggle */}
            <button
              onClick={handleWishlistToggle}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
                isWellness 
                  ? 'border-zinc-800 text-wellness-text hover:bg-wellness-card' 
                  : 'border-zinc-200 text-zinc-650 hover:bg-zinc-50'
              }`}
            >
              <Heart className={`h-4.5 w-4.5 ${isFavorited ? 'text-brand-burgundy' : ''}`} fill={isFavorited ? '#6B1D2F' : 'none'} />
            </button>

            {/* Shopping trigger */}
            {product.inStock ? (
              quantityInCart > 0 ? (
                <div className={`flex items-center rounded-xl overflow-hidden border flex-grow justify-between max-w-[150px] font-bold select-none ${
                  isWellness
                    ? 'border-wellness-bronze bg-wellness-bronze text-zinc-950'
                    : 'border-brand-burgundy bg-brand-burgundy text-white'
                }`}>
                  <button
                    onClick={() => updateQuantity(product.id, quantityInCart - 1)}
                    className="px-4 py-2.5 font-black hover:brightness-95 transition-all text-sm"
                  >
                    −
                  </button>
                  <span className={`px-4 py-2.5 text-xs font-mono font-black ${
                    isWellness ? 'bg-wellness-dark text-wellness-text' : 'bg-white text-zinc-900'
                  } flex-grow text-center`}>
                    {quantityInCart}
                  </span>
                  <button
                    onClick={() => updateQuantity(product.id, quantityInCart + 1)}
                    className="px-4 py-2.5 font-black hover:brightness-95 transition-all text-sm"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className={`flex-grow py-3 rounded-xl font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
                    isWellness
                      ? 'bg-wellness-bronze text-zinc-950 hover:bg-wellness-bronze-dark'
                      : 'bg-brand-burgundy text-white hover:bg-brand-burgundy-dark'
                  }`}
                >
                  Add To Basket
                </button>
              )
            ) : (
              <button
                disabled
                className="flex-grow py-3 rounded-xl bg-zinc-100 text-zinc-400 font-bold text-xs uppercase tracking-wider cursor-not-allowed text-center border"
              >
                Currently Sold Out
              </button>
            )}

            {/* View Full Product details link */}
            <Link
              href={isWellness ? `/wellness/product/${product.id}` : `/product/${product.id}`}
              onClick={handleClose}
              className={`text-[9px] font-extrabold uppercase tracking-wider hover:underline shrink-0 flex items-center gap-1 ${
                isWellness ? 'text-wellness-bronze' : 'text-brand-burgundy'
              }`}
            >
              Full Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
