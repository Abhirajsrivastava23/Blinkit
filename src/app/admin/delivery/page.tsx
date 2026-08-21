'use client';

import React from 'react';

export default function AdminDeliveryPage() {
  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">Delivery Logistics Settings</h3>
        <p className="text-xs text-zinc-500 font-medium">Configure delivery runner fees and midnight surcharges.</p>
      </div>

      <div className="p-4 border rounded-2xl bg-zinc-50/50 space-y-3 max-w-md">
        <div className="flex justify-between py-1 border-b">
          <span className="font-bold text-zinc-600">Standard Delivery Charge</span>
          <span className="font-extrabold">₹49</span>
        </div>
        <div className="flex justify-between py-1 border-b">
          <span className="font-bold text-zinc-600">Free Delivery Threshold</span>
          <span className="font-extrabold">₹799</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="font-bold text-zinc-600">Midnight Delivery surcharge</span>
          <span className="font-extrabold">₹99</span>
        </div>
      </div>
    </div>
  );
}
