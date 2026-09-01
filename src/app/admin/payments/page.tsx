'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, Search, XCircle } from 'lucide-react';

interface PaymentSubmission {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  status: string;
  utr: string;
  proofImageUrl: string;
  submittedAt: string;
  orderStatus: string;
  orderAmount: number;
}

const statusStyles: Record<string, string> = {
  PAYMENT_VERIFICATION_PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reason, setReason] = useState('');
  const [rejectionTarget, setRejectionTarget] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch payment submissions');
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPayments();
  }, [router]);

  const filteredRows = rows.filter((row) => {
    const matchesText = [row.orderId, row.customerName, row.customerEmail, row.utr, row.status].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
    return matchesText && matchesStatus;
  });

  const approvePayment = async (paymentId: string, orderId: string) => {
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, orderId, action: 'approve' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not approve payment');
      }

      await fetchPayments();
      alert('Payment verified and marked as received.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to verify payment');
    }
  };

  const rejectPayment = async (paymentId: string, orderId: string) => {
    const rejectReason = (reason || 'Payment not received').trim();
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, orderId, action: 'reject', reason: rejectReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not reject payment');
      }

      setRejectionTarget(null);
      setReason('');
      await fetchPayments();
      alert('Payment rejected.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reject payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-black text-zinc-900">Payments</h2>
          <p className="text-sm text-zinc-500">Admin manual UPI verification queue.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order, UTR, customer"
              className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-700 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 border border-zinc-200 rounded-xl text-xs text-zinc-700 bg-white"
          >
            <option value="ALL">All statuses</option>
            <option value="PAYMENT_VERIFICATION_PENDING">Pending Verification</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Pending Verification', value: rows.filter((r) => r.status === 'PAYMENT_VERIFICATION_PENDING').length },
          { label: 'Paid', value: rows.filter((r) => r.status === 'PAID').length },
          { label: 'Rejected', value: rows.filter((r) => r.status === 'REJECTED').length },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{card.label}</p>
            <p className="mt-3 text-2xl font-serif font-black text-zinc-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-zinc-500">Loading payment queue...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">No payment submissions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">UTR</th>
                  <th className="p-3">Proof</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-100 align-top">
                    <td className="p-3">
                      <div className="font-bold text-zinc-900">#{row.orderId}</div>
                      <div className="text-[10px] text-zinc-500">{row.orderStatus}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-900">{row.customerName}</div>
                      <div className="text-[10px] text-zinc-500">{row.customerEmail}</div>
                      <div className="text-[10px] text-zinc-500">{row.customerPhone || '—'}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-900">₹{row.amount}</div>
                      <div className="text-[10px] text-zinc-500">Order ₹{row.orderAmount}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-[11px] text-zinc-800">{row.utr || '—'}</div>
                    </td>
                    <td className="p-3">
                      {row.proofImageUrl ? (
                        <a href={row.proofImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-burgundy font-bold">
                          <Eye className="h-3.5 w-3.5" /> View proof
                        </a>
                      ) : (
                        <span className="text-zinc-400">No proof</span>
                      )}
                    </td>
                    <td className="p-3 text-zinc-500">
                      {row.submittedAt ? new Date(row.submittedAt).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${statusStyles[row.status] || 'bg-zinc-100 text-zinc-700'}`}>
                        {row.status === 'PAYMENT_VERIFICATION_PENDING' ? 'PENDING VERIFICATION' : row.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {row.status === 'PAYMENT_VERIFICATION_PENDING' ? (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => approvePayment(row.id, row.orderId)}
                            className="inline-flex items-center justify-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-lg font-bold"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> PAYMENT RECEIVED
                          </button>
                          <button
                            onClick={() => setRejectionTarget(row.id)}
                            className="inline-flex items-center justify-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg font-bold"
                          >
                            <XCircle className="h-3.5 w-3.5" /> REJECT PAYMENT
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectionTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-black text-zinc-900">Reject Payment</h3>
              <button onClick={() => setRejectionTarget(null)} className="text-zinc-500">✕</button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="text-xs font-bold text-zinc-600">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full border border-zinc-200 rounded-xl p-3 text-xs"
                placeholder="Payment not received / incorrect amount / invalid UTR / duplicate transaction"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRejectionTarget(null)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={() => rejectPayment(rejectionTarget, rows.find((r) => r.id === rejectionTarget)?.orderId || '')} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold">Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
