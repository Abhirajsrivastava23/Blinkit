'use client';

import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-serif font-black text-zinc-900 leading-none">Returns & Refunds</h2>
        <p className="text-xs text-zinc-500 mt-1 font-medium">Process customer refund claims and rider damage tickets.</p>
      </div>

      <div className="bg-white border rounded-3xl p-8 shadow-sm text-center min-h-[300px] flex items-center justify-center text-zinc-400">
        <div className="space-y-2 max-w-sm">
          <ShieldAlert className="h-8 w-8 mx-auto text-brand-burgundy/40" />
          <p className="font-bold text-zinc-700">No active refund tickets</p>
          <p className="text-[10px] text-zinc-450 leading-relaxed font-medium">
            All customer refund requests and returned order logistics are processed.
          </p>
        </div>
      </div>
    </div>
  );
}
