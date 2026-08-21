'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { ArrowRight, HelpCircle } from 'lucide-react';

export default function ShippingPolicyPage() {
  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Breadcrumbs />

          {/* Policy Title */}
          <div className="border-b pb-5 border-zinc-200">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-widest block mb-1">Legal Policies</span>
            <h1 className="text-3xl font-serif font-extrabold text-zinc-800">Shipping Policy</h1>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Last Updated: August 20, 2026</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Sticky TOC */}
            <aside className="md:col-span-4 sticky top-28 bg-white border border-zinc-150/40 rounded-2xl p-5 shadow-sm space-y-3 shrink-0">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Sections</span>
              <nav className="flex flex-col gap-2.5 text-xs font-bold text-zinc-500">
                <a href="#speeds" className="hover:text-brand-burgundy transition-colors">1. Delivery Speeds</a>
                <a href="#fees" className="hover:text-brand-burgundy transition-colors">2. Shipping Fees</a>
                <a href="#rules" className="hover:text-brand-burgundy transition-colors">3. Receiver Guidelines</a>
                <a href="#discreet" className="hover:text-brand-burgundy transition-colors">4. Plain Packaging</a>
              </nav>
            </aside>

            {/* Content */}
            <div className="md:col-span-8 bg-white border border-zinc-150/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 text-xs sm:text-sm text-zinc-650 leading-relaxed font-sans">
              
              <div id="speeds" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">1. Delivery Speeds & Windows</h3>
                <p>
                  FATAFAT targets delivery within 30 to 60 minutes for immediate ASAP dispatches. Perishable cakes, gourmet chocolates, and flowers are carried in temperature-regulated insulated runner bags to prevent damage or melting.
                </p>
              </div>

              <div id="fees" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">2. Shipping Fees & Surcharges</h3>
                <p>
                  Cart subtotals above ₹799 qualify for complimentary free delivery. Orders under ₹799 incur a flat courier delivery charge of ₹49.
                </p>
              </div>

              <div id="rules" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">3. Receiver Rules & Returns</h3>
                <p>
                  Fresh cakes and florist arrangements require direct delivery handovers. If the recipient is unavailable, our runner will wait up to 10 minutes. If contact is unsuccessful, the order will be returned to the local kitchen, and cancellation surcharges will apply.
                </p>
              </div>

              <div id="discreet" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">4. Plain Packaging Commitment (Wellness)</h3>
                <p>
                  All adult wellness category dispatches are packaged in generic plain brown cardboard boxes. Outer delivery labels list &ldquo;FATAFAT Logistics&rdquo; with no branding, descriptions, or logos visible.
                </p>
              </div>

              {/* Help */}
              <div className="border-t border-dashed pt-6 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-brand-gold shrink-0 animate-pulse" />
                  <span className="font-medium text-zinc-500">Need shipping support?</span>
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
