'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { 
  ArrowRight, 
  HelpCircle, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  CreditCard 
} from 'lucide-react';

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-zinc-850 text-left">
      <Header />
      
      <main className="flex-grow py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Breadcrumbs />

          {/* Title */}
          <div className="border-b border-zinc-200/80 pb-6 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-brand-burgundy/10 text-brand-burgundy">
              FATAFAT Commerce • Legal Policies
            </span>
            <h1 className="text-2xl sm:text-4xl font-serif font-black text-zinc-900 tracking-tight">
              Cancellation Policy
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl leading-relaxed">
              Understand our cancellation windows, culinary preparation cut-offs, and refund processing workflows.
            </p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pt-1">
              Last Updated: September 2026
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Sticky TOC */}
            <aside className="md:col-span-4 sticky top-28 bg-white border border-zinc-200/70 rounded-2xl p-5 shadow-xs space-y-3 shrink-0">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">
                Sections
              </span>
              <nav className="flex flex-col gap-2.5 text-xs font-semibold text-zinc-600">
                <a href="#eligible-window" className="hover:text-brand-burgundy transition-colors">1. Pre-Preparation Window</a>
                <a href="#preparing-cutoff" className="hover:text-brand-burgundy transition-colors">2. The &ldquo;Preparing&rdquo; Cut-Off</a>
                <a href="#merchant-cancel" className="hover:text-brand-burgundy transition-colors">3. Merchant Cancellations</a>
                <a href="#refund-mode" className="hover:text-brand-burgundy transition-colors">4. Refund Settlement Mode</a>
              </nav>

              <div className="pt-3 border-t border-zinc-100">
                <Link
                  href="/refund-policy"
                  className="w-full py-2 px-3 bg-brand-burgundy/10 hover:bg-brand-burgundy/20 text-brand-burgundy font-bold text-[11px] rounded-xl flex items-center justify-between transition-colors"
                >
                  <span>View Full Refund Policy</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </aside>

            {/* Content */}
            <div className="md:col-span-8 bg-white border border-zinc-200/70 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 text-xs sm:text-sm text-zinc-700 leading-relaxed font-sans">
              
              <div id="eligible-window" className="space-y-3 scroll-mt-28">
                <h3 className="text-base font-serif font-bold text-zinc-900">1. Pre-Preparation Cancellation Window</h3>
                <p>
                  Customers may cancel their order and request a 100% refund directly from <strong>Account → My Orders</strong> as long as the order is in <strong>Order Placed</strong>, <strong>Pending</strong>, or <strong>Confirmed</strong> state.
                </p>
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>Cancellations made before kitchen preparation begins are eligible for a 100% full refund with zero cancellation charges.</span>
                </div>
              </div>

              <div id="preparing-cutoff" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <h3 className="text-base font-serif font-bold text-zinc-900">2. The &ldquo;Preparing&rdquo; Cut-Off Rule</h3>
                <p>
                  Due to the handcrafted, perishable nature of fresh celebration cakes, custom calligraphy messages, and fresh floral bouquets, <strong>orders cannot be cancelled once preparation has begun</strong> (status changes to <em>Preparing</em>, <em>Packed</em>, <em>Out for Delivery</em>, or <em>Delivered</em>).
                </p>
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Once kitchen baking begins, perishable ingredients and custom decorations are consumed, rendering the self-service cancellation option permanently disabled.</span>
                </div>
              </div>

              <div id="merchant-cancel" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <h3 className="text-base font-serif font-bold text-zinc-900">3. Merchant-Initiated Cancellations</h3>
                <p>
                  In rare circumstances where unforeseen delivery route blocks, severe weather, or stock shortages prevent fulfillment, FATAFAT will immediately notify the customer and issue a 100% full refund through Razorpay.
                </p>
              </div>

              <div id="refund-mode" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <h3 className="text-base font-serif font-bold text-zinc-900">4. Refund Settlement Mode & Timelines</h3>
                <p>
                  Approved refunds are issued to the original payment method via Razorpay:
                </p>
                <ul className="list-disc list-inside text-xs space-y-1 text-zinc-600">
                  <li><strong>UPI Payments</strong>: Typically credited within 24 to 48 banking hours.</li>
                  <li><strong>Credit & Debit Cards</strong>: Typically credited in 5 to 7 business days depending on your bank&apos;s settlement cycles.</li>
                  <li><strong>NetBanking</strong>: 3 to 5 business days.</li>
                </ul>
              </div>

              {/* Help */}
              <div className="border-t border-dashed border-zinc-200 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs bg-[#FAF9F6] p-4 rounded-2xl border">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-brand-burgundy shrink-0" />
                  <span className="font-semibold text-zinc-800">Need cancellation support?</span>
                </div>
                <Link
                  href="/contact"
                  className="px-4 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors text-[10px]"
                >
                  Contact FATAFAT <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
