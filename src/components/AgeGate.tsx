'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut, ShieldCheck } from 'lucide-react';
import { useWellness } from '../context/WellnessContext';

export default function AgeGate() {
  const router = useRouter();
  const { isAgeVerified, verifyAge } = useWellness();

  if (isAgeVerified) return null;

  const handleVerify = () => {
    verifyAge();
  };

  const handleGoBack = () => {
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0B0E] flex items-center justify-center p-4">
      {/* Background texture decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black opacity-80" />
      
      {/* Decorative logo glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 bg-wellness-bronze/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main card */}
      <div className="relative max-w-md w-full bg-wellness-dark border border-wellness-bronze/20 rounded-3xl p-8 text-center shadow-2xl space-y-6">
        
        {/* Shield Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-wellness-card border border-wellness-bronze/30 text-wellness-bronze rounded-full">
            <ShieldAlert className="h-10 w-10 animate-pulse" />
          </div>
        </div>

        {/* Branding header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-serif font-extrabold tracking-widest text-white">
            FATAFAT <span className="text-wellness-bronze">WELLNESS</span>
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-wellness-bronze font-bold uppercase">
            18+ ONLY SECTION
          </p>
        </div>

        {/* Advisory message */}
        <p className="text-xs text-wellness-muted leading-relaxed max-w-sm mx-auto">
          This section contains adult-wellness and intimate hygiene products. By entering, you confirm you are at least 18 years of age and agree to view compliant content.
        </p>

        {/* Compliance indicator */}
        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-wellness-card/50 border border-wellness-bronze/10 text-[10px] text-wellness-bronze-light max-w-[280px] mx-auto">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Compliant discreet shipping on all orders</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleVerify}
            className="w-full py-3 rounded-full bg-wellness-bronze hover:bg-wellness-bronze-light text-white font-serif font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-wellness-bronze/10"
          >
            I am 18+ — Enter
          </button>
          
          <button
            onClick={handleGoBack}
            className="w-full py-3 rounded-full border border-wellness-bronze/25 text-wellness-text hover:bg-wellness-card font-serif font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Go Back
          </button>
        </div>

        {/* Disclaimer footer */}
        <p className="text-[9px] text-zinc-600 leading-snug">
          We support responsible selection and safe shipping. Real age/compliance verification triggers can be enabled in production environments.
        </p>

      </div>
    </div>
  );
}
