'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, XCircle, Search, Eye, Copy, Check, Clock, 
  AlertTriangle, RefreshCw, ShieldCheck, ExternalLink, Filter, 
  ArrowUpRight, ShoppingBag, X, ZoomIn, FileText, ChevronRight, User, Phone, Mail
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import SafeImage from '../../../components/SafeImage';

export interface PaymentItem {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  status: string;
  orderStatus: string;
  utr: string;
  proofImageUrl: string;
  submittedAt: string;
  orderCreatedAt?: string;
  itemsCount?: number;
  items?: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    unit?: string;
  }>;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  deliveryLocationName?: string;
  deliveryOption?: string;
}

const REJECTION_PRESETS = [
  'UTR not found in bank statement / transaction feed.',
  'Amount received does not match order total.',
  'Duplicate payment screenshot submitted.',
  'Screenshot is blurry or unreadable.',
  'Transaction was reversed or cancelled by bank.'
];

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [rows, setRows] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'PAID' | 'REJECTED' | 'ALL'>('PENDING');

  // Modal states
  const [selectedProof, setSelectedProof] = useState<PaymentItem | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<PaymentItem | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<PaymentItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Action in-flight states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const fetchPayments = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const res = await fetch('/api/payments', { cache: 'no-store' });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/admin/login');
          return;
        }
        throw new Error(`Failed to retrieve payment records (${res.status})`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setRows(data);
      }
    } catch (err) {
      console.error('Error fetching payments in admin:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  // Initial fetch and auto-polling every 1.5 seconds when active/visible
  useEffect(() => {
    void fetchPayments(false);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchPayments(true);
    }, 1500);

    return () => clearInterval(interval);
  }, [fetchPayments]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    showToast(`Copied: ${text}`, 'info');
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  const handleApprove = async (item: PaymentItem) => {
    if (actionInProgress) return;
    try {
      setActionInProgress(item.orderId);
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: item.id,
          orderId: item.orderId,
          action: 'approve'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve payment');
      }

      showToast(`Payment approved for Order #${item.orderId}. Order Confirmed!`, 'success');
      setApprovalTarget(null);
      setSelectedProof(null);
      
      // Optimistic local update
      setRows(prev => prev.map(r => r.orderId === item.orderId ? { ...r, status: 'PAID', orderStatus: 'Confirmed' } : r));
      await fetchPayments(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error approving payment';
      showToast(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionTarget || actionInProgress) return;
    const finalReason = (rejectionReason || 'Payment verification failed. Please check details and resubmit.').trim();

    if (!finalReason) {
      showToast('Please provide a reason for rejecting this payment.', 'error');
      return;
    }

    try {
      setActionInProgress(rejectionTarget.orderId);
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: rejectionTarget.id,
          orderId: rejectionTarget.orderId,
          action: 'reject',
          reason: finalReason
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject payment');
      }

      showToast(`Payment rejected for Order #${rejectionTarget.orderId}. Customer notified.`, 'info');
      setRejectionTarget(null);
      setRejectionReason('');
      setSelectedProof(null);

      // Optimistic local update
      setRows(prev => prev.map(r => r.orderId === rejectionTarget.orderId ? { ...r, status: 'REJECTED', rejectionReason: finalReason } : r));
      await fetchPayments(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error rejecting payment';
      showToast(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Counts for tabs
  const pendingCount = rows.filter(r => r.status === 'PAYMENT_VERIFICATION_PENDING').length;
  const paidCount = rows.filter(r => r.status === 'PAID').length;
  const rejectedCount = rows.filter(r => r.status === 'REJECTED').length;
  const pendingAmount = rows.filter(r => r.status === 'PAYMENT_VERIFICATION_PENDING').reduce((sum, r) => sum + (r.amount || 0), 0);

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (activeTab === 'PENDING' && r.status !== 'PAYMENT_VERIFICATION_PENDING') return false;
    if (activeTab === 'PAID' && r.status !== 'PAID') return false;
    if (activeTab === 'REJECTED' && r.status !== 'REJECTED') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchOrder = String(r.orderId || '').toLowerCase().includes(q);
      const matchUtr = String(r.utr || '').toLowerCase().includes(q);
      const matchName = String(r.customerName || '').toLowerCase().includes(q);
      const matchEmail = String(r.customerEmail || '').toLowerCase().includes(q);
      const matchPhone = String(r.customerPhone || '').toLowerCase().includes(q);
      const matchAmount = String(r.amount || '').includes(q);
      return matchOrder || matchUtr || matchName || matchEmail || matchPhone || matchAmount;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-black text-zinc-900 tracking-tight">
              Payment Verification Queue
            </h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                {pendingCount} PENDING
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Review customer UPI screenshots, match 12-digit UTR against bank feeds, and approve or reject orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchPayments(false)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${isRefreshing ? 'animate-spin text-brand-burgundy' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Live Polling Active
          </span>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Pending Approvals</span>
          <div className="text-2xl font-serif font-black text-amber-950 mt-1 flex items-baseline gap-1.5">
            {pendingCount}
            <span className="text-xs font-medium text-amber-700">orders</span>
          </div>
          <p className="text-[10px] text-amber-800/80 font-bold mt-1">Needs verification</p>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Pending Amount</span>
          <div className="text-2xl font-serif font-black text-zinc-900 mt-1">
            ₹{pendingAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-zinc-400 font-medium mt-1">Total pending cash</p>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Approved Payments</span>
          <div className="text-2xl font-serif font-black text-emerald-950 mt-1">
            {paidCount}
          </div>
          <p className="text-[10px] text-emerald-700 font-bold mt-1">Confirmed & Processing</p>
        </div>

        <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Rejected Proofs</span>
          <div className="text-2xl font-serif font-black text-rose-950 mt-1">
            {rejectedCount}
          </div>
          <p className="text-[10px] text-rose-700 font-bold mt-1">Returned for correction</p>
        </div>
      </div>

      {/* 3. TABS AND SEARCH FILTER */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-zinc-950 shadow-xs font-black'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'PENDING' ? 'bg-zinc-950 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('PAID')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PAID'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Approved ({paidCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Rejected ({rejectedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <span>All ({rows.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order, UTR, Customer, Mobile..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-burgundy/20 focus:bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN VERIFICATION CARDS / QUEUE */}
      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-3 border-brand-burgundy border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-zinc-700">Loading Payment Queue...</p>
          <p className="text-xs text-zinc-400">Fetching latest payment submissions and proof images</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-base font-serif font-bold text-zinc-800">
            {activeTab === 'PENDING' ? 'All caught up! No pending payments.' : 'No transactions found.'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {activeTab === 'PENDING' 
              ? 'When customers submit UPI payment proofs, they will automatically appear here for verification in real time.'
              : 'Try clearing your search query or switching tabs.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRows.map((item) => {
            const isPending = item.status === 'PAYMENT_VERIFICATION_PENDING';
            const isPaid = item.status === 'PAID';
            const isRejected = item.status === 'REJECTED';
            const isBusy = actionInProgress === item.orderId;

            return (
              <div 
                key={item.id} 
                className={`bg-white border rounded-2xl p-5 shadow-2xs transition-all hover:shadow-md ${
                  isPending 
                    ? 'border-amber-300 ring-1 ring-amber-200/60 bg-gradient-to-r from-white via-white to-amber-50/30' 
                    : isPaid
                    ? 'border-emerald-200 bg-white'
                    : 'border-rose-200 bg-white'
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-5 justify-between">
                  
                  {/* Left Column: Order & Customer Meta */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link 
                        href={`/admin/orders/${item.orderId}`}
                        className="text-sm font-bold text-brand-burgundy hover:underline flex items-center gap-1"
                      >
                        <span>Order #{item.orderId}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPending 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : isPaid 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {isPending ? 'Pending Verification' : isPaid ? 'Paid & Confirmed' : 'Rejected'}
                      </span>

                      <span className="text-[11px] text-zinc-400">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleString('en-IN') : 'Just now'}
                      </span>
                    </div>

                    {/* Customer & Location Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-800 font-semibold">
                        <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>{item.customerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>{item.customerPhone || 'Mobile not provided'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{item.customerEmail || 'Email not provided'}</span>
                      </div>
                      <div className="text-zinc-600 font-medium">
                        📍 {item.deliveryLocationName || 'Nawabganj, Unnao'}
                      </div>
                    </div>

                    {/* Rejection Reason display if rejected */}
                    {isRejected && item.rejectionReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-0.5">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-rose-600">Rejection Reason Given:</span>
                        <p>{item.rejectionReason}</p>
                      </div>
                    )}

                    {/* Verified Details display if paid */}
                    {isPaid && item.verifiedBy && (
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Verified by {item.verifiedBy} {item.verifiedAt ? `on ${new Date(item.verifiedAt).toLocaleTimeString('en-IN')}` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Amount, UTR & Screenshot */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t sm:border-t-0 sm:border-l border-zinc-100 pt-3 sm:pt-0 sm:pl-5">
                    
                    {/* Amount & UTR Block */}
                    <div className="space-y-2 min-w-[170px]">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Amount Paid</span>
                        <div className="text-2xl font-serif font-black text-zinc-900">
                          ₹{item.amount}
                        </div>
                      </div>

                      {/* UTR Box */}
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 space-y-1">
                        <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-wider block">12-Digit UTR</span>
                        <div className="flex items-center justify-between gap-2">
                          <code className="font-mono text-xs font-bold text-zinc-900 select-all">
                            {item.utr || 'NOT PROVIDED'}
                          </code>
                          {item.utr && (
                            <button
                              onClick={() => handleCopy(item.utr, item.id)}
                              className="p-1 text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 rounded-md transition-colors cursor-pointer"
                              title="Copy UTR"
                            >
                              {copiedUtr === item.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Screenshot Thumbnail Preview */}
                    <div className="flex flex-col items-center gap-1.5">
                      {item.proofImageUrl ? (
                        <div 
                          onClick={() => setSelectedProof(item)}
                          className="relative h-24 w-24 rounded-xl overflow-hidden border-2 border-zinc-200 bg-zinc-100 cursor-pointer group shadow-2xs hover:border-brand-burgundy transition-all"
                        >
                          {/* Proof Image */}
                          <SafeImage 
                            src={item.proofImageUrl} 
                            alt={`Proof for #${item.orderId}`} 
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                            <ZoomIn className="h-5 w-5" />
                            <span className="text-[9px] font-bold mt-1">Preview</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 w-24 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex flex-col items-center justify-center text-zinc-400 text-[10px] text-center p-2">
                          <FileText className="h-5 w-5 mb-1" />
                          <span>No Image Proof</span>
                        </div>
                      )}

                      {item.proofImageUrl && (
                        <button
                          onClick={() => setSelectedProof(item)}
                          className="text-[11px] font-bold text-brand-burgundy hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" /> View Proof
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex sm:flex-col justify-end gap-2 border-t sm:border-t-0 sm:border-l border-zinc-100 pt-3 sm:pt-0 sm:pl-5 min-w-[160px]">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => setApprovalTarget(item)}
                          disabled={isBusy}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span>Approve Payment</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectionTarget(item);
                            setRejectionReason('');
                          }}
                          disabled={isBusy}
                          className="flex-1 sm:flex-none px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-right sm:text-center text-xs text-zinc-400 font-medium py-2">
                        {isPaid ? (
                          <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Payment Received
                          </span>
                        ) : (
                          <span className="text-rose-700 font-bold flex items-center justify-center gap-1">
                            <XCircle className="h-4 w-4 text-rose-600" /> Rejected
                          </span>
                        )}
                        <Link 
                          href={`/admin/orders/${item.orderId}`}
                          className="mt-2 block text-[11px] text-zinc-500 hover:text-brand-burgundy font-bold underline"
                        >
                          View Order
                        </Link>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. LIGHTBOX / PROOF PREVIEW MODAL                                         */}
      {/* ========================================================================= */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="font-serif font-black text-base text-zinc-900">
                  Payment Proof — Order #{selectedProof.orderId}
                </h3>
                <p className="text-xs text-zinc-500">
                  Customer: {selectedProof.customerName} · Total: ₹{selectedProof.amount}
                </p>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-1.5 rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Image Area */}
            <div className="flex-1 overflow-auto p-4 bg-zinc-950 flex items-center justify-center min-h-[300px]">
              {selectedProof.proofImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={selectedProof.proofImageUrl} 
                  alt="Payment Proof Screenshot" 
                  className="max-h-[60vh] max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-zinc-500 text-xs">No image available</div>
              )}
            </div>

            {/* Modal Footer with Details & Quick Actions */}
            <div className="p-4 bg-white border-t border-zinc-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 block">Submitted UTR</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="font-mono font-bold text-zinc-900 text-sm select-all">{selectedProof.utr || 'None'}</code>
                    {selectedProof.utr && (
                      <button
                        onClick={() => handleCopy(selectedProof.utr, 'modal')}
                        className="p-1 text-zinc-500 hover:text-zinc-900 bg-white border rounded cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 block">Submission Time</span>
                  <span className="font-semibold text-zinc-800">
                    {selectedProof.submittedAt ? new Date(selectedProof.submittedAt).toLocaleString('en-IN') : 'N/A'}
                  </span>
                </div>

                <a
                  href={selectedProof.proofImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-burgundy hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Full Resolution
                </a>
              </div>

              {selectedProof.status === 'PAYMENT_VERIFICATION_PENDING' && (
                <div className="flex gap-3 justify-end pt-1">
                  <button
                    onClick={() => {
                      setRejectionTarget(selectedProof);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2.5 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject Payment
                  </button>

                  <button
                    onClick={() => handleApprove(selectedProof)}
                    disabled={Boolean(actionInProgress)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Confirm Order
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. APPROVAL CONFIRMATION MODAL                                            */}
      {/* ========================================================================= */}
      {approvalTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-serif font-black text-zinc-900">
                  Confirm Payment Approval
                </h3>
                <p className="text-xs text-zinc-500">Order #{approvalTarget.orderId}</p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Customer</span>
                <span className="font-bold text-zinc-800">{approvalTarget.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount to Confirm</span>
                <span className="font-black text-emerald-700">₹{approvalTarget.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">UTR / Ref</span>
                <span className="font-mono font-bold text-zinc-800">{approvalTarget.utr || 'N/A'}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Approving this payment will mark the payment as <strong>PAID</strong>, change order status to <strong>Confirmed</strong>, and immediately update the customer&apos;s active screen.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setApprovalTarget(null)}
                className="px-4 py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(approvalTarget)}
                disabled={Boolean(actionInProgress)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {actionInProgress ? 'Processing...' : 'Confirm & Mark Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. REJECTION MODAL WITH PRESET REASONS                                     */}
      {/* ========================================================================= */}
      {rejectionTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-black text-zinc-900">
                    Reject Payment Proof
                  </h3>
                  <p className="text-xs text-zinc-500">Order #{rejectionTarget.orderId} · Amount: ₹{rejectionTarget.amount}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectionTarget(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-700 block">
                Select or Enter Rejection Reason <span className="text-rose-600">*</span>
              </label>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {REJECTION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-colors cursor-pointer ${
                      rejectionReason === preset
                        ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why the payment proof was rejected so the customer can correct it..."
                className="w-full border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <p className="text-[11px] text-zinc-500">
              The customer will immediately see this rejection reason on their payment page and will be provided an option to re-enter their UTR and re-upload screenshot.
            </p>

            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-100">
              <button
                onClick={() => setRejectionTarget(null)}
                className="px-4 py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={Boolean(actionInProgress) || !rejectionReason.trim()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {actionInProgress ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
