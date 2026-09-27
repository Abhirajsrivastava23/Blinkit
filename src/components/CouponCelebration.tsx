'use client';

import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { Sparkles, CheckCircle, X } from 'lucide-react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  delay: number;
  duration: number;
  shape: 'rect' | 'circle' | 'strip';
}

interface BalloonItem {
  id: number;
  left: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

const FESTIVE_COLORS = [
  '#6B1D2F', // Burgundy
  '#D4AF37', // Gold
  '#E05263', // Coral
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#3B82F6', // Royal Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
];

export default function CouponCelebration() {
  const { couponCelebration, dismissCelebration } = useCart();
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [balloons, setBalloons] = useState<BalloonItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (couponCelebration.isOpen) {
      setIsVisible(true);

      // Generate 45 lightweight confetti particles
      const newConfetti: ConfettiPiece[] = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        x: Math.floor(Math.random() * 96) + 2, // 2% to 98%
        y: -10 - Math.random() * 20,
        size: Math.floor(Math.random() * 8) + 6,
        color: FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
        rotation: Math.floor(Math.random() * 360),
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.2,
        shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'strip' : 'rect',
      }));

      // Generate 7 floating celebration balloons
      const newBalloons: BalloonItem[] = Array.from({ length: 7 }).map((_, i) => ({
        id: i,
        left: 8 + i * 13 + (Math.random() * 6 - 3), // Spaced across width
        color: FESTIVE_COLORS[i % FESTIVE_COLORS.length],
        size: Math.floor(Math.random() * 16) + 38,
        delay: i * 0.15,
        duration: 3.2 + Math.random() * 0.8,
        drift: (Math.random() - 0.5) * 40,
      }));

      setConfetti(newConfetti);
      setBalloons(newBalloons);

      // Auto dismiss after 3.5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          dismissCelebration();
        }, 300);
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [couponCelebration.isOpen, dismissCelebration]);

  if (!couponCelebration.isOpen) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Coupon Applied Celebration"
      className={`fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Subtle backdrop overlay with pointer events active for dismiss on click outside */}
      <div
        onClick={dismissCelebration}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] pointer-events-auto transition-opacity"
      />

      {/* FLOATING BALLOONS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {balloons.map((b) => (
          <div
            key={b.id}
            style={{
              left: `${b.left}%`,
              bottom: '-80px',
              animation: `floatUp ${b.duration}s cubic-bezier(0.25, 1, 0.5, 1) ${b.delay}s forwards`,
              transform: `translateX(${b.drift}px)`,
            }}
            className="absolute flex flex-col items-center select-none"
          >
            {/* Balloon Body */}
            <div
              style={{
                backgroundColor: b.color,
                width: `${b.size}px`,
                height: `${b.size * 1.22}px`,
                boxShadow: 'inset -4px -6px 12px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.15)',
              }}
              className="rounded-full relative"
            >
              {/* Highlight reflection */}
              <div className="absolute top-2 left-2 w-2.5 h-4 bg-white/40 rounded-full rotate-[-30deg]" />
            </div>
            {/* Knot */}
            <div
              style={{ borderTopColor: b.color }}
              className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px]"
            />
            {/* String */}
            <div className="w-[1px] h-10 bg-zinc-400/70" />
          </div>
        ))}
      </div>

      {/* CONFETTI PARTICLES */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((c) => (
          <div
            key={c.id}
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              backgroundColor: c.color,
              width: c.shape === 'strip' ? `${c.size * 1.8}px` : `${c.size}px`,
              height: c.shape === 'strip' ? `${c.size * 0.4}px` : `${c.size}px`,
              borderRadius: c.shape === 'circle' ? '50%' : '2px',
              animation: `confettiFall ${c.duration}s cubic-bezier(0.2, 0.8, 0.4, 1) ${c.delay}s forwards`,
              transform: `rotate(${c.rotation}deg)`,
            }}
            className="absolute shadow-sm"
          />
        ))}
      </div>

      {/* HERO CELEBRATION MODAL CARD */}
      <div
        className={`relative z-10 w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border-2 border-brand-gold/40 p-6 sm:p-7 text-center pointer-events-auto transform transition-all duration-400 ${
          isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-4 opacity-0'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={dismissCelebration}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label="Close celebration"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Animated Celebration Icon */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-brand-burgundy to-brand-gold flex items-center justify-center shadow-lg shadow-brand-burgundy/25 animate-bounce">
            <span className="text-3xl sm:text-4xl select-none">🎉</span>
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-brand-gold animate-spin" style={{ animationDuration: '4s' }} />
          <Sparkles className="absolute -bottom-1 -left-1 w-5 h-5 text-emerald-500 animate-pulse" />
        </div>

        {/* Header Text */}
        <div className="space-y-1 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold uppercase tracking-wider border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Congratulations!</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-zinc-900 pt-1">
            Coupon Applied!
          </h2>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Your special promotion is active and deducted from the order.
          </p>
        </div>

        {/* Savings Badge / Card */}
        <div className="bg-gradient-to-r from-brand-burgundy/10 via-brand-gold/15 to-brand-burgundy/10 border border-brand-gold/30 rounded-2xl p-3.5 mb-5 space-y-1">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-mono font-black text-brand-burgundy uppercase tracking-widest bg-white/80 px-2 py-0.5 rounded-md border border-brand-burgundy/20">
              🎟️ {couponCelebration.code}
            </span>
            {couponCelebration.discountAmount > 0 ? (
              <span className="font-extrabold text-emerald-600 text-sm">
                Saved ₹{couponCelebration.discountAmount}
              </span>
            ) : (
              <span className="font-bold text-emerald-600 text-xs">
                Discount Active
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={dismissCelebration}
          className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-brand-burgundy to-brand-burgundy-dark hover:brightness-110 text-white font-serif font-extrabold text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition-all active:scale-98"
        >
          Awesome! Continue 🛍️
        </button>

        {/* Auto dismiss countdown bar */}
        <div className="w-full bg-zinc-100 h-1 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-gold to-brand-burgundy rounded-full"
            style={{
              animation: 'shrinkBar 3.5s linear forwards',
            }}
          />
        </div>
      </div>

      {/* KEYFRAME ANIMATIONS */}
      <style jsx global>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(0.6);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg) scale(1);
            opacity: 0;
          }
        }

        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.7);
            opacity: 0.2;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(-115vh) scale(1);
            opacity: 0;
          }
        }

        @keyframes shrinkBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
