'use client';

import React from 'react';
import { Tag, Copy } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function AccountCouponsPage() {
  const { showToast } = useToast();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Coupon code ${code} copied!`, 'success');
  };

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">My Coupons</h3>
        <p className="text-xs text-zinc-500">Available promotional vouchers you can copy and use at checkout.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coupon 1 */}
        <div className="p-4 border rounded-2xl flex items-start gap-3 hover:border-brand-burgundy/10 transition-colors bg-zinc-50/50">
          <div className="p-2 bg-brand-burgundy/5 text-brand-burgundy rounded-lg shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <p className="font-bold text-zinc-800">Flat 10% Discount</p>
              <p className="text-[10px] text-zinc-400">Apply code at checkout on all desserts and bouquets. No minimum purchase.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white border px-2.5 py-1 rounded font-bold tracking-wider uppercase text-zinc-800">FATAFAT10</span>
              <button
                onClick={() => handleCopyCode('FATAFAT10')}
                className="p-1 hover:bg-zinc-100 text-zinc-500 rounded transition-colors"
                title="Copy Coupon"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Coupon 2 */}
        <div className="p-4 border rounded-2xl flex items-start gap-3 hover:border-brand-gold/20 transition-colors bg-zinc-50/50">
          <div className="p-2 bg-brand-gold/10 text-[#7A6010] rounded-lg shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <p className="font-bold text-zinc-800">Save ₹200 on orders above ₹999</p>
              <p className="text-[10px] text-zinc-400">Save big on celebrations. Get ₹200 off for orders exceeding ₹999.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white border px-2.5 py-1 rounded font-bold tracking-wider uppercase text-zinc-800">CELEBRATE200</span>
              <button
                onClick={() => handleCopyCode('CELEBRATE200')}
                className="p-1 hover:bg-zinc-100 text-zinc-500 rounded transition-colors"
                title="Copy Coupon"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
