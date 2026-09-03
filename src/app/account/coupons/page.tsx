'use client';

import React from 'react';
import { Tag, Sparkles, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function AccountCouponsPage() {
  return (
    <div className="space-y-6 text-xs text-left">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">Promotions & Vouchers</h3>
        <p className="text-xs text-zinc-500">Apply your exclusive promo coupons directly at checkout.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 border border-zinc-200/40 rounded-3xl bg-white space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-2xl shrink-0">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="font-serif font-black text-sm text-zinc-900">Personalized Coupons</p>
              <p className="text-[11px] text-zinc-500">Apply your private coupon codes at cart or checkout</p>
            </div>
          </div>
          <p className="text-zinc-600 text-[11px] leading-relaxed">
            Exclusive celebration vouchers and special customer discount codes sent to your registered email or phone can be entered during checkout.
          </p>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-medium">Auto-verified on application</span>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-burgundy hover:underline uppercase tracking-wider"
            >
              <ShoppingBag className="h-3 w-3" /> View Cart
            </Link>
          </div>
        </div>

        <div className="p-5 border border-brand-gold/20 rounded-3xl bg-white space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-gold/10 text-brand-gold-dark rounded-2xl shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-serif font-black text-sm text-zinc-900">Complimentary Fast Delivery</p>
              <p className="text-[11px] text-zinc-500">Automatic perk on orders ₹799+</p>
            </div>
          </div>
          <p className="text-zinc-600 text-[11px] leading-relaxed">
            All orders exceeding ₹799 automatically qualify for free express shipping with zero voucher required.
          </p>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full">Always Active</span>
            <Link
              href="/category/cakes"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-700 hover:underline uppercase tracking-wider"
            >
              Shop Now &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
