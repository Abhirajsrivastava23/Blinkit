'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Truck, Mail, Lock, X, LogIn } from 'lucide-react';
import { useToast } from './Toast';

export default function KeyboardShortcutListener() {
  const router = useRouter();
  const { showToast } = useToast();

  const [activeModal, setActiveModal] = useState<'admin' | 'delivery_partner' | null>(null);
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Keyboard shortcut listener
  useEffect(() => {
    const pressedKeys = new Set<string>();

    const isInputElement = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toUpperCase();
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable ||
        el.getAttribute('role') === 'textbox'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts when user is interacting with text inputs/editable elements
      if (isInputElement(e.target) || isInputElement(document.activeElement)) {
        return;
      }

      pressedKeys.add(e.key);
      if (e.code) pressedKeys.add(e.code);

      // Support Windows key (Meta) as well as Ctrl as fallback if Windows OS intercepts Win+K/Win+L
      const hasModifier = e.metaKey || e.ctrlKey || pressedKeys.has('Meta') || pressedKeys.has('OS') || pressedKeys.has('Win') || pressedKeys.has('Control');
      const hasShift = e.shiftKey || pressedKeys.has('Shift');
      const isKeyK = e.key?.toLowerCase() === 'k' || e.code === 'KeyK' || pressedKeys.has('k') || pressedKeys.has('K') || e.key?.toLowerCase() === 'a' || e.code === 'KeyA';
      const isKeyL = e.key?.toLowerCase() === 'l' || e.code === 'KeyL' || pressedKeys.has('l') || pressedKeys.has('L');

      // 1. Windows / Ctrl + Shift + K (or Shift + A) -> Admin Login
      if (hasModifier && hasShift && isKeyK) {
        e.preventDefault();
        pressedKeys.clear();
        // Set short-lived 60-second intent cookie
        document.cookie = 'fatafat_portal_intent=admin; path=/; max-age=60; SameSite=Lax';
        setEmailOrId('');
        setPassword('');
        setErrorMessage('');
        setActiveModal('admin');
      }
      // 2. Windows / Ctrl + Shift + L -> Delivery Partner Login
      else if (hasModifier && hasShift && isKeyL) {
        e.preventDefault();
        pressedKeys.clear();
        // Set short-lived 60-second intent cookie
        document.cookie = 'fatafat_portal_intent=delivery_partner; path=/; max-age=60; SameSite=Lax';
        setEmailOrId('');
        setPassword('');
        setErrorMessage('');
        setActiveModal('delivery_partner');
      }
      // Close modal on Escape
      else if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key);
      if (e.code) pressedKeys.delete(e.code);
    };

    const handleBlur = () => {
      pressedKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handlePortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrId || !password) {
      setErrorMessage('Please provide both identification and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrId, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
        return;
      }

      // Check that role matches requested portal modal
      if (activeModal === 'admin' && data.user?.role !== 'admin' && data.user?.role !== 'super_admin') {
        setErrorMessage('Access denied: Admin credentials required.');
        setIsLoading(false);
        return;
      }

      if (activeModal === 'delivery_partner' && data.user?.role !== 'delivery_partner') {
        setErrorMessage('Access denied: Delivery Partner credentials required.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('fatafat_user', JSON.stringify(data.user));
      showToast(`Welcome back, ${data.user.name || 'User'}! Authentication successful.`, 'success');

      const targetPath = activeModal === 'admin' ? '/admin' : '/delivery-partner';
      setActiveModal(null);
      setIsLoading(false);

      setTimeout(() => {
        router.push(targetPath);
      }, 400);
    } catch {
      setErrorMessage('Network error during portal authentication.');
      setIsLoading(false);
    }
  };

  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left font-sans text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top visual brand stripe */}
        <div className={`absolute top-0 inset-x-0 h-1.5 ${activeModal === 'admin' ? 'bg-brand-burgundy' : 'bg-brand-gold'}`} />

        {/* Close Button */}
        <button
          onClick={() => setActiveModal(null)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
          title="Close (Esc)"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Portal Header */}
        <div className="text-center space-y-1.5 pt-2 pb-4 border-b border-zinc-100">
          <div className="inline-flex items-center gap-1.5 justify-center">
            <span className="font-serif italic font-bold text-xl text-brand-burgundy">Fatafat</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1 ${
              activeModal === 'admin' ? 'bg-brand-burgundy' : 'bg-zinc-800'
            }`}>
              {activeModal === 'admin' ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> Ops Admin
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5" /> Delivery Partner
                </>
              )}
            </span>
          </div>
          <h3 className="font-serif font-black text-sm uppercase tracking-wider text-zinc-900">
            {activeModal === 'admin' ? 'Administrative Operations' : 'Rider Operations Portal'}
          </h3>
          <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-widest">
            Controlled Security Portal
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[11px] font-medium animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Portal Login Form */}
        <form onSubmit={handlePortalLogin} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">
              {activeModal === 'admin' ? 'Admin Email or ID' : 'Rider ID or Email'}
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder={activeModal === 'admin' ? 'admin@fatafat.com' : 'Enter Rider ID or Email'}
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy focus:bg-white font-medium text-zinc-800 text-xs transition-all"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 block">
              Security Password
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy focus:bg-white font-medium text-zinc-800 text-xs transition-all"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-serif font-bold uppercase tracking-wider text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              activeModal === 'admin' ? 'bg-brand-burgundy hover:bg-brand-burgundy-dark' : 'bg-zinc-900 hover:bg-zinc-800'
            }`}
          >
            <LogIn className="h-4 w-4" />
            {isLoading ? 'Verifying Credentials...' : (activeModal === 'admin' ? 'Sign In Admin Console' : 'Sign In Rider Portal')}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-zinc-100 text-center">
          <p className="text-[9px] text-zinc-400 font-medium">
            Controlled Security Access • Authorized Staff Only
          </p>
        </div>
      </div>
    </div>
  );
}
