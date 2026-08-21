'use client';

import React from 'react';

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">Payment Gateways</h3>
        <p className="text-xs text-zinc-500 font-medium">Verify active transactional tunnels.</p>
      </div>

      <div className="space-y-3 max-w-md">
        <div className="p-4 border rounded-2xl flex justify-between items-center bg-zinc-50/50">
          <div>
            <p className="font-bold text-zinc-800">UPI Payments</p>
            <p className="text-[9px] text-zinc-400">GPay, PhonePe, Paytm</p>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">ACTIVE</span>
        </div>

        <div className="p-4 border rounded-2xl flex justify-between items-center bg-zinc-50/50">
          <div>
            <p className="font-bold text-zinc-800">Credit/Debit Cards</p>
            <p className="text-[9px] text-zinc-400">Visa, Mastercard, RuPay</p>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
