'use client';

import React from 'react';
import { useProducts } from '../../../context/ProductContext';
import { PRODUCTS as fallbackProducts } from '../../../data/mockData';

export default function AdminInventoryPage() {
  const { products } = useProducts();
  const PRODUCTS = products.length > 0 ? products : fallbackProducts;

  return (
    <div className="space-y-6 text-xs text-left">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">Inventory Logs</h3>
        <p className="text-xs text-zinc-500 font-medium">Verify stock status across all categories.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-zinc-400 uppercase tracking-wider font-semibold">
              <th className="py-2.5">Product Name</th>
              <th className="py-2.5">SKU / ID</th>
              <th className="py-2.5 text-center">Stock Level</th>
              <th className="py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {PRODUCTS.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50/50">
                <td className="py-3 font-bold text-zinc-700">{p.name}</td>
                <td className="py-3 text-zinc-400 text-[10px] uppercase font-mono">{p.wellnessSku || `SKU-VM-${p.id.slice(0, 5).toUpperCase()}`}</td>
                <td className="py-3 text-center text-zinc-500 font-bold">{p.inStock ? (p.reviewCount > 100 ? 'Normal (Quick)' : 'Low Stock (Alert)') : '0 (Replenish)'}</td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    p.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {p.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
