'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronRight, Home, ShoppingBag } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Header />
      
      <main className="flex-grow flex flex-col items-center justify-center py-20 px-4 text-center space-y-6">
        <div className="p-4 bg-brand-burgundy/5 text-brand-burgundy rounded-full animate-bounce">
          <HelpCircle className="h-12 w-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-zinc-800">
            Oops! This moment got lost.
          </h1>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            The page you are looking for has been moved, renamed, or is temporarily unavailable. Let&apos;s get you back to the celebrations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow flex items-center justify-center gap-1.5"
          >
            <Home className="h-4 w-4" /> Back to Home
          </Link>
          <Link
            href="/cakes"
            className="px-6 py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-serif font-bold text-xs uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="h-4 w-4 text-brand-gold" /> Shop Cakes
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
