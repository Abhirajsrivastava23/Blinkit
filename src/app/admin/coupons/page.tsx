'use client';

import React, { useState } from 'react';
import { Plus, Tag, Trash2, X, Check } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function AdminCouponsPage() {
  const { showToast } = useToast();
  
  const [coupons, setCoupons] = useState([
    { id: '1', code: 'FATAFAT10', discount: '10%', type: 'Percentage', minSpend: 'None', status: 'Active' },
    { id: '2', code: 'CELEBRATE200', discount: '₹200', type: 'Flat Amount', minSpend: '₹999', status: 'Active' }
  ]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [type, setType] = useState('Percentage');
  const [minSpend, setMinSpend] = useState('');

  const handleDelete = (id: string, codeName: string) => {
    if (confirm(`Are you sure you want to delete coupon "${codeName}"?`)) {
      setCoupons(coupons.filter(c => c.id !== id));
      showToast('Coupon code deleted successfully.', 'info');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discount) {
      showToast('Please fill out Code and Discount.', 'error');
      return;
    }

    const newCoupon = {
      id: `coupon-${Date.now()}`,
      code: code.toUpperCase().trim(),
      discount: type === 'Percentage' ? `${discount}%` : `₹${discount}`,
      type,
      minSpend: minSpend ? `₹${minSpend}` : 'None',
      status: 'Active'
    };

    setCoupons([...coupons, newCoupon]);
    showToast('New coupon code created!', 'success');
    setIsFormOpen(false);
    setCode('');
    setDiscount('');
    setMinSpend('');
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-xl font-serif font-black text-zinc-900">Promo Coupons</h3>
          <p className="text-xs text-zinc-500 font-medium">Configure active coupon discount parameters and thresholds.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1 shadow"
        >
          <Plus className="h-4 w-4" /> Create Coupon
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {coupons.map((c) => (
          <div key={c.id} className="bg-white border border-zinc-200/20 p-5 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between hover:border-brand-burgundy/10 transition-colors">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="p-2 bg-brand-burgundy/5 text-brand-burgundy rounded-xl">
                  <Tag className="h-4.5 w-4.5" />
                </span>
                <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-green-50 text-green-700">
                  {c.status}
                </span>
              </div>
              <h4 className="font-serif font-black text-sm text-zinc-900 pt-1">{c.code}</h4>
              <div className="text-zinc-550 space-y-1 text-[10px] leading-relaxed font-medium">
                <p>Benefit: <strong className="text-zinc-800">{c.discount} OFF</strong></p>
                <p>Discount Type: {c.type}</p>
                <p>Minimum Spend: {c.minSpend}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t">
              <button
                onClick={() => handleDelete(c.id, c.code)}
                className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                title="Delete coupon"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-serif font-extrabold text-zinc-800">Create New Coupon</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1.5 hover:bg-zinc-100 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Promo Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FATAFAT30"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Benefit Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:outline-none"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Discount Value *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Minimum Order Spend (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 499"
                  value={minSpend}
                  onChange={(e) => setMinSpend(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 border rounded-xl hover:bg-zinc-50 transition-colors font-bold uppercase tracking-wider text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark rounded-xl transition-all shadow font-serif font-bold uppercase tracking-wider text-[10px]"
                >
                  Create Code
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
