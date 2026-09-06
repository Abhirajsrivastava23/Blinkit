'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  X,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  User,
  PackageCheck,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/components/Toast';

interface RefundItem {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REFUNDED' | 'REJECTED' | 'FAILED';
  adminReason?: string;
  razorpayPaymentId?: string;
  razorpayRefundId?: string;
  errorMessage?: string;
  requestedAt: string;
  reviewedAt?: string;
  refundedAt?: string;
  order?: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    total: number;
    status: string;
    paymentStatus: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
}

export default function ReturnsPage() {
  const { showToast } = useToast();
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Action Modals
  const [approveModalItem, setApproveModalItem] = useState<RefundItem | null>(null);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [rejectModalItem, setRejectModalItem] = useState<RefundItem | null>(null);
  const [rejectReason, setRejectReason] = useState('Item delivered safely with verification proof');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [detailModalItem, setDetailModalItem] = useState<RefundItem | null>(null);

  const fetchRefunds = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/refunds', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.refundRequests)) {
          setRefunds(data.refundRequests);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin refunds:', err);
    } finally {
      setLoading(false);
      if (showIndicator) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchRefunds();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchRefunds]);

  // Statistics
  const stats = useMemo(() => {
    const total = refunds.length;
    const pending = refunds.filter((r) => r.status === 'PENDING').length;
    const refunded = refunds.filter((r) => r.status === 'REFUNDED');
    const refundedCount = refunded.length;
    const refundedAmount = refunded.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const rejected = refunds.filter((r) => r.status === 'REJECTED').length;
    const failed = refunds.filter((r) => r.status === 'FAILED').length;

    return { total, pending, refundedCount, refundedAmount, rejected, failed };
  }, [refunds]);

  // Filtered Refunds
  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const oid = String(r.orderId || '').toLowerCase();
        const reason = String(r.reason || '').toLowerCase();
        const notes = String(r.notes || '').toLowerCase();
        const cName = String(r.order?.customerName || '').toLowerCase();
        const cEmail = String(r.order?.customerEmail || '').toLowerCase();
        const cMobile = String(r.order?.customerMobile || '').toLowerCase();
        const pid = String(r.razorpayPaymentId || '').toLowerCase();
        const rid = String(r.razorpayRefundId || '').toLowerCase();

        return (
          oid.includes(query) ||
          reason.includes(query) ||
          notes.includes(query) ||
          cName.includes(query) ||
          cEmail.includes(query) ||
          cMobile.includes(query) ||
          pid.includes(query) ||
          rid.includes(query)
        );
      }

      return true;
    });
  }, [refunds, statusFilter, searchQuery]);

  // Handle Approve
  const handleConfirmApprove = async () => {
    if (!approveModalItem) return;
    setApproving(true);
    setApproveError(null);

    try {
      const res = await fetch(`/api/admin/refunds/${encodeURIComponent(approveModalItem.id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok) {
        setApproveError(data.error || 'Failed to process refund through Razorpay.');
        setApproving(false);
        return;
      }

      showToast(`Refund of ₹${approveModalItem.amount} approved & processed via Razorpay!`, 'success');
      setApproveModalItem(null);
      await fetchRefunds(true);
    } catch (err: any) {
      setApproveError(err.message || 'Network error during refund approval.');
    } finally {
      setApproving(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    setRejecting(true);
    setRejectError(null);

    try {
      const finalReason = rejectNotes.trim()
        ? `${rejectReason} - ${rejectNotes.trim()}`
        : rejectReason;

      const res = await fetch(`/api/admin/refunds/${encodeURIComponent(rejectModalItem.id)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason })
      });

      const data = await res.json();
      if (!res.ok) {
        setRejectError(data.error || 'Failed to reject refund request.');
        setRejecting(false);
        return;
      }

      showToast('Refund request rejected.', 'info');
      setRejectModalItem(null);
      await fetchRefunds(true);
    } catch (err: any) {
      setRejectError(err.message || 'Network error during refund rejection.');
    } finally {
      setRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
            Approved (Processing)
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Refunded
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
            <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
            Rejected
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            Gateway Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-burgundy/10 text-brand-burgundy rounded-xl">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-black text-zinc-900 leading-tight">
                Refund Requests & Returns
              </h1>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Manage, review, and execute server-side Razorpay refunds in real-time.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchRefunds(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Review */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Review</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-700 rounded-lg">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{stats.pending}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-0.5">Awaiting admin decision</p>
        </div>

        {/* Total Refunded */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Refunded</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-700 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">₹{stats.refundedAmount.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{stats.refundedCount} payments refunded</p>
        </div>

        {/* Total Requests */}
        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Total Claims</span>
            <div className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 mt-2">{stats.total}</p>
          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">All time requests</p>
        </div>

        {/* Rejected / Failed */}
        <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Rejected / Failed</span>
            <div className="p-1.5 bg-rose-500/10 text-rose-700 rounded-lg">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-900 mt-2">{stats.rejected + stats.failed}</p>
          <p className="text-[11px] text-rose-700 font-medium mt-0.5">{stats.rejected} rejected • {stats.failed} failed</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Requests', count: stats.total },
            { id: 'PENDING', label: 'Pending Review', count: stats.pending },
            { id: 'REFUNDED', label: 'Refunded', count: stats.refundedCount },
            { id: 'REJECTED', label: 'Rejected', count: stats.rejected },
            { id: 'FAILED', label: 'Failed / Retry', count: stats.failed }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-brand-burgundy text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order, customer, reason, payment ID..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:bg-white focus:border-brand-burgundy outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Refunds Table / Card View */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-3 border-brand-burgundy border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-zinc-500 font-medium">Loading refund requests...</p>
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center shadow-xs">
          <div className="max-w-sm mx-auto space-y-3">
            <div className="p-3 bg-zinc-100 rounded-full w-fit mx-auto text-zinc-400">
              <RotateCcw className="h-8 w-8" />
            </div>
            <h3 className="font-serif font-black text-lg text-zinc-900">No Refund Requests Found</h3>
            <p className="text-xs text-zinc-500 font-medium leading-relaxed">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No refund claims match your active filters. Try clearing the search query or selecting another status tab.'
                : 'There are no active customer refund claims or return requests at this time.'}
            </p>
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="mt-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Order ID & Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Refund Amount</th>
                  <th className="py-3.5 px-4">Reason & Notes</th>
                  <th className="py-3.5 px-4">Payment & Gateway</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                {filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-zinc-50/80 transition-colors">
                    {/* Order ID & Date */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-0.5">
                        <Link
                          href={`/admin/orders?search=${encodeURIComponent(refund.orderId)}`}
                          className="font-bold text-brand-burgundy hover:underline flex items-center gap-1 group"
                        >
                          <span>#{refund.orderId}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <p className="text-[11px] text-zinc-400">
                          {new Date(refund.requestedAt).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-0.5">
                        <p className="font-bold text-zinc-900">{refund.order?.customerName || refund.customerId}</p>
                        <p className="text-[11px] text-zinc-500">{refund.order?.customerEmail || '—'}</p>
                        {refund.order?.customerMobile && (
                          <p className="text-[11px] text-zinc-400 font-mono">+91 {refund.order.customerMobile}</p>
                        )}
                      </div>
                    </td>

                    {/* Refund Amount */}
                    <td className="py-4 px-4 align-top">
                      <div>
                        <span className="font-black text-sm text-zinc-900">
                          ₹{Number(refund.amount || 0).toLocaleString('en-IN')}
                        </span>
                        <p className="text-[10px] text-zinc-400 font-medium">100% Order Value</p>
                      </div>
                    </td>

                    {/* Reason & Notes */}
                    <td className="py-4 px-4 align-top max-w-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-zinc-900 text-xs">{refund.reason}</p>
                        {refund.notes && (
                          <p className="text-[11px] text-zinc-500 line-clamp-2 italic bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                            &quot;{refund.notes}&quot;
                          </p>
                        )}
                        {refund.adminReason && refund.status === 'REJECTED' && (
                          <p className="text-[11px] text-red-600 font-medium">
                            Admin Note: {refund.adminReason}
                          </p>
                        )}
                        {refund.errorMessage && refund.status === 'FAILED' && (
                          <p className="text-[11px] text-rose-600 font-mono bg-rose-50 p-1 rounded">
                            Error: {refund.errorMessage}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Payment & Gateway */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        {refund.razorpayPaymentId ? (
                          <div className="font-mono text-[11px] text-zinc-600 flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[130px]" title={refund.razorpayPaymentId}>
                              {refund.razorpayPaymentId}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">No Payment ID</span>
                        )}

                        {refund.razorpayRefundId && (
                          <div className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
                            Ref: {refund.razorpayRefundId}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 align-top">
                      {getStatusBadge(refund.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        {refund.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setApproveModalItem(refund);
                                setApproveError(null);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Approve and execute Razorpay Refund"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectModalItem(refund);
                                setRejectReason('Item delivered safely with verification proof');
                                setRejectNotes('');
                                setRejectError(null);
                              }}
                              className="px-3 py-1.5 bg-zinc-100 hover:bg-red-50 text-zinc-700 hover:text-red-700 border border-zinc-200 hover:border-red-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                              title="Reject refund request"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {refund.status === 'FAILED' && (
                          <button
                            onClick={() => {
                              setApproveModalItem(refund);
                              setApproveError(null);
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Retry Razorpay Refund"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Retry Refund</span>
                          </button>
                        )}

                        <button
                          onClick={() => setDetailModalItem(refund)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                          title="View complete details"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPROVAL CONFIRMATION MODAL */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-zinc-900">Approve & Execute Refund</h3>
                  <p className="text-xs text-zinc-500">Order #{approveModalItem.orderId}</p>
                </div>
              </div>
              <button
                onClick={() => setApproveModalItem(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {approveError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{approveError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs text-zinc-700">
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-600">Refund Amount:</span>
                  <span className="font-black text-emerald-800 text-base">₹{Number(approveModalItem.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-600">Customer:</span>
                  <span className="font-medium text-zinc-800">{approveModalItem.order?.customerName || approveModalItem.customerId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-600">Payment ID:</span>
                  <span className="font-mono text-[11px] text-zinc-700">{approveModalItem.razorpayPaymentId || 'Server-stored Payment ID'}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                <p className="font-bold text-zinc-800">Claim Reason:</p>
                <p className="text-zinc-600 italic">&quot;{approveModalItem.reason}&quot;</p>
                {approveModalItem.notes && (
                  <p className="text-[11px] text-zinc-500 mt-1">Note: {approveModalItem.notes}</p>
                )}
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                ⚡ <strong>Instant Gateway Execution:</strong> Approving will immediately invoke the server-side Razorpay Refund API (`/v1/payments/{approveModalItem.razorpayPaymentId || '{id}'}/refund`). The funds will be returned to the customer&apos;s source account.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                className="flex-1 py-2.5 px-4 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {approving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing Gateway...</span>
                  </>
                ) : (
                  <span>Confirm & Refund Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 text-red-800 rounded-xl">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-zinc-900">Reject Refund Request</h3>
                  <p className="text-xs text-zinc-500">Order #{rejectModalItem.orderId}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {rejectError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{rejectError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide block">
                  Select Rejection Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:border-brand-burgundy outline-none bg-white font-medium"
                >
                  <option value="Item delivered safely with verification proof">Item delivered safely with verification proof</option>
                  <option value="Damage claim investigated and unverified">Damage claim investigated and unverified</option>
                  <option value="Request submitted past eligible return timeframe">Request submitted past eligible return timeframe</option>
                  <option value="Duplicate refund claim already addressed">Duplicate refund claim already addressed</option>
                  <option value="Customer cancelled return logistics">Customer cancelled return logistics</option>
                  <option value="Other administrative reason">Other administrative reason</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide block">
                  Admin Internal/Customer Note (Optional)
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Additional context explaining why this refund cannot be processed..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:border-brand-burgundy outline-none resize-none font-medium placeholder-zinc-400"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="flex-1 py-2.5 px-4 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {rejecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Reject Refund</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-burgundy/10 text-brand-burgundy rounded-xl">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-zinc-900">Refund Claim Details</h3>
                  <p className="text-xs text-zinc-500">Claim ID: {detailModalItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status Header */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-zinc-600">Current Status:</span>
                {getStatusBadge(detailModalItem.status)}
              </div>

              {/* Order and Customer Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                  <p className="font-bold text-zinc-500 uppercase text-[10px]">Order ID</p>
                  <p className="font-serif font-bold text-sm text-brand-burgundy">#{detailModalItem.orderId}</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                  <p className="font-bold text-zinc-500 uppercase text-[10px]">Amount</p>
                  <p className="font-bold text-sm text-zinc-900">₹{Number(detailModalItem.amount).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Customer */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                <p className="font-bold text-zinc-500 uppercase text-[10px]">Customer Information</p>
                <p className="font-bold text-zinc-800">{detailModalItem.order?.customerName || detailModalItem.customerId}</p>
                <p className="text-zinc-600">{detailModalItem.order?.customerEmail || '—'}</p>
                {detailModalItem.order?.customerMobile && (
                  <p className="font-mono text-zinc-500">+91 {detailModalItem.order.customerMobile}</p>
                )}
              </div>

              {/* Reason */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                <p className="font-bold text-zinc-500 uppercase text-[10px]">Customer Reason</p>
                <p className="font-bold text-zinc-900">{detailModalItem.reason}</p>
                {detailModalItem.notes && (
                  <p className="text-zinc-600 italic bg-white p-2 rounded-lg border border-zinc-200 mt-1">
                    &quot;{detailModalItem.notes}&quot;
                  </p>
                )}
              </div>

              {/* Razorpay Information */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1 font-mono text-[11px]">
                <p className="font-bold font-sans text-zinc-500 uppercase text-[10px]">Gateway Identifiers</p>
                <p><span className="text-zinc-400">Payment ID:</span> {detailModalItem.razorpayPaymentId || 'None'}</p>
                {detailModalItem.razorpayRefundId && (
                  <p><span className="text-zinc-400">Refund ID:</span> <span className="text-emerald-700 font-bold">{detailModalItem.razorpayRefundId}</span></p>
                )}
              </div>

              {/* Admin Note if present */}
              {detailModalItem.adminReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-red-900">
                  <p className="font-bold uppercase text-[10px] text-red-700">Admin Rejection Reason</p>
                  <p className="font-medium">{detailModalItem.adminReason}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
