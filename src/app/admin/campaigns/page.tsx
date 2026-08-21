'use client';

import React from 'react';
import { Sparkles, Megaphone, Plus } from 'lucide-react';

export default function CampaignsPage() {
  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif font-black text-zinc-900 leading-none">Marketing Campaigns</h2>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Manage push promotions, newsletter targets, and deals.</p>
        </div>
        <button
          onClick={() => alert('New Campaign form is coming soon!')}
          className="px-4 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold uppercase tracking-wider rounded-xl text-[10px] flex items-center gap-1.5 shadow"
        >
          <Plus className="h-4 w-4" /> Create Campaign
        </button>
      </div>

      <div className="bg-white border rounded-3xl p-8 shadow-sm text-center min-h-[300px] flex items-center justify-center text-zinc-400">
        <div className="space-y-2 max-w-sm">
          <Megaphone className="h-8 w-8 mx-auto text-brand-burgundy/40" />
          <p className="font-bold text-zinc-700">No active campaigns</p>
          <p className="text-[10px] text-zinc-450 leading-relaxed font-medium">
            Draft campaigns to promote seasonal designer cakes or festive floral packages to Gurugram users.
          </p>
        </div>
      </div>
    </div>
  );
}
