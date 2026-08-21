'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { ArrowRight, HelpCircle } from 'lucide-react';

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Breadcrumbs />

          {/* Title */}
          <div className="border-b pb-5 border-zinc-200">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-widest block mb-1">Legal Policies</span>
            <h1 className="text-3xl font-serif font-extrabold text-zinc-800">Terms & Conditions</h1>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Last Updated: August 20, 2026</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Sticky TOC */}
            <aside className="md:col-span-4 sticky top-28 bg-white border border-zinc-150/40 rounded-2xl p-5 shadow-sm space-y-3 shrink-0">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Sections</span>
              <nav className="flex flex-col gap-2.5 text-xs font-bold text-zinc-500">
                <a href="#services" className="hover:text-brand-burgundy transition-colors">1. Delivery Services</a>
                <a href="#accounts" className="hover:text-brand-burgundy transition-colors">2. Account Responsibility</a>
                <a href="#wellness" className="hover:text-brand-burgundy transition-colors">3. Wellness Compliance</a>
                <a href="#liability" className="hover:text-brand-burgundy transition-colors">4. Limitation of Liability</a>
              </nav>
            </aside>

            {/* Content */}
            <div className="md:col-span-8 bg-white border border-zinc-150/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 text-xs sm:text-sm text-zinc-650 leading-relaxed font-sans">
              
              <div id="services" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">1. Delivery Services</h3>
                <p>
                  FATAFAT provides instant celebration-commerce delivery. Delivery timescales are estimates and subject to traffic, courier availability, and bakery production logs.
                </p>
              </div>

              <div id="accounts" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">2. Account Responsibility</h3>
                <p>
                  You are responsible for keeping your OTP login information secure. Any transaction logs performed under your profile parameters will be your direct liability.
                </p>
              </div>

              <div id="wellness" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">3. Wellness Store Regulations</h3>
                <p>
                  Wellness products are subject to regulatory compliance constraints. Access requires an 18+ age verification gate. We reserve the right to request official photo IDs during handover.
                </p>
              </div>

              <div id="liability" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">4. Limitation of Liability</h3>
                <p>
                  FATAFAT will not be liable for indirect, incidental, or consequential damages resulting from delayed shipments, incorrect order details, or raw ingredient allergens.
                </p>
              </div>

              {/* Help */}
              <div className="border-t border-dashed pt-6 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-brand-gold shrink-0 animate-pulse" />
                  <span className="font-medium text-zinc-500">Need terms clarification?</span>
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
