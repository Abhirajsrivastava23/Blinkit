'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserPlus, Mail, Lock, Phone, User } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useToast } from '../../components/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      showToast('Please fill out all fields.', 'error');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Registration successful! Please login.', 'success');
      router.push('/login');
    }, 800);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-12 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full px-4 space-y-4">
          <Breadcrumbs />

          <div className="bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm space-y-6">
            
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-serif font-extrabold text-zinc-800">
                Join FATAFAT
              </h1>
              <p className="text-xs text-zinc-500">
                Create an account to track quick orders and manage addresses.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy/40"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy/40"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Mobile Phone</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 font-bold text-zinc-400">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-11 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy/40"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    placeholder="Create secure password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-brand-burgundy hover:bg-brand-burgundy-dark disabled:bg-zinc-300 text-white font-serif font-bold text-xs tracking-wider uppercase transition-all shadow"
              >
                {loading ? 'Registering...' : 'Create Account'}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-100"></div>
              <span className="flex-shrink mx-3 text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Already have account?</span>
              <div className="flex-grow border-t border-zinc-100"></div>
            </div>

            <Link
              href="/login"
              className="w-full py-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5"
            >
              Sign In Instead
            </Link>

            <div className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-zinc-50 border text-[10px] text-zinc-500">
              <ShieldCheck className="h-4 w-4 text-brand-burgundy shrink-0" />
              <span>Dermatologist and payment policies strictly compliant.</span>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
