'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Star, Truck, Calendar, Sparkles, Heart, CheckCircle2, 
  ChevronRight, AlertCircle, ShoppingBag, Zap, ShieldCheck, Check
} from 'lucide-react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductCard from '../../../components/ProductCard';
import SafeImage from '../../../components/SafeImage';
import { PRODUCTS as fallbackProducts, MOCK_REVIEWS, Product } from '../../../data/mockData';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useToast } from '../../../components/Toast';
import { useProducts } from '../../../context/ProductContext';

const ADDONS = [
  { id: 'addon-candles', name: 'Premium Sparkler Candles', price: 99, image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&auto=format&fit=crop&q=80' },
  { id: 'addon-knife', name: 'Wooden Cake Knife & Server', price: 299, image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&auto=format&fit=crop&q=80' },
  { id: 'addon-bouquet', name: 'Roses Bouquet (10 stems)', price: 499, image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&auto=format&fit=crop&q=80' },
  { id: 'addon-choco', name: 'Dark Truffles (Box of 9)', price: 499, image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=200&auto=format&fit=crop&q=80' }
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const { products } = useProducts();
  const PRODUCTS = products.length > 0 ? products : fallbackProducts;

  const productId = params.id as string;
  const product = useMemo(() => PRODUCTS.find((p) => p.id === productId) ?? null, [PRODUCTS, productId]);
  const [activeTab, setActiveTab] = useState<'desc' | 'ingredients' | 'storage'>('desc');
  const [activeImage, setActiveImage] = useState<string>('');

  // Customization States
  const [selectedSizeState, setSelectedSizeState] = useState<string>('');
  const [selectedTypeState, setSelectedTypeState] = useState<string>('Eggless');
  const [cakeMessage, setCakeMessage] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<'ASAP' | 'Scheduled'>('ASAP');
  const [timeSlot, setTimeSlot] = useState<string>('06:00 PM - 08:00 PM');
  
  // Selected Add-ons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const selectedSize = product?.variants?.includes(selectedSizeState)
    ? selectedSizeState
    : product?.variants?.[0] ?? '';

  const selectedType = product?.egglessAvailable
    ? (selectedTypeState === 'Eggless' || selectedTypeState === 'Egg'
        ? selectedTypeState
        : product.isEgglessDefault ? 'Eggless' : 'Egg')
    : 'Eggless';

  if (!product) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
          <AlertCircle className="h-12 w-12 text-brand-burgundy mb-4" />
          <h2 className="text-2xl font-bold font-serif text-zinc-900">Product Not Found</h2>
          <p className="text-xs text-zinc-500 mt-2 max-w-sm">
            We couldn&apos;t find the product you are looking for. It might be sold out or removed from our celebration catalog.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 rounded-2xl bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider shadow-md hover:bg-brand-burgundy-dark transition-all"
          >
            Return to Storefront
          </button>
        </div>
        <Footer />
      </>
    );
  }

  const isFavorited = isInWishlist(product.id);
  const isCakes = product.category === 'cakes';
  const hasTypeSelection = product.category === 'cakes' || product.category === 'bakery';

  const handleWishlistToggle = () => {
    toggleWishlist(product.id);
    if (isFavorited) {
      showToast(`Removed ${product.name} from Wishlist.`, 'info');
    } else {
      showToast(`Added ${product.name} to Wishlist!`, 'success');
    }
  };

  const handleAddonsToggle = (addonId: string) => {
    if (selectedAddons.includes(addonId)) {
      setSelectedAddons(selectedAddons.filter((id) => id !== addonId));
    } else {
      setSelectedAddons([...selectedAddons, addonId]);
    }
  };

  const handleAddToCart = (shouldRedirect: boolean = false) => {
    if (!product.inStock) return;

    // Add main product to cart
    addToCart(product, 1, {
      size: selectedSize || undefined,
      type: hasTypeSelection ? selectedType : undefined,
      message: isCakes ? cakeMessage : undefined
    });

    // Add selected addons to cart as separate line items
    selectedAddons.forEach((addonId) => {
      const addonData = ADDONS.find((a) => a.id === addonId);
      if (addonData) {
        const addonProduct: Product = {
          id: addonData.id,
          name: addonData.name,
          category: addonId === 'addon-bouquet' ? 'flowers' : addonId === 'addon-choco' ? 'chocolates' : 'celebrations',
          price: addonData.price,
          originalPrice: addonData.price,
          discount: 0,
          rating: 5,
          reviewCount: 1,
          image: addonData.image,
          deliveryTime: 'Same delivery slot',
          inStock: true,
          description: `Add-on celebration item for ${product.name}`,
          ingredients: [],
          allergens: [],
          storageInstructions: '',
          occasions: []
        };
        addToCart(addonProduct, 1);
      }
    });

    showToast(`Added ${product.name} to cart!`, 'success');
    
    if (shouldRedirect) {
      router.push('/checkout');
    }
  };

  // Get related products
  const relatedProducts = PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  const isWellness = product.category === 'wellness';

  return (
    <>
      <Header />

      <main className={`flex-1 py-8 sm:py-12 transition-colors duration-300 ${
        isWellness ? 'bg-wellness-black text-wellness-text' : 'bg-[#FAF9F6] text-[#1A1A1A]'
      }`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
            <Link href="/" className="hover:text-brand-burgundy transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
            <Link 
              href={isWellness ? '/wellness' : `/${product.category}`} 
              className="capitalize hover:text-brand-burgundy transition-colors"
            >
              {product.category}
            </Link>
            <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
            <span className="text-zinc-800 font-semibold truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
          </nav>

          {/* Product Hero: Two Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
            
            {/* Left Column: Product Imagery */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Main Image Container */}
              <div className={`relative aspect-square w-full rounded-3xl overflow-hidden border shadow-sm group ${
                isWellness ? 'bg-wellness-dark border-wellness-bronze/10' : 'bg-white border-zinc-200/60'
              }`}>
                <SafeImage
                  src={activeImage || product.image}
                  alt={product.name}
                  category={product.category}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Wishlist Button */}
                <button
                  onClick={handleWishlistToggle}
                  aria-label={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
                  className="absolute top-4 right-4 p-3 rounded-full bg-white/90 backdrop-blur-md shadow-md hover:bg-white text-zinc-700 transition-all hover:scale-110 active:scale-95 z-10"
                >
                  <Heart 
                    className={`h-5 w-5 transition-colors ${isFavorited ? 'text-brand-burgundy fill-brand-burgundy' : 'text-zinc-600'}`} 
                  />
                </button>

                {/* Discount Badge */}
                {product.discount > 0 && (
                  <div className="absolute top-4 left-4 bg-brand-burgundy text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md z-10">
                    {product.discount}% OFF
                  </div>
                )}

                {/* Out of Stock Overlay */}
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <span className="bg-white text-zinc-900 font-serif font-black text-xs tracking-widest uppercase px-6 py-3 rounded-2xl shadow-xl">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white border border-zinc-200/60 rounded-2xl text-center space-y-1 shadow-sm">
                  <Zap className="h-4 w-4 text-brand-gold mx-auto" />
                  <p className="font-bold text-[11px] text-zinc-800">Fast Express</p>
                  <p className="text-[10px] text-zinc-400">30–60 mins slot</p>
                </div>
                <div className="p-3 bg-white border border-zinc-200/60 rounded-2xl text-center space-y-1 shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-green-600 mx-auto" />
                  <p className="font-bold text-[11px] text-zinc-800">Fresh Guaranteed</p>
                  <p className="text-[10px] text-zinc-400">100% Quality checked</p>
                </div>
                <div className="p-3 bg-white border border-zinc-200/60 rounded-2xl text-center space-y-1 shadow-sm">
                  <Sparkles className="h-4 w-4 text-brand-burgundy mx-auto" />
                  <p className="font-bold text-[11px] text-zinc-800">Gift Packaging</p>
                  <p className="text-[10px] text-zinc-400">Celebration ready</p>
                </div>
              </div>

            </div>

            {/* Right Column: Information & Options */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Category & Delivery Pill */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-brand-burgundy/10 text-brand-burgundy font-bold text-[10px] uppercase tracking-widest">
                  {product.subCategory || product.category}
                </span>
                <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1.5 bg-white border border-zinc-200/70 px-3 py-1 rounded-full shadow-sm">
                  <Truck className="h-3.5 w-3.5 text-brand-gold" />
                  <span>Delivery: <strong>{product.deliveryTime || '30–60 mins'}</strong></span>
                </span>
              </div>

              {/* Product Heading */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-zinc-900 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Star Rating & Review Anchor */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-xl">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-xs text-amber-900">{product.rating}</span>
                </div>
                <a href="#reviews-section" className="text-xs text-zinc-500 hover:text-brand-burgundy font-medium underline underline-offset-4">
                  {product.reviewCount} customer reviews
                </a>
                <span className="text-zinc-300">•</span>
                <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> In Stock & Fresh
                </span>
              </div>

              {/* Short Description */}
              {product.description && (
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Price Panel */}
              <div className="p-5 bg-white border border-zinc-200/70 rounded-3xl shadow-sm space-y-1.5">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-serif font-black text-zinc-900">
                    ₹{product.price}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-lg text-zinc-400 line-through font-medium">
                      ₹{product.originalPrice}
                    </span>
                  )}
                  {product.discount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                      Save {product.discount}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 font-medium">
                  Inclusive of all taxes. Free express shipping on orders above ₹799.
                </p>
              </div>

              {/* Customization Options */}
              {product.inStock && (
                <div className="space-y-5 pt-1">
                  
                  {/* Size / Weight Selector */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        {isWellness ? 'Pack Size' : 'Select Weight / Size'}
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {product.variants.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setSelectedSizeState(v)}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                              selectedSize === v
                                ? 'border-brand-burgundy bg-brand-burgundy text-white shadow-md shadow-brand-burgundy/15 ring-2 ring-brand-burgundy/20'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Eggless vs Egg option */}
                  {hasTypeSelection && product.egglessAvailable && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Formulation Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Eggless', 'Contain Egg'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setSelectedTypeState(type)}
                            className={`py-3 px-4 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                              selectedType === type
                                ? type === 'Eggless'
                                  ? 'border-green-600 bg-green-600 text-white shadow-md shadow-green-600/15'
                                  : 'border-brand-burgundy bg-brand-burgundy text-white shadow-md shadow-brand-burgundy/15'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            {type === 'Eggless' ? '🟢 100% Eggless' : '🥚 With Egg'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cake Message Input */}
                  {isCakes && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label htmlFor="cakeMessageInput" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Message on Cake
                        </label>
                        <span className="text-[10px] text-zinc-400 font-mono">{cakeMessage.length}/25</span>
                      </div>
                      <input
                        type="text"
                        id="cakeMessageInput"
                        placeholder="e.g. Happy Birthday Rohit!"
                        maxLength={25}
                        value={cakeMessage}
                        onChange={(e) => setCakeMessage(e.target.value)}
                        className="w-full px-4 py-3 border border-zinc-200 rounded-2xl text-xs bg-white text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-brand-burgundy focus:ring-2 focus:ring-brand-burgundy/10 transition-all shadow-sm"
                      />
                    </div>
                  )}

                  {/* Delivery Schedule Segmented Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Delivery Schedule
                    </label>
                    <div className="p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/60 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('ASAP')}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          deliveryType === 'ASAP'
                            ? 'bg-brand-burgundy text-white shadow-sm'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <Truck className="h-3.5 w-3.5" /> ASAP (30–60m)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType('Scheduled')}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          deliveryType === 'Scheduled'
                            ? 'bg-brand-burgundy text-white shadow-sm'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" /> Schedule Later
                      </button>
                    </div>

                    {deliveryType === 'Scheduled' && (
                      <div className="pt-1">
                        <select
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          className="w-full p-3 border border-zinc-200 rounded-2xl text-xs bg-white text-zinc-800 focus:outline-none focus:border-brand-burgundy shadow-sm"
                        >
                          <option value="10:00 AM - 12:00 PM">Morning Slot (10:00 AM - 12:00 PM)</option>
                          <option value="12:00 PM - 02:00 PM">Afternoon Slot (12:00 PM - 02:00 PM)</option>
                          <option value="02:00 PM - 04:00 PM">Late Afternoon (02:00 PM - 04:00 PM)</option>
                          <option value="06:00 PM - 08:00 PM">Evening Slot (06:00 PM - 08:00 PM)</option>
                          <option value="09:00 PM - 11:59 PM">Midnight Special (09:00 PM - 11:59 PM)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Frequently Purchased Add-ons */}
                  {!isWellness && (
                    <div className="space-y-2.5 pt-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Frequently Purchased Add-ons
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ADDONS.map((addon) => {
                          const isSelected = selectedAddons.includes(addon.id);
                          return (
                            <div
                              key={addon.id}
                              onClick={() => handleAddonsToggle(addon.id)}
                              className={`p-3 rounded-2xl border cursor-pointer select-none transition-all flex items-center gap-3 ${
                                isSelected
                                  ? 'border-brand-burgundy bg-brand-burgundy/5 ring-1 ring-brand-burgundy shadow-sm'
                                  : 'border-zinc-200 bg-white hover:border-zinc-300'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-brand-burgundy border-brand-burgundy text-white' : 'border-zinc-300 bg-zinc-50'
                              }`}>
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-800 truncate">{addon.name}</p>
                                <p className="text-[11px] text-brand-burgundy font-bold mt-0.5">+₹{addon.price}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Purchase CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(false)}
                      className="flex-1 h-12 py-3 px-6 rounded-2xl border-2 border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/5 font-serif font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <ShoppingBag className="h-4 w-4" /> Add to Cart
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(true)}
                      className="flex-1 h-12 py-3 px-6 rounded-2xl bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-burgundy/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Zap className="h-4 w-4 text-brand-gold" /> Buy Now
                    </button>
                  </div>

                </div>
              )}

              {/* Out of Stock notice */}
              {!product.inStock && (
                <div className="p-5 rounded-3xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3 shadow-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Currently Sold Out</p>
                    <p className="text-[11px] text-red-600 mt-0.5">This delicacy is being freshly prepared for our next restock batch.</p>
                  </div>
                </div>
              )}

              {/* Product Information Tabs */}
              <div className="pt-6 border-t border-zinc-200/70 space-y-4">
                <div className="flex border-b border-zinc-200 text-xs font-bold uppercase tracking-wider gap-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab('desc')}
                    className={`pb-3 border-b-2 transition-all ${
                      activeTab === 'desc'
                        ? 'border-brand-burgundy text-brand-burgundy font-black'
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ingredients')}
                    className={`pb-3 border-b-2 transition-all ${
                      activeTab === 'ingredients'
                        ? 'border-brand-burgundy text-brand-burgundy font-black'
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    Ingredients
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('storage')}
                    className={`pb-3 border-b-2 transition-all ${
                      activeTab === 'storage'
                        ? 'border-brand-burgundy text-brand-burgundy font-black'
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    Instructions
                  </button>
                </div>

                <div className="text-xs text-zinc-600 leading-relaxed bg-white p-5 rounded-2xl border border-zinc-200/50 shadow-sm">
                  {activeTab === 'desc' && (
                    <div className="space-y-3">
                      <p className="leading-relaxed">{product.description}</p>
                      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-2 text-zinc-700 font-medium">
                        <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                        <span>Discreet, tamper-proof packaging guarantees hygiene and privacy for all deliveries.</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ingredients' && (
                    <div className="space-y-3">
                      <p className="font-bold text-zinc-900 uppercase tracking-wider text-[10px]">Key Ingredients & Elements:</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-700">
                        {product.ingredients && product.ingredients.length > 0 ? (
                          product.ingredients.map((ing, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-burgundy shrink-0"></span>
                              <span>{ing}</span>
                            </li>
                          ))
                        ) : (
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-burgundy shrink-0"></span>
                            <span>100% Premium handcrafted artisan ingredients</span>
                          </li>
                        )}
                      </ul>

                      {product.allergens && product.allergens.length > 0 && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-900 text-xs font-medium mt-2">
                          ⚠️ <strong>Allergen Notice:</strong> Contains {product.allergens.join(', ')}.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'storage' && (
                    <div className="space-y-2">
                      <p className="font-bold text-zinc-900 uppercase tracking-wider text-[10px]">Storage & Care:</p>
                      <p className="leading-relaxed">
                        {product.storageInstructions || 'Refrigerate immediately upon receipt between 2°C to 5°C. For maximum freshness and texture, consume within 24 to 48 hours of delivery.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Client Reviews Section */}
          <section id="reviews-section" className="pt-12 border-t border-zinc-200/70 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-burgundy">Verified Feedback</span>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 mt-1">Customer Reviews & Ratings</h2>
              </div>
              <div className="flex items-center gap-3 bg-white p-3 px-5 rounded-2xl border border-zinc-200/70 shadow-sm">
                <div className="text-2xl font-serif font-black text-zinc-900">{product.rating}</div>
                <div>
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">Based on {product.reviewCount} reviews</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {MOCK_REVIEWS.map((rev) => (
                <div
                  key={rev.id}
                  className="p-6 rounded-3xl bg-white border border-zinc-200/60 shadow-sm space-y-3 hover:border-zinc-300 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-burgundy/10 text-brand-burgundy font-serif font-black flex items-center justify-center text-xs">
                        {rev.user.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                          {rev.user}
                          <span className="inline-flex items-center text-[9px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">
                            ✓ Verified Buyer
                          </span>
                        </p>
                        <p className="text-[10px] text-zinc-400">{rev.date}</p>
                      </div>
                    </div>
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-zinc-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed pt-1">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* You May Also Like Section */}
          {relatedProducts.length > 0 && (
            <section className="pt-12 border-t border-zinc-200/70 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-burgundy">Curated Recommendations</span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 mt-1">You May Also Like</h2>
                </div>
                <Link
                  href={`/${product.category}`}
                  className="text-xs font-bold text-brand-burgundy hover:underline uppercase tracking-wider inline-flex items-center gap-1"
                >
                  View All in {product.category} &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}
