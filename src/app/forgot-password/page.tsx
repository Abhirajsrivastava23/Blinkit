'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useToast } from '../../components/Toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Password recovery instructions sent to your email!', 'success');
      router.push('/login');
    }, 850);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-12 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full px-4 space-y-4">
          <Breadcrumbs />

          <div className="bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm space-y-6">
            
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-serif font-extrabold text-zinc-800">
                Reset Password
              </h1>
              <p className="text-xs text-zinc-500">
                Enter your account email to receive recovery instructions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="Enter account email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-brand-burgundy hover:bg-brand-burgundy-dark disabled:bg-zinc-300 text-white font-serif font-bold text-xs tracking-wider uppercase transition-all shadow flex items-center justify-center gap-1"
              >
                {loading ? 'Sending Instructions...' : 'Send Reset Link'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="border-t pt-4 text-center">
              <Link
                href="/login"
                className="text-xs text-brand-burgundy font-bold hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Login
              </Link>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
