'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, ShieldAlert, ShoppingBag, Truck, ArrowRight, MessageSquare } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function HelpCenterPage() {
  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
          
          <Breadcrumbs />

          {/* Hero */}
          <div className="text-center py-6 space-y-2 max-w-xl mx-auto">
            <h1 className="text-3xl font-serif font-extrabold text-zinc-800">
              Help Center & Support
            </h1>
            <p className="text-xs text-zinc-500">
              Need assistance with refunds, cancellation, delivery logs, or general queries? Find solutions below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1 */}
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-3">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl w-fit">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-serif font-extrabold text-zinc-800">Order Queries</h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Check active ETA delivery tracking status or browse past transaction receipts.
              </p>
              <Link href="/account/orders" className="text-xs text-brand-burgundy font-bold hover:underline flex items-center gap-1 mt-2">
                Go to Orders <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Box 2 */}
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-3">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl w-fit">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-serif font-extrabold text-zinc-800">Cancellations & Refunds</h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Review return policies and learn how to submit immediate cancellation requests.
              </p>
              <Link href="/refund-policy" className="text-xs text-brand-burgundy font-bold hover:underline flex items-center gap-1 mt-2">
                Refund Guidelines <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Box 3 */}
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-3">
              <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl w-fit">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-serif font-extrabold text-zinc-800">Shipping Speeds</h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Learn about delivery slots, midnight surprises, and free delivery thresholds.
              </p>
              <Link href="/delivery" className="text-xs text-brand-burgundy font-bold hover:underline flex items-center gap-1 mt-2">
                Delivery Details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Contact CTA */}
          <div className="bg-white border rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 border-l-brand-gold">
            <div className="space-y-1">
              <h3 className="text-base font-serif font-extrabold text-zinc-800">Still have unanswered questions?</h3>
              <p className="text-xs text-zinc-400">Our customer happiness team is available daily from 6 AM to 12 Midnight.</p>
            </div>
            <Link
              href="/contact"
              className="px-6 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" /> Open Chat Support
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
