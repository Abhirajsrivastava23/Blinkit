'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ShieldCheck } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const callback = searchParams.get('callback') || '/';
  const error = searchParams.get('error');

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google-login?callback=${encodeURIComponent(callback)}`;
  };

  return (
    <div className="bg-white border border-zinc-150 rounded-3xl p-8 shadow-xl space-y-8 text-center relative overflow-hidden">
      {/* Top decorative gradient bar */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-burgundy via-brand-coral to-brand-gold" />

      {/* Brand Logo Header */}
      <div className="space-y-3 pt-4">
        <div className="inline-flex items-center select-none font-sans font-black tracking-tighter text-3xl">
          <span className="text-brand-burgundy">FATA</span>
          <span className="ml-1 px-2 py-0.5 rounded-xl text-white font-black text-[0.85em] uppercase leading-none bg-brand-coral shadow-sm">
            FAT
          </span>
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-serif font-black text-zinc-900 tracking-tight">Sign in to continue</h1>
          <p className="text-[11px] text-zinc-450 font-medium max-w-xs mx-auto leading-relaxed">
            Create your FATAFAT account or sign in securely with Google.
          </p>
        </div>
      </div>

      {/* Error messaging */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-left space-y-1 text-red-700">
          <p className="text-xs font-bold">Authentication failed</p>
          <p className="text-[10px] text-red-500 font-medium leading-normal">
            {error === 'access_denied' && 'Access request cancelled.'}
            {error === 'token_exchange_failed' && 'OAuth connection error. Please try again.'}
            {error === 'missing_config' && 'Google Authentication is currently offline. Contact Support.'}
            {error !== 'access_denied' && error !== 'token_exchange_failed' && error !== 'missing_config' && 'An error occurred during authentication.'}
          </p>
        </div>
      )}

      {/* Official Google-style Continue with Google CTA */}
      <div className="py-2">
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3.5 bg-white border border-zinc-350 hover:border-zinc-450 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 font-sans font-bold text-xs py-3.5 px-6 rounded-full transition-all shadow-sm hover:shadow-md hover:scale-[1.01] cursor-pointer"
        >
          {/* Official Google icon vector */}
          <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Secure Notice */}
      <div className="flex items-center justify-center gap-2 p-4 bg-zinc-50 border border-zinc-150/50 rounded-2xl text-[10px] text-zinc-500 font-medium">
        <ShieldCheck className="h-4.5 w-4.5 text-brand-burgundy shrink-0" />
        <span className="leading-snug text-left">
          Your credentials are encrypted. FATAFAT does not access or store your Google password.
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />

      <main className="flex-1 bg-[#FAF9F6] py-20 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full px-4">
          <Suspense fallback={
            <div className="p-8 text-center bg-white border border-zinc-100 rounded-3xl animate-pulse">
              <div className="h-6 w-24 bg-zinc-200 mx-auto rounded mb-4" />
              <div className="h-10 w-full bg-zinc-100 rounded-full" />
            </div>
          }>
            <LoginContent />
          </Suspense>
        </div>
      </main>

      <Footer />
    </>
  );
}
