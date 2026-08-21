'use client';

import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useToast } from '../../components/Toast';
import { Tag, Sparkles, Copy, Percent } from 'lucide-react';

export default function OffersPage() {
  const { showToast } = useToast();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Coupon code ${code} copied to clipboard!`, 'success');
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <Breadcrumbs />

          <div className="mb-8 space-y-2 text-center sm:text-left">
            <h1 className="text-3xl font-serif font-extrabold text-[#1A1A1A]">
              Exclusive Celebration Deals
            </h1>
            <p className="text-xs text-zinc-500 max-w-xl">
              Indulge in sweetness and gifting with our seasonal promo coupon codes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Offer 1 */}
            <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start hover:border-brand-burgundy/10 transition-colors">
              <div className="p-4 bg-brand-burgundy/5 text-brand-burgundy rounded-2xl shrink-0">
                <Percent className="h-8 w-8" />
              </div>
              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <h3 className="text-base font-serif font-extrabold text-zinc-800">Flat 10% Off Catalog Wide</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Enjoy a flat 10% discount on all cakes, bakery selections, flowers, and hampers. No minimum checkout required.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-brand-cream-dark px-3 py-1.5 rounded-lg font-bold text-xs border border-zinc-200 uppercase text-zinc-800">
                    FATAFAT10
                  </span>
                  <button
                    onClick={() => handleCopyCode('FATAFAT10')}
                    className="p-2 border rounded-lg hover:bg-zinc-50 text-zinc-600 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Code
                  </button>
                </div>
              </div>
            </div>

            {/* Offer 2 */}
            <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start hover:border-brand-gold/20 transition-colors">
              <div className="p-4 bg-brand-gold/10 text-brand-gold-dark rounded-2xl shrink-0">
                <Tag className="h-8 w-8" />
              </div>
              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <h3 className="text-base font-serif font-extrabold text-zinc-800">Save ₹200 on Premium Orders</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Planning a major surprise? Get a flat ₹200 discount for all cart values exceeding ₹999.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-brand-cream-dark px-3 py-1.5 rounded-lg font-bold text-xs border border-zinc-200 uppercase text-zinc-800">
                    CELEBRATE200
                  </span>
                  <button
                    onClick={() => handleCopyCode('CELEBRATE200')}
                    className="p-2 border rounded-lg hover:bg-zinc-50 text-zinc-600 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Code
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Note */}
          <div className="bg-white border rounded-3xl p-6 mt-8 shadow-sm flex items-center gap-4 text-xs">
            <Sparkles className="h-5 w-5 text-brand-gold shrink-0 animate-pulse" />
            <p className="text-zinc-600">
              💡 <strong>Free Delivery Offer:</strong> All orders above ₹799 qualify for complimentary fast shipping automatically. No discount code needed!
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
