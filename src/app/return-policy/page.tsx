'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { 
  ArrowRight, 
  HelpCircle, 
  RotateCcw, 
  ShieldCheck, 
  Package, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

export default function ReturnPolicyPage() {
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
              Returns & Replacements Policy
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl leading-relaxed">
              Guidelines regarding perishable culinary goods, celebration merchandise, and transit replacement guarantees.
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
                <a href="#perishables" className="hover:text-brand-burgundy transition-colors">1. Fresh & Baked Items</a>
                <a href="#damaged-transit" className="hover:text-brand-burgundy transition-colors">2. Transit Damage & Replacement</a>
                <a href="#nonperishables" className="hover:text-brand-burgundy transition-colors">3. Non-Perishable Accessories</a>
                <a href="#conditions" className="hover:text-brand-burgundy transition-colors">4. Return Conditions</a>
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
              
              <div id="perishables" className="space-y-3 scroll-mt-28">
                <h3 className="text-base font-serif font-bold text-zinc-900">1. Fresh Cakes, Pastries & Floral Bouquets</h3>
                <p>
                  As fresh baked cakes, pastries, floral arrangements, and personalized items are perishable and handcrafted bespoke on order, physical returns are not possible once successfully delivered and accepted at the doorstep.
                </p>
                <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900">
                  <strong>Cancellation Window:</strong> Cancellations and full refunds can be requested directly from your account before preparation starts (while status is <em>Pending</em> or <em>Confirmed</em>). Once the status changes to <em>Preparing</em>, cancellations are closed.
                </div>
              </div>

              <div id="damaged-transit" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <h3 className="text-base font-serif font-bold text-zinc-900">2. Transit Damage & Doorstep Claims</h3>
                <p>
                  If an item arrives damaged (e.g. collapsed icing, broken packaging, defective candle/gift), please notify Customer Support with clear photo proof within <strong>2 hours of delivery</strong>. We will issue a priority free replacement or an approved refund.
                </p>
              </div>

              <div id="nonperishables" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <h3 className="text-base font-serif font-bold text-zinc-900">3. Non-Perishable Celebration Accessories</h3>
                <p>
                  Celebration accessories (candles, balloon sets, party props, dry gourmet gift boxes) can be returned within <strong>7 calendar days</strong> from the delivery date, provided the product remains completely unused, unopened, and in its original sealed box.
                </p>
              </div>

              <div id="conditions" className="space-y-3 scroll-mt-28 border-t border-zinc-100 pt-6">
                <h3 className="text-base font-serif font-bold text-zinc-900">4. Refund Settlement</h3>
                <p>
                  Approved returns and refunds are processed via Razorpay back to your original payment method (UPI: 24 to 48 banking hours; Cards: 5 to 7 business days).
                </p>
              </div>

              {/* Help Box */}
              <div className="border-t border-dashed border-zinc-200 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs bg-[#FAF9F6] p-4 rounded-2xl border">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-brand-burgundy shrink-0" />
                  <span className="font-semibold text-zinc-800">Need assistance with returns or replacements?</span>
                </div>
                <Link
                  href="/contact"
                  className="px-4 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors text-[10px]"
                >
                  Contact Support <ArrowRight className="h-3 w-3" />
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
