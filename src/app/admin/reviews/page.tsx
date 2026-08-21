'use client';

import React, { useState } from 'react';
import { MOCK_REVIEWS } from '../../../data/mockData';
import { Star, Check, X, ShieldAlert, Trash2 } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function AdminReviewsPage() {
  const { showToast } = useToast();
  
  const [reviewsList, setReviewsList] = useState(
    MOCK_REVIEWS.map((r, i) => ({
      id: `rev-${i}`,
      user: r.user,
      productName: 'Artisanal Selection',
      rating: r.rating,
      text: r.text,
      status: 'Approved' as 'Approved' | 'Pending' | 'Flagged'
    }))
  );

  const handleApprove = (id: string) => {
    setReviewsList(reviewsList.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
    showToast('Review approved and visible to customers.', 'success');
  };

  const handleHide = (id: string) => {
    setReviewsList(reviewsList.map(r => r.id === id ? { ...r, status: 'Pending' } : r));
    showToast('Review hidden from catalog storefront.', 'info');
  };

  const handleFlag = (id: string) => {
    setReviewsList(reviewsList.map(r => r.id === id ? { ...r, status: 'Flagged' } : r));
    showToast('Review flagged for content audit.', 'info');
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-xl font-serif font-black text-zinc-900">Customer Reviews</h3>
          <p className="text-xs text-zinc-500 font-medium">Moderate customer product ratings, reviews, and testimonials.</p>
        </div>
      </div>

      {/* Grid listing */}
      <div className="bg-white border border-zinc-200/20 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b text-[9px] font-bold uppercase tracking-wider text-zinc-400 select-none">
              <th className="p-3.5">Reviewer</th>
              <th className="p-3.5">Rating</th>
              <th className="p-3.5">Feedback Comment</th>
              <th className="p-3.5">Moderation Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-zinc-650">
            {reviewsList.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-50/20 transition-all">
                <td className="p-3.5 font-bold text-zinc-800">
                  {r.user}
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-0.5 text-brand-gold">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-[10px] font-extrabold text-zinc-800">{r.rating}</span>
                  </div>
                </td>
                <td className="p-3.5 italic max-w-sm leading-relaxed text-zinc-500">
                  &ldquo;{r.text}&rdquo;
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 
                    r.status === 'Flagged' ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  <div className="flex gap-2 justify-end">
                    {r.status !== 'Approved' && (
                      <button
                        onClick={() => handleApprove(r.id)}
                        className="p-1 text-emerald-600 hover:text-emerald-800"
                        title="Approve Review"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    {r.status !== 'Pending' && (
                      <button
                        onClick={() => handleHide(r.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-650"
                        title="Hide Review"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {r.status !== 'Flagged' && (
                      <button
                        onClick={() => handleFlag(r.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Flag Review"
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
