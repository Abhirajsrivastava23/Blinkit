'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, ArrowRight, ShieldCheck, Mail, ArrowUpRight, Award, Compass, 
  MessageSquare, Flame, Heart, ShoppingBag, Star, Clock, ChevronLeft, ChevronRight, 
  Smile, Gift, ShoppingCart, RefreshCw 
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { PRODUCTS as fallbackProducts, COMBOS, CATEGORIES, OCCASIONS, Product } from '../data/mockData';
import { useToast } from '../components/Toast';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import SafeImage from '../components/SafeImage';

export default function HomePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { products, loading: productsLoading } = useProducts();
  const { cartItems, subtotal } = useCart();
  const { wellnessPublished, user } = useAuth();
  const PRODUCTS: Product[] = useMemo(() => {
    const list: Product[] = products.length > 0 ? [...products] : [...fallbackProducts];
    const existingIds = new Set(list.map((p) => p.id.toLowerCase()));
    for (const fb of fallbackProducts) {
      if (!existingIds.has(fb.id.toLowerCase())) {
        list.push(fb);
      }
    }
    return list;
  }, [products]);

  // 1. Carousel Hero Banner State
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  
  // Hero Slide Data
  const HERO_SLIDES = [
    {
      title: "MAKE THEIR DAY SPECIAL 🎂",
      subtitle: "Cakes, flowers & gifts delivered Fatafat.",
      cta: "SHOP BIRTHDAYS",
      link: "/cakes",
      image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&auto=format&fit=crop&q=80"
    },
    {
      title: "FRESH FLOWERS, FAST DELIVERY 🌹",
      subtitle: "Designer hand-tied bouquets arranged by florist masters.",
      cta: "SHOP FLOWERS",
      link: "/flowers",
      image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=1200&auto=format&fit=crop&q=80"
    },
    {
      title: "SOMETHING SWEET? 🥐",
      subtitle: "Fresh croissants, cheesecakes, and pastries from the oven.",
      cta: "SHOP SWEETS",
      link: "/bakery",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80"
    }
  ];

  // Auto-play hero carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [HERO_SLIDES.length]);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Subscribed! Welcome to FATAFAT Commerce.', 'success');
  };

  // 2. Filter Database Products
  const trendingProducts = PRODUCTS.filter(p => p.category !== 'wellness').slice(0, 8);
  const birthdayCakes = PRODUCTS.filter(p => p.category === 'Birthday Cakes' && p.inStock);
  const chocolateCakes = PRODUCTS.filter(p => p.category === 'Chocolate Cakes' && p.inStock);
  const beerThemeCakes = PRODUCTS.filter(p => p.category === 'Beer Theme Cakes' && p.inStock);
  const desserts = PRODUCTS.filter(p => p.category === 'Desserts' && p.inStock);
  const pastries = PRODUCTS.filter(p => p.category === 'Pastries' && p.inStock);
  const deals = PRODUCTS.filter(p => p.category !== 'wellness' && p.discount > 0 && p.inStock).slice(0, 8);
  const bestsellers = PRODUCTS.filter(p => p.category !== 'wellness' && p.inStock).slice(0, 8);
  const newArrivals = PRODUCTS.filter(p => p.category !== 'wellness' && p.inStock).slice(8, 16);

  // Cart properties
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-brand-charcoal font-sans select-none selection:bg-brand-burgundy/10">
      
      {/* HEADER SECTION */}
      <Header />

      <main className="flex-grow pb-16">
        
        {/* 1. COMPACT HERO CAROUSEL BANNER (300-420px height) */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="relative h-[280px] sm:h-[350px] md:h-[400px] w-full rounded-[24px] sm:rounded-[32px] overflow-hidden bg-brand-blush shadow-sm border border-zinc-200/10">
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 flex items-center justify-start ${
                  currentHeroSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <SafeImage
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none filter brightness-90"
                />
                
                {/* Visual dark overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />

                <div className="relative z-10 p-6 sm:p-12 md:p-16 max-w-lg text-white space-y-4 text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-burgundy text-brand-gold text-[8px] font-black uppercase tracking-widest shadow">
                    ⚡ FAST DELIVERY
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-serif font-black leading-tight tracking-tight">
                    {slide.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-200 font-medium">
                    {slide.subtitle}
                  </p>
                  <div className="pt-2">
                    <Link
                      href={slide.link}
                      className="inline-flex items-center gap-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold text-[10px] uppercase tracking-wider px-6 py-3 rounded-full shadow-md transition-all hover:scale-103"
                    >
                      <span>{slide.cta}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Slide dots */}
            <div className="absolute bottom-4 right-6 z-20 flex gap-2">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentHeroSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentHeroSlide === idx ? 'w-6 bg-brand-burgundy' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 2. HORIZONTALLY SCROLLABLE CATEGORY ICON STRIP */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x select-none">
            {CATEGORIES.filter(cat => cat.id !== 'wellness' || wellnessPublished).map((cat) => {
              const label = cat.id === 'wellness' ? 'Wellness 18+' : cat.name.split(' & ')[0];
              const targetLink = cat.id === 'wellness' ? '/wellness' : `/${cat.id}`;
              return (
                <Link 
                  key={cat.id} 
                  href={targetLink}
                  className="flex flex-col items-center gap-2 snap-center shrink-0 group text-center"
                >
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border border-zinc-200/40 shadow-sm transition-transform duration-300 group-hover:scale-105 bg-white p-1">
                    <SafeImage
                      src={cat.image}
                      alt={cat.name}
                      category={cat.id}
                      className="h-full w-full object-cover rounded-full"
                    />
                  </div>
                  <span className="text-[10px] font-black text-zinc-700 uppercase tracking-wider group-hover:text-brand-burgundy transition-colors">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 3. SHOP BY OCCASION */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-baseline mb-4 text-left">
            <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">Shop By Occasion</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Perfect templates</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
            {OCCASIONS.map((occ) => (
              <Link
                key={occ.id}
                href={`/search?q=${occ.name}`}
                className="relative h-28 w-44 rounded-2xl overflow-hidden snap-center shrink-0 border border-zinc-200/10 shadow-sm group"
              >
                <SafeImage
                  src={occ.image}
                  alt={occ.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white text-left space-y-0.5 z-10">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-brand-gold">Occasion</span>
                  <h4 className="font-serif font-bold text-xs">{occ.name}</h4>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. TRENDING ON FATAFAT */}
        {trendingProducts.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-baseline mb-4 text-left">
              <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">Trending On FATAFAT</h2>
              <span className="text-[9px] bg-brand-burgundy/15 text-brand-burgundy font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                ⚡ TOP PICKS
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* 5. SHOP BY CATEGORY (SHOP WHAT YOU LOVE 4x2 grid) */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 border-y border-zinc-200/20 bg-brand-blush/40 my-6 rounded-[24px]">
          <div className="text-center space-y-1.5 mb-8">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.25em] block">
              FATAFAT CATALOG
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-brand-charcoal">Shop What You Love</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.filter(cat => cat.id !== 'wellness' || wellnessPublished).slice(0, 8).map((cat) => {
              const label = cat.name.split(' & ')[0];
              const targetLink = cat.id === 'wellness' ? '/wellness' : `/${cat.id}`;
              return (
                <Link
                  key={cat.id}
                  href={targetLink}
                  className="relative h-32 rounded-2xl overflow-hidden shadow-sm border border-zinc-200/10 group bg-white"
                >
                  <SafeImage
                    src={cat.image}
                    alt={cat.name}
                    category={cat.id}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-103 filter brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white text-left z-10">
                    <h4 className="font-serif font-extrabold text-sm sm:text-base">{label}</h4>
                    <span className="text-[8px] font-black uppercase tracking-wider text-brand-gold flex items-center gap-1.5 mt-1">
                      Shop category <ArrowRight className="h-2 w-2" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 6. BIRTHDAY CAKES SECTION */}
        {birthdayCakes.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-baseline mb-4 text-left">
              <div>
                <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">Birthday Cakes For Every Celebration 🎂</h2>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Handcrafted with joy & delivered fast</p>
              </div>
              <Link href="/birthday-cakes" className="text-[9px] font-black uppercase tracking-wider text-brand-burgundy hover:underline">
                View All ({birthdayCakes.length}) →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {birthdayCakes.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* 7. CHOCOLATE CAKES SECTION */}
        {chocolateCakes.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-baseline mb-4 text-left">
              <div>
                <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">Decadent Chocolate Cakes 🍫</h2>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Rich truffles, ganache & Belgian chocolate</p>
              </div>
              <Link href="/chocolate-cakes" className="text-[9px] font-black uppercase tracking-wider text-brand-burgundy hover:underline">
                View All ({chocolateCakes.length}) →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {chocolateCakes.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* 8. DESSERTS & PASTRIES SPLIT SECTION */}
        {(desserts.length > 0 || pastries.length > 0) && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Desserts Column */}
              {desserts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline text-left">
                    <div>
                      <h3 className="text-base font-serif font-black text-brand-charcoal">Gourmet Desserts & Jar Cakes 🍮</h3>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Cheesecakes, mousse & kunafa tubs</p>
                    </div>
                    <Link href="/desserts" className="text-[9px] font-black uppercase tracking-wider text-brand-burgundy hover:underline">
                      More desserts ({desserts.length}) →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {desserts.slice(0, 4).map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Pastries Column */}
              {pastries.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline text-left">
                    <div>
                      <h3 className="text-base font-serif font-black text-brand-charcoal">Artisanal Pastries & Boxes 🧁</h3>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Individual slices & celebration packs</p>
                    </div>
                    <Link href="/pastries" className="text-[9px] font-black uppercase tracking-wider text-brand-burgundy hover:underline">
                      More pastries ({pastries.length}) →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {pastries.slice(0, 4).map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 9. BEER THEME CAKES SECTION */}
        {beerThemeCakes.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-baseline mb-4 text-left">
              <div>
                <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">Beer & Party Theme Cakes 🍺</h2>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Bachelor parties, mugs & milestone celebrations</p>
              </div>
              <Link href="/beer-theme-cakes" className="text-[9px] font-black uppercase tracking-wider text-brand-burgundy hover:underline">
                View All ({beerThemeCakes.length}) →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {beerThemeCakes.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* 10. ACTIVE OFFERS (DEALS) */}
        {deals.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-baseline mb-4 text-left">
              <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">FATAFAT Deals</h2>
              <span className="text-[8px] font-extrabold tracking-widest uppercase bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                🏷️ Max discounts
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {deals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* 11. BESTSELLERS (MOST LOVED) */}
        {bestsellers.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-baseline mb-4 text-left">
              <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">Most Loved</h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Top Rated</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {bestsellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* 12. NEW ARRIVALS (JUST LANDED) */}
        {newArrivals.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-baseline mb-4 text-left">
              <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">Just Landed</h2>
              <span className="text-[8px] font-extrabold tracking-widest uppercase bg-brand-burgundy/10 text-brand-burgundy px-3 py-1 rounded-full">
                ✨ Fresh arrivals
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* 13. CELEBRATION COMBOS */}
        {COMBOS.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-baseline mb-4 text-left">
              <h2 className="text-lg sm:text-xl font-serif font-black text-brand-charcoal">Complete The Celebration</h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Curated combinations</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {COMBOS.slice(0, 3).map((combo) => (
                <div 
                  key={combo.id} 
                  className="bg-white border rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 border bg-zinc-50">
                      <SafeImage src={combo.image} alt={combo.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="text-left min-w-0 space-y-1">
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-brand-burgundy block">COMBO SAVER</span>
                      <h4 className="font-serif font-bold text-xs text-zinc-900 truncate">{combo.name}</h4>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{combo.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-extrabold text-zinc-900">₹{combo.price}</span>
                      <span className="text-[10px] line-through opacity-35">₹{combo.originalPrice}</span>
                    </div>
                    <button
                      onClick={() => {
                        showToast(`Added ${combo.name} to cart.`, 'success');
                      }}
                      className="px-4 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                    >
                      Add Combo Basket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 14. PERSONALISATION BANNER */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-brand-burgundy text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border border-brand-burgundy/10 select-none">
            <div className="absolute inset-0 bg-[radial-gradient(#DFBA5E_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-15" />
            <div className="text-center md:text-left space-y-2 relative z-10">
              <span className="text-[9px] text-brand-gold font-extrabold uppercase tracking-[0.25em] block">MAKE IT PERSONAL 💌</span>
              <h3 className="text-xl sm:text-2xl font-serif font-black">Photo Cakes & Custom Gifting Plaque Messages</h3>
              <p className="text-xs text-zinc-300 font-medium max-w-md leading-relaxed">
                Add photo prints, custom script lettering and handmade premium visual templates to any surprise package.
              </p>
            </div>
            <Link
              href="/personalisation"
              className="px-6 py-3 bg-brand-gold text-zinc-950 font-serif font-bold text-xs uppercase tracking-wider rounded-full shadow hover:bg-brand-gold-light transition-all shrink-0 relative z-10"
            >
              EXPLORE PERSONALISATION
            </Link>
          </div>
        </section>

        {/* 15. COMPACT TRUST STRIP */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 border-t border-zinc-200/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2 p-3">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-full w-fit">
                <Clock className="h-5 w-5" />
              </div>
              <h5 className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-800">⚡ Fast Delivery</h5>
              <p className="text-[9px] text-zinc-400 font-medium">Delivered to sector hubs in 30-60 mins</p>
            </div>
            
            <div className="flex flex-col items-center gap-2 p-3">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-full w-fit">
                <Smile className="h-5 w-5" />
              </div>
              <h5 className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-800">🎂 Fresh Products</h5>
              <p className="text-[9px] text-zinc-400 font-medium">Bakehouse fresh and organic ingredients</p>
            </div>

            <div className="flex flex-col items-center gap-2 p-3">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-full w-fit">
                <Gift className="h-5 w-5" />
              </div>
              <h5 className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-800">🎁 Beautiful Packaging</h5>
              <p className="text-[9px] text-zinc-400 font-medium">Delicate ribbons & envelopes</p>
            </div>

            <div className="flex flex-col items-center gap-2 p-3">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-full w-fit">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h5 className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-800">🔒 Secure Checkout</h5>
              <p className="text-[9px] text-zinc-400 font-medium">Encrypted payment & OTP login security</p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER SECTION */}
      <Footer />

      {/* 16. STICKY MOBILE CART BANNER */}
      {cartCount > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-30 px-4 md:hidden animate-slide-up">
          <div className="bg-brand-burgundy text-white p-3 rounded-2xl flex items-center justify-between shadow-xl border border-white/10">
            <div className="flex items-center gap-2 text-left">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-black">{cartCount} {cartCount === 1 ? 'item' : 'items'} inside basket</p>
                <p className="text-[9px] text-zinc-300 font-mono">₹{subtotal} plus delivery fees</p>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/cart')}
              className="bg-brand-gold text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow hover:bg-brand-gold-light transition-all flex items-center gap-1"
            >
              <span>View Basket</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
