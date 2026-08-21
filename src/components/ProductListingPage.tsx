'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ArrowUpDown, Info, Search, Sparkles } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import Breadcrumbs from './Breadcrumbs';
import { PRODUCTS as fallbackProducts, Product } from '../data/mockData';
import { ProductGridSkeleton } from './LoadingSkeleton';
import { useProducts } from '../context/ProductContext';

interface ProductListingPageProps {
  categoryKey: 'cakes' | 'bakery' | 'chocolates' | 'flowers' | 'gifts' | 'celebrations';
  title: string;
  description: string;
}

export default function ProductListingPage({ categoryKey, title, description }: ProductListingPageProps) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialOccasion = searchParams.get('occasion') || '';

  const { products } = useProducts();
  const PRODUCTS = products.length > 0 ? products : fallbackProducts;

  // Filter States
  const [searchVal, setSearchVal] = useState(initialSearch);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [egglessOnly, setEgglessOnly] = useState<boolean>(false);
  
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Get unique subcategories
  const categoryProducts = PRODUCTS.filter((p) => p.category === categoryKey);
  const subCategories = ['All', ...Array.from(new Set(categoryProducts.map((p) => p.subCategory).filter(Boolean))) as string[]];

  // Sync with search URL parameter changes
  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) {
      setSearchVal(s);
    }
  }, [searchParams]);

  // Handle Filtering
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      let result = [...categoryProducts];

      // 1. Text Search Filter
      if (searchVal.trim()) {
        const query = searchVal.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(query))
        );
      }

      // 2. Occasion Filter (from Home click)
      if (initialOccasion) {
        result = result.filter((p) => p.occasions.includes(initialOccasion));
      }

      // 3. SubCategory Filter
      if (selectedSubCategory !== 'All') {
        result = result.filter((p) => p.subCategory === selectedSubCategory);
      }

      // 4. Price Filter
      result = result.filter((p) => p.price <= maxPrice);

      // 5. Rating Filter
      if (minRating > 0) {
        result = result.filter((p) => p.rating >= minRating);
      }

      // 6. Eggless Filter (for Cakes/Bakery)
      if (egglessOnly) {
        result = result.filter((p) => p.egglessAvailable);
      }

      // 7. Sort Order
      if (sortBy === 'price-low') {
        result.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price-high') {
        result.sort((a, b) => b.price - a.price);
      } else if (sortBy === 'rating') {
        result.sort((a, b) => b.rating - a.rating);
      } else {
        result.sort((a, b) => b.reviewCount - a.reviewCount);
      }

      setFilteredProducts(result);
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [categoryKey, searchVal, selectedSubCategory, maxPrice, minRating, sortBy, egglessOnly, initialOccasion]);

  const hasEgglessOption = categoryKey === 'cakes' || categoryKey === 'bakery';

  return (
    <>
      <Header />

      <main className="flex-grow bg-[#FAF9F6] text-[#1C1A17] font-sans">
        
        {/* Breadcrumb banner strip */}
        <div className="border-b border-zinc-200/20 py-4 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Header Campaign */}
          <div className="mb-10 space-y-3 text-center sm:text-left">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.25em] block">
              FATAFAT COLLECTION
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-zinc-900 leading-tight">
              {title}
            </h1>
            <p className="text-xs text-zinc-550 max-w-xl font-medium leading-relaxed">
              {description}
            </p>
            {initialOccasion && (
              <div className="inline-flex items-center gap-1.5 mt-2 bg-brand-gold/15 text-zinc-800 text-[9px] font-bold px-3 py-1 rounded-full border border-brand-gold/25">
                <Sparkles className="h-3 w-3 text-brand-gold shrink-0 animate-pulse" /> Occasion: {initialOccasion}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            {/* 1. FILTER SIDEBAR (Desktop) */}
            <aside className="hidden lg:block bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Search Inside Category */}
              <div className="space-y-2 text-left">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 block">Search Within</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name..."
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-brand-burgundy focus:bg-white"
                  />
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>

              {/* Subcategories (if exists) */}
              {subCategories.length > 2 && (
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 block">Sub-Category</label>
                  <div className="flex flex-col gap-1.5">
                    {subCategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubCategory(sub)}
                        className={`text-left px-3 py-2 rounded-xl text-xs transition-colors border ${
                          selectedSubCategory === sub
                            ? 'border-brand-burgundy text-brand-burgundy bg-brand-burgundy/5 font-bold'
                            : 'border-transparent text-zinc-650 hover:bg-zinc-550/5'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Filter */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">
                  <span>Max Price</span>
                  <span className="text-zinc-800 font-extrabold">₹{maxPrice}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  className="w-full accent-brand-burgundy h-1 bg-zinc-250 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-zinc-400 font-bold select-none">
                  <span>₹100</span>
                  <span>₹2000</span>
                </div>
              </div>

              {/* Rating Filter */}
              <div className="space-y-2 text-left">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 block">Customer Rating</label>
                <div className="flex flex-col gap-1.5">
                  {[0, 4.5, 4.0, 3.5].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => setMinRating(stars)}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition-colors border ${
                        minRating === stars
                          ? 'border-brand-burgundy text-brand-burgundy bg-brand-burgundy/5 font-bold'
                          : 'border-transparent text-zinc-650 hover:bg-zinc-550/5'
                      }`}
                    >
                      {stars === 0 ? 'All Ratings' : `${stars} ★ & Above`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eggless filter */}
              {hasEgglessOption && (
                <div className="space-y-2 pt-4 border-t border-zinc-200/10 text-left">
                  <div className="flex items-center justify-between">
                    <label htmlFor="egglessToggle" className="text-xs font-bold text-zinc-700 cursor-pointer">
                      Eggless Only 🟢
                    </label>
                    <input
                      type="checkbox"
                      id="egglessToggle"
                      checked={egglessOnly}
                      onChange={(e) => setEgglessOnly(e.target.checked)}
                      className="accent-green-650 h-4.5 w-4.5 rounded border-zinc-350 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </aside>

            {/* 2. PRODUCT GRID CONTAINER */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Toolbar */}
              <div className="bg-white border border-zinc-200/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-extrabold text-brand-burgundy border border-zinc-200 px-4 py-2 rounded-xl bg-white"
                >
                  <SlidersHorizontal className="h-4.5 w-4.5" />
                  Filters
                </button>

                {/* Counter */}
                <span className="text-xs text-zinc-500 font-medium">
                  Showing <strong>{filteredProducts.length}</strong> items
                </span>

                {/* Sorter */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Sort</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs bg-zinc-50 border border-zinc-250 rounded-xl p-2 outline-none font-semibold text-zinc-700"
                  >
                    <option value="popularity">Popularity</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>
              </div>

              {/* Grid content */}
              {loading ? (
                <ProductGridSkeleton count={8} />
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-zinc-200/20 rounded-3xl p-16 text-center space-y-4">
                  <div className="text-zinc-300 flex justify-center">
                    <Info className="h-12 w-12 text-brand-gold" />
                  </div>
                  <h3 className="text-base font-bold font-serif">No products found</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    Try adjusting your price range sliders or clearing internal search filters.
                  </p>
                  <button
                    onClick={() => {
                      setSearchVal('');
                      setSelectedSubCategory('All');
                      setMaxPrice(2000);
                      setMinRating(0);
                      setEgglessOnly(false);
                    }}
                    className="px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-widest"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* MOBILE FILTERS PANEL MODAL */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden flex justify-end">
          <div onClick={() => setShowMobileFilters(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-xs bg-white h-full flex flex-col p-6 shadow-2xl justify-between">
            <div className="space-y-6 overflow-y-auto dark-scroll pr-1 flex-1 text-left">
              <div className="flex justify-between items-center pb-2 border-b">
                <h2 className="text-sm font-bold font-serif">Filters</h2>
                <button onClick={() => setShowMobileFilters(false)} className="text-zinc-400 p-1 hover:text-zinc-600 text-xs font-bold uppercase">Close</button>
              </div>

              {/* Search Inside Category */}
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 block">Search Within</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name..."
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-xs bg-[#FAF9F6]"
                  />
                  <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>

              {/* Subcategories (if exists) */}
              {subCategories.length > 2 && (
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 block">Sub-Category</label>
                  <div className="flex flex-wrap gap-2">
                    {subCategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubCategory(sub)}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-colors border ${
                          selectedSubCategory === sub
                            ? 'border-brand-burgundy text-brand-burgundy bg-brand-burgundy/5 font-bold'
                            : 'border-zinc-200 text-zinc-650 bg-[#FAF9F6]'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Filter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">
                  <span>Max Price</span>
                  <span className="text-[#1C1A17] font-extrabold">₹{maxPrice}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  className="w-full accent-brand-burgundy h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Rating Filter */}
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 block">Customer Rating</label>
                <div className="flex flex-col gap-1.5">
                  {[0, 4.5, 4.0, 3.5].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => setMinRating(stars)}
                      className={`text-left px-3 py-2 rounded-xl text-xs border ${
                        minRating === stars
                          ? 'border-brand-burgundy text-brand-burgundy bg-brand-burgundy/5 font-bold'
                          : 'border-zinc-200 text-zinc-650 bg-[#FAF9F6]'
                      }`}
                    >
                      {stars === 0 ? 'All Ratings' : `${stars} ★ & Above`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eggless filter */}
              {hasEgglessOption && (
                <div className="flex items-center justify-between border-t border-zinc-200/10 pt-4">
                  <span className="text-xs font-bold text-zinc-700">Eggless Only 🟢</span>
                  <input
                    type="checkbox"
                    checked={egglessOnly}
                    onChange={(e) => setEgglessOnly(e.target.checked)}
                    className="accent-green-650 h-4.5 w-4.5 rounded border-zinc-350 cursor-pointer"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setShowMobileFilters(false)}
              className="w-full py-4 rounded-xl bg-brand-burgundy text-white text-xs font-bold uppercase tracking-widest mt-4"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
