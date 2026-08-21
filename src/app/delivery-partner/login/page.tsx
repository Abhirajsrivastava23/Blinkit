'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Mail, Lock, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function DeliveryPartnerLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!emailOrId || !password) {
      showToast('Please enter both Email/ID and password.', 'error');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId, password })
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Authentication failed. Please verify credentials.', 'error');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem('fatafat_user', JSON.stringify(data.user));
      showToast(`Welcome back, ${data.user.name}! Opening Logistics Dashboard.`, 'success');
      
      setTimeout(() => {
        router.push('/delivery-partner');
      }, 800);
    } catch (err) {
      showToast('Connection to auth server failed.', 'error');
      setIsLoading(false);
    }
  };

  const triggerDemoLogin = (id: string) => {
    setEmailOrId(id);
    setPassword('rider123');
    showToast(`Autofilled demo credentials for rider: ${id}`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center p-4 font-sans text-xs text-brand-charcoal select-none">
      <div className="w-full max-w-sm bg-white border border-zinc-200/50 rounded-3xl p-6 shadow-xl space-y-6 text-left relative overflow-hidden">
        
        {/* Top visual brand stripe */}
        <div className="absolute top-0 inset-x-0 h-1 bg-brand-gold" />

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 justify-center font-sans font-black tracking-tight text-xl">
            <span className="text-brand-burgundy font-serif italic text-lg">Fatafat</span>
            <span className="bg-brand-burgundy text-white px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 font-sans">
              <Truck className="h-3 w-3" /> Delivery
            </span>
          </div>
          <h3 className="font-serif font-black text-sm uppercase tracking-wider text-zinc-900 mt-1">OPERATIONS PORTAL</h3>
          <p className="text-[9px] text-zinc-450 uppercase tracking-widest font-extrabold">Rider Security Authentication</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-450 block">Rider ID or Email</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. DP-001 or rider@fatafat.com"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                className="w-full pl-9 pr-3 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy font-medium text-zinc-800"
              />
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-450 block">Security Password</label>
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-brand-charcoal hover:bg-zinc-800 text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 text-[10px]"
          >
            {isLoading ? 'Decrypting Rider Session...' : 'Sign In Rider Console'}
          </button>
        </form>

        {/* Demo profiles quick login */}
        <div className="border-t border-zinc-200/50 pt-4 space-y-2">
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block text-center">
            ⚡ QUICK DEMO RIDER LOGIN
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => triggerDemoLogin('DP-001')}
              className="py-2.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-left hover:bg-brand-burgundy/5 hover:border-brand-burgundy/20 transition-all font-bold block"
            >
              <p className="text-zinc-800 text-[10px]">Rahul (Rider A)</p>
              <p className="text-[8px] text-zinc-400 font-normal">Nawabganj Zone</p>
            </button>

            <button
              onClick={() => triggerDemoLogin('DP-002')}
              className="py-2.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-left hover:bg-brand-burgundy/5 hover:border-brand-burgundy/20 transition-all font-bold block"
            >
              <p className="text-zinc-800 text-[10px]">Aman (Rider B)</p>
              <p className="text-[8px] text-zinc-400 font-normal">Chandigarh Uni</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
