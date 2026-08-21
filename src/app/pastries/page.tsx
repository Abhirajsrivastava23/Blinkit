'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import Breadcrumbs from '../../components/Breadcrumbs';
import { PRODUCTS, Product } from '../../data/mockData';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';

export default function PastriesPage() {
  const [pastries, setPastries] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Filter out pastries from bakery category
    const items = PRODUCTS.filter(
      (p) => p.category === 'bakery' && p.subCategory === 'Pastries'
    );
    setPastries(items);
    
    const timer = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <Breadcrumbs />

          <div className="mb-8 space-y-2 text-center sm:text-left">
            <h1 className="text-3xl font-serif font-extrabold text-[#1A1A1A]">
              SMALL BITES. BIG JOY.
            </h1>
            <p className="text-xs text-zinc-500 max-w-xl">
              Artisanal single-serve dessert pastries. From classic Red Velvet slices to traditional New York Cheesecakes.
            </p>
          </div>

          {loading ? (
            <ProductGridSkeleton count={4} />
          ) : pastries.length === 0 ? (
            <div className="bg-white border rounded-3xl p-16 text-center text-xs text-zinc-400">
              No pastries found. Check back soon for fresh batches.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {pastries.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
