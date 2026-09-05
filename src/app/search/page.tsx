'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Search, Info } from 'lucide-react';
import { PRODUCTS as fallbackProducts, Product } from '../../data/mockData';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';
import { useProducts } from '../../context/ProductContext';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { products } = useProducts();
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
  
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(() => query);
  const lowerQ = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!lowerQ) return [] as Product[];

    return PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQ) ||
        p.category.toLowerCase().includes(lowerQ) ||
        p.description.toLowerCase().includes(lowerQ) ||
        p.occasions.some((o) => o.toLowerCase().includes(lowerQ))
    );
  }, [PRODUCTS, lowerQ]);
  const loading = false;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      
      <Breadcrumbs />

      <div className="mb-8 space-y-4 text-center sm:text-left">
        <h1 className="text-3xl font-serif font-extrabold text-[#1A1A1A]">
          Search Catalog
        </h1>
        <p className="text-xs text-zinc-500">
          Find cakes, pastries, flowers, gifts, and chocolates instantly.
        </p>

        {/* Big Search Input */}
        <form onSubmit={handleSearchSubmit} className="max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search e.g. Chocolate truffle, Birthday, Roses..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-brand-burgundy/40"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-4 py-1.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : results.length === 0 ? (
        <div className="bg-white border rounded-3xl p-16 text-center space-y-3">
          <div className="text-zinc-300 flex justify-center">
            <Info className="h-12 w-12" />
          </div>
          <h3 className="text-base font-bold font-serif">
            {searchParams.get('q') ? 'No results matched' : 'Start searching'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchParams.get('q')
              ? 'Try checking spelling, searching for simpler words, or browsing main categories.'
              : 'Type keywords above to find relevant celebration products.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-semibold">
            Found <strong>{results.length}</strong> matching products
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-8">
        <Suspense fallback={<div className="text-center py-20 text-xs">Loading Search Context...</div>}>
          <SearchPageContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
