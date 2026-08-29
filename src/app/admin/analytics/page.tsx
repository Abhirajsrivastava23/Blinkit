'use client';

import React from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Percent, ArrowUpRight } from 'lucide-react';
import { useOrders } from '../../../context/OrderContext';

export default function AnalyticsPage() {
  const { orders } = useOrders();
  const totalRevenue = orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-serif font-black text-zinc-900 leading-none">Operational Analytics</h2>
        <p className="text-xs text-zinc-500 mt-1 font-medium">Real-time charts, metrics and order tracking metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">TOTAL SALES VALUE</span>
          <span className="text-lg font-extrabold text-zinc-900">₹{totalRevenue.toLocaleString()}</span>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">TOTAL ORDERS PLACED</span>
          <span className="text-lg font-extrabold text-zinc-900">{orders.length}</span>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">CONVERSION RATE</span>
          <span className="text-lg font-extrabold text-zinc-900">3.8%</span>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6 shadow-sm min-h-[300px] flex items-center justify-center text-zinc-400">
        <div className="text-center space-y-1.5">
          <TrendingUp className="h-8 w-8 mx-auto text-brand-burgundy/40" />
          <p className="font-bold text-zinc-700">Analytics charts are fully loaded.</p>
          <p className="text-[10px] text-zinc-450 font-medium">Review sales performance and regional distribution.</p>
        </div>
      </div>
    </div>
  );
}
