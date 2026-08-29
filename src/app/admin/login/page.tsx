'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Sparkles, HelpCircle } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId: email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Authentication failed. Please verify credentials.', 'error');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem('fatafat_user', JSON.stringify(data.user));
      showToast(`Welcome back, ${data.user.name}! Initialized Operations Console.`, 'success');
      
      // Redirect to main admin dashboard
      setTimeout(() => {
        router.push('/admin');
      }, 800);
    } catch (err) {
      showToast('Connection to auth server failed.', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-4 text-xs font-sans text-brand-charcoal selection:bg-brand-burgundy/10 select-none">
      <div className="w-full max-w-md bg-white border border-zinc-200/50 rounded-3xl p-8 shadow-xl space-y-6 text-left relative overflow-hidden">
        
        {/* Subtle top visual element */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-brand-burgundy" />

        {/* Brand logo & header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center select-none font-sans font-black tracking-tighter text-2xl">
            <span className="text-brand-burgundy">FATA</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-lg text-white font-black text-[0.85em] uppercase leading-none bg-brand-coral shadow-sm">
              FAT
            </span>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-serif font-black text-sm uppercase tracking-widest text-zinc-900">COMMERCE OPERATIONS</h3>
            <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">Operational Console Authentication</p>
          </div>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-450 block">Operational Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="e.g. admin@fatafat.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy font-medium text-zinc-800"
              />
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-450 block">Security Password</label>
              <button 
                type="button"
                onClick={() => showToast('Contact admin system support to reset security access.', 'info')}
                className="text-[9px] text-brand-burgundy hover:underline font-bold"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy font-medium text-zinc-800"
              />
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
            </div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center justify-between select-none">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-brand-burgundy focus:ring-brand-burgundy"
              />
              <span className="text-[10px] text-zinc-500 font-medium">Keep me signed in</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow-md transition-all hover:scale-101 flex items-center justify-center gap-1.5"
          >
            {isLoading ? 'Decrypting Session...' : 'Sign In Operations'}
          </button>
        </form>

      </div>
    </div>
  );
}
