'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { ArrowRight, HelpCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <Breadcrumbs />

          {/* Title */}
          <div className="border-b pb-5 border-zinc-200">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-widest block mb-1">Legal Policies</span>
            <h1 className="text-3xl font-serif font-extrabold text-zinc-800">Privacy Policy</h1>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Last Updated: August 20, 2026</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Sticky TOC */}
            <aside className="md:col-span-4 sticky top-28 bg-white border border-zinc-150/40 rounded-2xl p-5 shadow-sm space-y-3 shrink-0">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Sections</span>
              <nav className="flex flex-col gap-2.5 text-xs font-bold text-zinc-500">
                <a href="#collect" className="hover:text-brand-burgundy transition-colors">1. Information We Collect</a>
                <a href="#use" className="hover:text-brand-burgundy transition-colors">2. How We Use Data</a>
                <a href="#security" className="hover:text-brand-burgundy transition-colors">3. Security Measures</a>
                <a href="#rights" className="hover:text-brand-burgundy transition-colors">4. Your Rights</a>
              </nav>
            </aside>

            {/* Content */}
            <div className="md:col-span-8 bg-white border border-zinc-150/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 text-xs sm:text-sm text-zinc-650 leading-relaxed font-sans">
              
              <div id="collect" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">1. Information We Collect</h3>
                <p>
                  We collect account registration data (name, email, verification logs), delivery addresses, and cart transaction details. For wellness compliance checks, age-verification inputs are checked but not stored.
                </p>
              </div>

              <div id="use" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">2. How We Use Data</h3>
                <p>
                  Your information is used solely to process orders, dispatch delivery runners, and send catalog updates. We never sell, trade, or share your profile details with third-party advertising companies.
                </p>
              </div>

              <div id="security" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">3. Data Security</h3>
                <p>
                  All transaction, address, and login communications are secured using 256-bit SSL encryption. We employ enterprise firewalls and database access policies to protect your records.
                </p>
              </div>

              <div id="rights" className="space-y-3 scroll-mt-28">
                <h3 className="text-sm font-serif font-extrabold text-zinc-800">4. Your Rights</h3>
                <p>
                  You hold full rights to access, modify, correct, or request the deletion of your account records at any time. Simply message our support team.
                </p>
              </div>

              {/* Help */}
              <div className="border-t border-dashed pt-6 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-brand-gold shrink-0 animate-pulse" />
                  <span className="font-medium text-zinc-500">Have data privacy questions?</span>
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
