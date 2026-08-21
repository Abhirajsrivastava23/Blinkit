'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { ArrowRight, HelpCircle } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Breadcrumbs />

          {/* Policy Title & Last Updated */}
          <div className="border-b pb-5 border-zinc-200">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-widest block mb-1">Legal Policies</span>
            <h1 className="text-3xl font-serif font-extrabold text-zinc-800">Refund Policy</h1>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Last Updated: August 20, 2026</p>
          </div>

          {/* Sticky Split Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Sticky Table of Contents */}
            <aside className="md:col-span-4 sticky top-28 bg-white border border-zinc-150/40 rounded-2xl p-5 shadow-sm space-y-3 shrink-0">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Sections</span>
              <nav className="flex flex-col gap-2.5 text-xs font-bold text-zinc-500">
                <a href="#perishable" className="hover:text-brand-burgundy transition-colors">1. Perishable Items</a>
                <a href="#damaged" className="hover:text-brand-burgundy transition-colors">2. Damaged Shipments</a>
                <a href="#nonperishable" className="hover:text-brand-burgundy transition-colors">3. Non-Perishable Goods</a>
                <a href="#processing" className="hover:text-brand-burgundy transition-colors">4. Processing Timelines</a>
              </nav>
            </aside>

            {/* Right Content */}
            <div className="md:col-span-8 bg-white border border-zinc-150/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 text-xs sm:text-sm text-zinc-650 leading-relaxed font-sans">
              
              <div id="perishable" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">1. Perishable Items Exception</h3>
                <p>
                  Due to the highly perishable nature of fresh florist bouquets, artisanal cakes, single-serve pastries, and customized hampers, refunds or order cancellations are not supported once preparation, chef baking, or florist assembly has commenced.
                </p>
              </div>

              <div id="damaged" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">2. Damaged Shipments & Replacements</h3>
                <p>
                  If a fresh cake or floral arrangement arrives in a damaged state (e.g., collapsed icing, broken vase, or wilted flowers), you must notify support with photographic evidence within <strong>1 hour</strong> of receipt. Upon validation, we will dispatch an immediate replacement or issue a full refund.
                </p>
              </div>

              <div id="nonperishable" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">3. Non-Perishable Goods & Wellness Items</h3>
                <p>
                  Non-perishable gift sets, celebration accessories, and wellness products are eligible for returns within 7 calendar days, provided the protective seals, hygiene wraps, and packaging boxes remain completely intact and unopened.
                </p>
              </div>

              <div id="processing" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">4. Refund Processing Timelines</h3>
                <p>
                  Approved refunds are processed instantly. Depending on your financial institution or card issuer, card transactions will reflect in your account within 3 to 5 business days. UPI refunds are completed immediately.
                </p>
              </div>

              {/* Bottom Need Help */}
              <div className="border-t border-dashed pt-6 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-brand-gold shrink-0 animate-pulse" />
                  <span className="font-medium text-zinc-500">Need immediate refund assistance?</span>
                </div>
                <Link
                  href="/contact"
                  className="px-4 py-2 border border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/5 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  Contact FATAFAT <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

            </div>

          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
