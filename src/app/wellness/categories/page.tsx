'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import AgeGate from '../../../components/AgeGate';
import { useWellness } from '../../../context/WellnessContext';
import { useAuth } from '../../../context/AuthContext';
import { ShieldCheck, Heart, Sparkles, Flame, EyeOff } from 'lucide-react';

export default function WellnessCategoriesPage() {
  const router = useRouter();
  const { user, isLoading, wellnessPublished } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!wellnessPublished && user?.role !== 'admin') {
        router.push('/');
        return;
      }
      if (user?.wellnessAccessStatus !== 'ACTIVE' && user?.role !== 'admin') {
        router.push('/wellness');
      }
    }
  }, [user, isLoading, wellnessPublished, router]);

  if (!isLoading && !wellnessPublished && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-brand-charcoal select-none font-sans text-xs">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center py-24 space-y-4">
          <div className="h-16 w-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
            <EyeOff className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-2xl font-serif font-black text-zinc-900 uppercase tracking-wide">404 - Section Unavailable</h2>
          <p className="text-xs text-zinc-500 max-w-sm font-medium leading-relaxed">
            The Wellness section is currently offline or unpublished. Please check back later.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl text-xs font-serif font-bold uppercase tracking-wider transition-all"
          >
            Return to Store
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (isLoading || (user?.wellnessAccessStatus !== 'ACTIVE' && user?.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center text-white text-xs">
        Verifying Wellness security token...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0E] text-zinc-300">
      <Header />
      
      <main className="flex-grow py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center py-6 space-y-4 max-w-2xl mx-auto">
            <span className="text-[10px] text-wellness-bronze font-bold uppercase tracking-widest block">FATAFAT Intimates</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-white">
              Wellness Categories
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl mx-auto">
              Luxury formulations and personal care essentials. We ship all orders in unbranded packaging.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cat 1: Condoms */}
            <Link
              href="/wellness?category=Condoms"
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-wellness-bronze/40 transition-colors text-center space-y-3 block"
            >
              <div className="p-3 bg-zinc-800 text-wellness-bronze rounded-xl w-fit mx-auto">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-white">Condoms</h3>
              <p className="text-xs text-zinc-400">
                Premium ribbed, dotted, ultra-thin latex shields from Durex, KamaSutra, Skore, and Manforce.
              </p>
            </Link>

            {/* Cat 2: Lubricants */}
            <Link
              href="/wellness?category=Lubricants"
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-wellness-bronze/40 transition-colors text-center space-y-3 block"
            >
              <div className="p-3 bg-zinc-800 text-wellness-bronze rounded-xl w-fit mx-auto">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-white">Lubricants</h3>
              <p className="text-xs text-zinc-400">
                Silky water-soluble gels and strawberry warming personal lubricants for smoothness.
              </p>
            </Link>

            {/* Cat 3: Intimate Care */}
            <Link
              href="/wellness?category=Intimate%20Care"
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-wellness-bronze/40 transition-colors text-center space-y-3 block"
            >
              <div className="p-3 bg-zinc-800 text-wellness-bronze rounded-xl w-fit mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-white">Intimate Care</h3>
              <p className="text-xs text-zinc-400">
                pH-balanced daily washes and biodegradable cotton wet wipes for clean hygiene.
              </p>
            </Link>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex items-center gap-4 text-xs text-zinc-400">
            <EyeOff className="h-6 w-6 text-wellness-bronze shrink-0" />
            <p>
              🔒 <strong>Discreet Delivery Guarantee:</strong> All orders are packed in heavy plain cardboard boxes with no store names, logos, or catalog references displayed.
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
