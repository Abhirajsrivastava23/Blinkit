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
            className="w-full py-3.5 bg-brand-charcoal hover:bg-zinc-800 text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 text-[10px] cursor-pointer"
          >
            {isLoading ? 'Decrypting Rider Session...' : 'Sign In Rider Console'}
          </button>
        </form>

        {/* Quick-fill Credentials Card */}
        <div className="pt-2 border-t border-zinc-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400">Default Partner Credentials</span>
            <span className="text-[8px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded border border-green-200">Active</span>
          </div>

          <div 
            onClick={() => {
              setEmailOrId('DP-001');
              setPassword('rider123');
            }}
            className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 rounded-xl cursor-pointer transition-colors space-y-1 text-left"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-800">
              <span>Rider 1: Rahul (Nawabganj)</span>
              <span className="text-brand-burgundy text-[9px] underline">Click to fill</span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-2">
              <span>ID: <strong className="text-zinc-700">DP-001</strong></span>
              <span>•</span>
              <span>Pass: <strong className="text-zinc-700">rider123</strong></span>
            </div>
          </div>

          <div 
            onClick={() => {
              setEmailOrId('DP-002');
              setPassword('rider123');
            }}
            className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 rounded-xl cursor-pointer transition-colors space-y-1 text-left"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-800">
              <span>Rider 2: Aman (Chandigarh Univ)</span>
              <span className="text-brand-burgundy text-[9px] underline">Click to fill</span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-2">
              <span>ID: <strong className="text-zinc-700">DP-002</strong></span>
              <span>•</span>
              <span>Pass: <strong className="text-zinc-700">rider123</strong></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
