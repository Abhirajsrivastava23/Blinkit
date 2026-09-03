'use client';

import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Tag, Sparkles, Percent, ShoppingBag, Gift, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function OffersPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <Breadcrumbs />

          <div className="mb-8 space-y-2 text-center sm:text-left">
            <h1 className="text-3xl font-serif font-extrabold text-[#1A1A1A]">
              Celebration Deals & Special Perks
            </h1>
            <p className="text-xs text-zinc-500 max-w-xl">
              Enjoy seasonal delights, complimentary shipping thresholds, and member-only rewards.
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
                  <h3 className="text-base font-serif font-extrabold text-zinc-800">Seasonal Celebration Discounts</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Personalized coupons and festive promotions are delivered directly to your account. Enter your voucher code at checkout to claim your savings.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href="/cart"
                    className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark rounded-xl text-xs font-serif font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Apply At Checkout
                  </Link>
                </div>
              </div>
            </div>

            {/* Offer 2 */}
            <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start hover:border-brand-gold/20 transition-colors">
              <div className="p-4 bg-brand-gold/10 text-brand-gold-dark rounded-2xl shrink-0">
                <Gift className="h-8 w-8" />
              </div>
              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <h3 className="text-base font-serif font-extrabold text-zinc-800">Complimentary Express Delivery</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Planning a major surprise? All orders with a subtotal exceeding ₹799 qualify for fast priority delivery with zero fees.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href="/category/cakes"
                    className="px-4 py-2 bg-zinc-900 text-white hover:bg-black rounded-xl text-xs font-serif font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
                  >
                    Explore Treats <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Note */}
          <div className="bg-white border rounded-3xl p-6 mt-8 shadow-sm flex items-center gap-4 text-xs">
            <Sparkles className="h-5 w-5 text-brand-gold shrink-0 animate-pulse" />
            <p className="text-zinc-600">
              💡 <strong>Instant Voucher Verification:</strong> Any exclusive promo code received via SMS or email will be validated securely upon checkout.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
