'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Truck, Calendar, Sparkles, Heart, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductCard from '../../../components/ProductCard';
import { PRODUCTS as fallbackProducts, MOCK_REVIEWS, Product } from '../../../data/mockData';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useToast } from '../../../components/Toast';
import { useProducts } from '../../../context/ProductContext';

const ADDONS = [
  { id: 'addon-candles', name: 'Premium Sparkler Candles', price: 99, image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&auto=format&fit=crop&q=80' },
  { id: 'addon-knife', name: 'Wooden Cake Knife & Server', price: 299, image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&auto=format&fit=crop&q=80' },
  { id: 'addon-bouquet', name: 'Roses Bouquet (10 stems)', price: 499, image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&auto=format&fit=crop&q=80' },
  { id: 'addon-choco', name: 'Dark Truffles (Box of 9)', price: 499, image: 'https://images.unsplash.com/photo-1548907040-4d42b52125b0?w=200&auto=format&fit=crop&q=80' }
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
  const [product, setProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'desc' | 'ingredients' | 'storage'>('desc');

  // Customization States
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('Eggless');
  const [cakeMessage, setCakeMessage] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<'ASAP' | 'Scheduled'>('ASAP');
  const [timeSlot, setTimeSlot] = useState<string>('06:00 PM - 08:00 PM');
  
  // Selected Add-ons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  useEffect(() => {
    const found = PRODUCTS.find((p) => p.id === productId);
    if (found) {
      setProduct(found);
      // Pre-select default size variant
      if (found.variants && found.variants.length > 0) {
        setSelectedSize(found.variants[0]);
      }
      if (found.egglessAvailable) {
        setSelectedType(found.isEgglessDefault ? 'Eggless' : 'Egg');
      }
    }
  }, [productId]);

  if (!product) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-brand-burgundy mb-4" />
          <h2 className="text-xl font-bold font-serif">Product Not Found</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            We couldn&apos;t find the product you are looking for. It might be sold out or removed.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider"
          >
            Go Back Home
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
        // Map addon to mock product representation
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
          description: `Add-on decoration item for ${product.name}`,
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

      <main className={`flex-1 py-12 transition-colors duration-300 ${
        isWellness ? 'bg-wellness-black text-wellness-text' : 'bg-[#FAF9F6] text-[#1A1A1A]'
      }`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider opacity-60 mb-6">
            <Link href="/">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={isWellness ? '/wellness' : `/${product.category}`}>{product.category}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{product.name}</span>
          </div>

          {/* Product main section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Column: Image */}
            <div className="lg:col-span-6 space-y-4">
              <div className={`relative aspect-square rounded-3xl overflow-hidden border shadow-sm ${
                isWellness ? 'bg-wellness-dark border-wellness-bronze/10' : 'bg-white border-zinc-100'
              }`}>
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                
                {/* Favorites button */}
                <button
                  onClick={handleWishlistToggle}
                  className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all shadow-md ${
                    isWellness
                      ? isFavorited 
                        ? 'bg-wellness-bronze text-white' 
                        : 'bg-wellness-black/60 text-wellness-text hover:bg-wellness-black/85'
                      : isFavorited
                        ? 'bg-brand-burgundy text-white'
                        : 'bg-white/80 text-zinc-600 hover:bg-white'
                  }`}
                >
                  <Heart className="h-5 w-5" fill={isFavorited ? 'currentColor' : 'none'} />
                </button>

                {/* Stock Tag */}
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/45 backdrop-blur-[1.5px] flex items-center justify-center">
                    <span className="bg-black/90 text-white font-serif font-bold text-sm tracking-wider uppercase px-5 py-2.5 rounded-full border border-white/20">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Customization & Details */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Product Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                    isWellness ? 'bg-wellness-card text-wellness-bronze-light' : 'bg-brand-burgundy/5 text-brand-burgundy'
                  }`}>
                    {product.subCategory || product.category.toUpperCase()}
                  </span>
                  
                  <span className="text-xs font-semibold opacity-85 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-brand-gold" />
                    Delivery: {product.deliveryTime}
                  </span>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-current">
                  {product.name}
                </h1>
                
                {/* Rating */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(product.rating)
                            ? isWellness ? 'text-wellness-bronze fill-wellness-bronze' : 'text-brand-gold fill-brand-gold'
                            : 'text-zinc-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold">{product.rating}</span>
                  <span className="text-xs opacity-60">• {product.reviewCount} Reviews</span>
                </div>
              </div>

              {/* Price Panel */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between ${
                isWellness ? 'bg-wellness-card border-wellness-bronze/10' : 'bg-white border-zinc-100 shadow-sm'
              }`}>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-current">₹{product.price}</span>
                    {product.discount > 0 && (
                      <span className="text-sm line-through opacity-50">₹{product.originalPrice}</span>
                    )}
                  </div>
                  {product.discount > 0 && (
                    <p className={`text-[10px] font-bold mt-0.5 ${isWellness ? 'text-wellness-bronze-light' : 'text-green-700'}`}>
                      🎉 Save {product.discount}% OFF on this item
                    </p>
                  )}
                </div>

                {isCakes && product.egglessAvailable && (
                  <span className="flex items-center gap-1 text-[9px] font-bold bg-green-500/10 text-green-600 px-3 py-1 rounded-full border border-green-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block"></span>
                    EGGLESS AVAILABLE
                  </span>
                )}
              </div>

              {/* Customizable options (if in stock) */}
              {product.inStock && (
                <div className="space-y-5 pt-2">
                  
                  {/* Sizes Selection */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        {isWellness ? 'Pack Size' : 'Select Size (Weight)'}
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {product.variants.map((v) => (
                          <button
                            key={v}
                            onClick={() => setSelectedSize(v)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                              selectedSize === v
                                ? isWellness
                                  ? 'border-wellness-bronze bg-wellness-bronze text-white'
                                  : 'border-brand-burgundy bg-brand-burgundy text-white'
                                : isWellness
                                ? 'border-wellness-bronze/25 bg-wellness-card text-wellness-text'
                                : 'border-zinc-200 bg-white text-zinc-700'
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
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Cake Formulation
                      </label>
                      <div className="flex gap-3">
                        {['Eggless', 'Contain Egg'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              selectedType === type
                                ? type === 'Eggless'
                                  ? 'border-green-600 bg-green-600 text-white'
                                  : 'border-brand-burgundy bg-brand-burgundy text-white'
                                : isWellness
                                ? 'border-wellness-bronze/25 bg-wellness-card text-wellness-text'
                                : 'border-zinc-200 bg-white text-zinc-700'
                            }`}
                          >
                            {type === 'Eggless' ? '🟢 100% Eggless' : '🥚 With Egg'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message on Cake */}
                  {isCakes && (
                    <div className="space-y-2">
                      <label htmlFor="cakeMessageInput" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Message on Cake (Max 25 chars)
                      </label>
                      <input
                        type="text"
                        id="cakeMessageInput"
                        placeholder="e.g. Happy Birthday Dad!"
                        maxLength={25}
                        value={cakeMessage}
                        onChange={(e) => setCakeMessage(e.target.value)}
                        className={`w-full px-4 py-2 border rounded-xl text-xs focus:outline-none ${
                          isWellness
                            ? 'bg-wellness-dark border-wellness-bronze/35 text-wellness-text focus:border-wellness-bronze'
                            : 'bg-white border-zinc-200 text-zinc-800 focus:border-brand-burgundy/40'
                        }`}
                      />
                    </div>
                  )}

                  {/* Delivery Scheduling */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Delivery Schedule
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setDeliveryType('ASAP')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          deliveryType === 'ASAP'
                            ? isWellness
                              ? 'border-wellness-bronze bg-wellness-bronze text-white'
                              : 'border-brand-burgundy bg-brand-burgundy text-white'
                            : isWellness
                            ? 'border-wellness-bronze/25 bg-wellness-card text-wellness-text'
                            : 'border-zinc-200 bg-white text-zinc-700'
                        }`}
                      >
                        <Truck className="h-3.5 w-3.5" /> ASAP (30-60m)
                      </button>
                      
                      <button
                        onClick={() => setDeliveryType('Scheduled')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          deliveryType === 'Scheduled'
                            ? isWellness
                              ? 'border-wellness-bronze bg-wellness-bronze text-white'
                              : 'border-brand-burgundy bg-brand-burgundy text-white'
                            : isWellness
                            ? 'border-wellness-bronze/25 bg-wellness-card text-wellness-text'
                            : 'border-zinc-200 bg-white text-zinc-700'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" /> Schedule Later
                      </button>
                    </div>

                    {deliveryType === 'Scheduled' && (
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className={`w-full p-2.5 border rounded-xl text-xs mt-2 focus:outline-none ${
                          isWellness
                            ? 'bg-wellness-dark border-wellness-bronze/35 text-wellness-text'
                            : 'bg-white border-zinc-200 text-zinc-700'
                        }`}
                      >
                        <option value="10:00 AM - 12:00 PM">Morning (10:00 AM - 12:00 PM)</option>
                        <option value="12:00 PM - 02:00 PM">Afternoon (12:00 PM - 02:00 PM)</option>
                        <option value="02:00 PM - 04:00 PM">Late Afternoon (02:00 PM - 04:00 PM)</option>
                        <option value="06:00 PM - 08:00 PM">Evening (06:00 PM - 08:00 PM)</option>
                        <option value="09:00 PM - 11:59 PM">Midnight Special (09:00 PM - 11:59 PM)</option>
                      </select>
                    )}
                  </div>

                  {/* Add-ons Checklist */}
                  {!isWellness && (
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Frequently Purchased Add-ons
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ADDONS.map((addon) => (
                          <div
                            key={addon.id}
                            onClick={() => handleAddonsToggle(addon.id)}
                            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all ${
                              selectedAddons.includes(addon.id)
                                ? 'border-brand-burgundy bg-brand-burgundy/5'
                                : 'border-zinc-200 bg-white hover:border-brand-burgundy/25'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAddons.includes(addon.id)}
                              onChange={() => {}} // handled by click container
                              className="accent-brand-burgundy h-4 w-4 shrink-0 rounded"
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold truncate text-zinc-800">{addon.name}</p>
                              <p className="text-[10px] text-brand-burgundy font-bold">+₹{addon.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add to Cart Actions */}
                  <div className="flex gap-4 pt-4 border-t border-opacity-5 border-zinc-500">
                    <button
                      onClick={() => handleAddToCart(false)}
                      className={`flex-1 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                        isWellness
                          ? 'border border-wellness-bronze text-wellness-bronze hover:bg-wellness-bronze hover:text-white'
                          : 'border border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy hover:text-white'
                      }`}
                    >
                      Add to Cart
                    </button>
                    
                    <button
                      onClick={() => handleAddToCart(true)}
                      className={`flex-1 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md text-white ${
                        isWellness
                          ? 'bg-wellness-bronze hover:bg-wellness-bronze-dark'
                          : 'bg-brand-burgundy hover:bg-brand-burgundy-dark'
                      }`}
                    >
                      Buy Now
                    </button>
                  </div>

                </div>
              )}

              {/* Out of Stock notice */}
              {!product.inStock && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>This product is currently out of stock. You can check back later.</span>
                </div>
              )}

              {/* Tabs Section */}
              <div className="space-y-4 pt-6 border-t border-opacity-5 border-zinc-500">
                <div className="flex border-b border-opacity-10 border-zinc-500 text-xs font-bold uppercase tracking-wider">
                  <button
                    onClick={() => setActiveTab('desc')}
                    className={`pb-2 pr-4 border-b-2 transition-colors ${
                      activeTab === 'desc'
                        ? isWellness ? 'border-wellness-bronze text-wellness-bronze-light' : 'border-brand-burgundy text-brand-burgundy'
                        : 'border-transparent opacity-60'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('ingredients')}
                    className={`pb-2 px-4 border-b-2 transition-colors ${
                      activeTab === 'ingredients'
                        ? isWellness ? 'border-wellness-bronze text-wellness-bronze-light' : 'border-brand-burgundy text-brand-burgundy'
                        : 'border-transparent opacity-60'
                    }`}
                  >
                    Ingredients
                  </button>
                  <button
                    onClick={() => setActiveTab('storage')}
                    className={`pb-2 px-4 border-b-2 transition-colors ${
                      activeTab === 'storage'
                        ? isWellness ? 'border-wellness-bronze text-wellness-bronze-light' : 'border-brand-burgundy text-brand-burgundy'
                        : 'border-transparent opacity-60'
                    }`}
                  >
                    Instructions
                  </button>
                </div>

                <div className="text-xs leading-relaxed opacity-85">
                  {activeTab === 'desc' && (
                    <div className="space-y-2">
                      <p>{product.description}</p>
                      <p className="font-bold">Discreet plain box packaging guarantees privacy for all sensitive orders.</p>
                    </div>
                  )}
                  {activeTab === 'ingredients' && (
                    <div className="space-y-2">
                      <p className="font-bold">Main Elements:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {product.ingredients.length > 0 ? (
                          product.ingredients.map((ing, i) => <li key={i}>{ing}</li>)
                        ) : (
                          <li>Standard Premium composition</li>
                        )}
                      </ul>
                      {product.allergens.length > 0 && (
                        <p className="text-red-500 font-semibold mt-2">
                          Allergen Warning: Contains {product.allergens.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  {activeTab === 'storage' && (
                    <div className="space-y-2">
                      <p>{product.storageInstructions || 'Store in a cool and dry location. Maintain hygiene guidelines.'}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Reviews section */}
          <section className="mt-16 pt-12 border-t border-opacity-5 border-zinc-500">
            <h3 className="text-lg font-serif font-extrabold text-current mb-6">
              Client Feedback
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MOCK_REVIEWS.map((rev) => (
                <div
                  key={rev.id}
                  className={`p-5 rounded-2xl border ${
                    isWellness ? 'bg-wellness-card border-wellness-bronze/10' : 'bg-white border-zinc-100 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-bold">{rev.user}</span>
                    <span className="opacity-50">{rev.date}</span>
                  </div>
                  <div className="flex mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < rev.rating
                            ? isWellness ? 'text-wellness-bronze fill-wellness-bronze' : 'text-brand-gold fill-brand-gold'
                            : 'text-zinc-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed opacity-85">{rev.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <section className="mt-16 pt-12 border-t border-opacity-5 border-zinc-500">
              <h3 className="text-lg font-serif font-extrabold text-current mb-6">
                You May Also Like
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
