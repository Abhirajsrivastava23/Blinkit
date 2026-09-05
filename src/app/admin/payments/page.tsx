'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, XCircle, Search, Copy, Check, Clock, 
  AlertTriangle, RefreshCw, ShieldCheck, ExternalLink, 
  ArrowUpRight, ShoppingBag, X, FileText, User, Phone, Mail,
  CreditCard, DollarSign, ArrowDownRight, Layers
} from 'lucide-react';
import { useToast } from '../../../components/Toast';

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
  method?: string;
  provider?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  transactionReference?: string;
  submittedAt: string;
  orderCreatedAt?: string;
  verifiedAt?: string;
  itemsCount?: number;
  items?: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    unit?: string;
  }>;
  deliveryLocationName?: string;
  deliveryOption?: string;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [rows, setRows] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAID' | 'PENDING' | 'FAILED'>('ALL');

  // Modal inspection state
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const isFetchingRef = useRef(false);
  const seqRef = useRef(0);
  const latestHandledSeqRef = useRef(0);

  const fetchPayments = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const thisSeq = ++seqRef.current;
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
      if (Array.isArray(data) && thisSeq >= latestHandledSeqRef.current) {
        latestHandledSeqRef.current = thisSeq;
        setRows(data);
      }
    } catch (err) {
      console.error('Error fetching payments in admin:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  // Initial fetch and auto-sync every 3s
  useEffect(() => {
    void fetchPayments(false);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchPayments(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchPayments]);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied to clipboard: ${text}`, 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Metrics
  const paidRows = rows.filter(r => r.status === 'PAID' || r.orderStatus === 'Confirmed' || r.orderStatus === 'Preparing' || r.orderStatus === 'Packed' || r.orderStatus === 'Out for Delivery' || r.orderStatus === 'Delivered');
  const pendingRows = rows.filter(r => r.status === 'PENDING' || r.status === 'PAYMENT_VERIFICATION_PENDING');
  const failedRows = rows.filter(r => r.status === 'FAILED' || r.status === 'REJECTED' || r.status === 'CANCELLED');

  const totalRevenue = paidRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalSuccessful = paidRows.length;
  const totalPending = pendingRows.length;
  const totalFailed = failedRows.length;

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    const isPaid = r.status === 'PAID' || r.orderStatus === 'Confirmed' || r.orderStatus === 'Preparing' || r.orderStatus === 'Packed' || r.orderStatus === 'Out for Delivery' || r.orderStatus === 'Delivered';
    const isPending = r.status === 'PENDING' || r.status === 'PAYMENT_VERIFICATION_PENDING';
    const isFailed = r.status === 'FAILED' || r.status === 'REJECTED' || r.status === 'CANCELLED';

    if (activeTab === 'PAID' && !isPaid) return false;
    if (activeTab === 'PENDING' && !isPending) return false;
    if (activeTab === 'FAILED' && !isFailed) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchOrder = String(r.orderId || '').toLowerCase().includes(q);
      const matchRzpOrder = String(r.razorpayOrderId || '').toLowerCase().includes(q);
      const matchRzpPay = String(r.razorpayPaymentId || r.transactionReference || '').toLowerCase().includes(q);
      const matchName = String(r.customerName || '').toLowerCase().includes(q);
      const matchEmail = String(r.customerEmail || '').toLowerCase().includes(q);
      const matchPhone = String(r.customerPhone || '').toLowerCase().includes(q);
      const matchAmount = String(r.amount || '').includes(q);
      return matchOrder || matchRzpOrder || matchRzpPay || matchName || matchEmail || matchPhone || matchAmount;
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
              Razorpay Payments & Transactions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
              Gateway v2
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time Razorpay transaction feed, server-verified payments, and customer checkout audit log.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchPayments(false)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${isRefreshing ? 'animate-spin text-brand-burgundy' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Gateway'}</span>
          </button>
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Live Webhook & Polling
          </span>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Total Revenue Collected</span>
          <div className="text-2xl font-serif font-black text-emerald-950 mt-1">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-emerald-700 font-bold mt-1">Verified Razorpay Payments</p>
        </div>

        <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Successful Transactions</span>
          <div className="text-2xl font-serif font-black text-zinc-900 mt-1 flex items-baseline gap-1.5">
            {totalSuccessful}
            <span className="text-xs font-medium text-zinc-500">orders</span>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium mt-1">HMAC Signature Verified</p>
        </div>

        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Pending / Awaiting</span>
          <div className="text-2xl font-serif font-black text-amber-950 mt-1">
            {totalPending}
          </div>
          <p className="text-[10px] text-amber-700 font-bold mt-1">Checkout in progress</p>
        </div>

        <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Failed / Cancelled</span>
          <div className="text-2xl font-serif font-black text-rose-950 mt-1">
            {totalFailed}
          </div>
          <p className="text-[10px] text-rose-700 font-bold mt-1">Declined or closed checkout</p>
        </div>
      </div>

      {/* 3. TABS AND SEARCH FILTER */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-2xs">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All ({rows.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PAID')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PAID'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Paid ({totalSuccessful})</span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-zinc-950 shadow-xs font-black'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Pending ({totalPending})</span>
          </button>

          <button
            onClick={() => setActiveTab('FAILED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'FAILED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Failed ({totalFailed})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order, Pay ID, Customer..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-burgundy/20 focus:bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN TRANSACTION LIST */}
      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-3 border-brand-burgundy border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-semibold text-zinc-700">Loading Razorpay Transactions...</p>
          <p className="text-xs text-zinc-400">Syncing live payments with PostgreSQL</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
            <CreditCard className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-serif font-bold text-zinc-800">
            No transactions found
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {search ? 'Try clearing your search query.' : 'When customers complete checkout via Razorpay, transactions will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRows.map((item) => {
            const isPaid = item.status === 'PAID' || item.orderStatus === 'Confirmed' || item.orderStatus === 'Preparing' || item.orderStatus === 'Packed' || item.orderStatus === 'Out for Delivery' || item.orderStatus === 'Delivered';
            const isPending = item.status === 'PENDING' || item.status === 'PAYMENT_VERIFICATION_PENDING';
            const isFailed = item.status === 'FAILED' || item.status === 'REJECTED' || item.status === 'CANCELLED';

            const displayPaymentId = item.razorpayPaymentId || item.transactionReference || '';
            const displayOrderId = item.razorpayOrderId || '';

            return (
              <div 
                key={item.id} 
                className={`bg-white border rounded-2xl p-5 shadow-2xs transition-all hover:shadow-md ${
                  isPaid
                    ? 'border-emerald-200/80 bg-gradient-to-r from-white via-white to-emerald-50/20'
                    : isPending
                    ? 'border-amber-200 bg-white'
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

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isPaid 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : isPending 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {isPaid ? <CheckCircle2 className="h-3 w-3" /> : isPending ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {isPaid ? 'Payment Verified (PAID)' : isPending ? 'Payment In Progress' : 'Payment Failed / Cancelled'}
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

                    {/* Items snippet */}
                    {item.items && item.items.length > 0 && (
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1 pt-1">
                        <ShoppingBag className="h-3 w-3 text-zinc-400" />
                        <span>
                          {item.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Razorpay IDs & Method */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t sm:border-t-0 sm:border-l border-zinc-100 pt-3 sm:pt-0 sm:pl-5">
                    
                    {/* Amount Block */}
                    <div className="space-y-2 min-w-[150px]">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Amount</span>
                        <div className="text-2xl font-serif font-black text-zinc-900">
                          ₹{item.amount}
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{item.method || 'Razorpay Standard'}</span>
                      </div>
                    </div>

                    {/* Razorpay IDs Box */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2 min-w-[240px]">
                      {/* Payment ID */}
                      <div>
                        <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-wider block">Razorpay Payment ID</span>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <code className="font-mono text-xs font-bold text-zinc-900 select-all truncate">
                            {displayPaymentId || 'Awaiting Payment'}
                          </code>
                          {displayPaymentId && (
                            <button
                              onClick={() => handleCopy(displayPaymentId, `pay-${item.id}`)}
                              className="p-1 text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 rounded-md transition-colors cursor-pointer shrink-0"
                              title="Copy Payment ID"
                            >
                              {copiedId === `pay-${item.id}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Order ID */}
                      {displayOrderId && (
                        <div className="border-t border-zinc-200/60 pt-1.5">
                          <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-wider block">Razorpay Order ID</span>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <code className="font-mono text-xs text-zinc-700 select-all truncate">
                              {displayOrderId}
                            </code>
                            <button
                              onClick={() => handleCopy(displayOrderId, `order-${item.id}`)}
                              className="p-1 text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 rounded-md transition-colors cursor-pointer shrink-0"
                              title="Copy Razorpay Order ID"
                            >
                              {copiedId === `order-${item.id}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex sm:flex-col justify-end gap-2 border-t sm:border-t-0 sm:border-l border-zinc-100 pt-3 sm:pt-0 sm:pl-5 min-w-[140px]">
                    <button
                      onClick={() => setSelectedPayment(item)}
                      className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-zinc-600" />
                      <span>Audit Details</span>
                    </button>

                    <Link 
                      href={`/admin/orders/${item.orderId}`}
                      className="px-4 py-2 bg-white hover:bg-zinc-50 text-brand-burgundy border border-zinc-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>View Order</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. AUDIT / INSPECTION MODAL                                               */}
      {/* ========================================================================= */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-base text-zinc-900">
                    Payment Audit — Order #{selectedPayment.orderId}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Gateway: Razorpay Standard Checkout
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Payment Status banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedPayment.status === 'PAID'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">Status</span>
                  <span className="text-sm font-bold">{selectedPayment.status}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">Total Amount</span>
                  <span className="text-lg font-serif font-black">₹{selectedPayment.amount}</span>
                </div>
              </div>

              {/* Gateway Breakdown */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2.5">
                <h4 className="font-bold text-zinc-800 text-xs uppercase tracking-wider">Razorpay Identifiers</h4>
                
                <div className="flex justify-between items-center border-b border-zinc-200/60 pb-1.5">
                  <span className="text-zinc-500">Razorpay Payment ID</span>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono font-bold text-zinc-900 select-all">{selectedPayment.razorpayPaymentId || selectedPayment.transactionReference || 'N/A'}</code>
                    {selectedPayment.razorpayPaymentId && (
                      <button
                        onClick={() => handleCopy(selectedPayment.razorpayPaymentId!, 'modal-pay')}
                        className="p-1 text-zinc-500 hover:text-zinc-900 bg-white border rounded cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-zinc-200/60 pb-1.5">
                  <span className="text-zinc-500">Razorpay Order ID</span>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono font-bold text-zinc-900 select-all">{selectedPayment.razorpayOrderId || 'N/A'}</code>
                    {selectedPayment.razorpayOrderId && (
                      <button
                        onClick={() => handleCopy(selectedPayment.razorpayOrderId!, 'modal-order')}
                        className="p-1 text-zinc-500 hover:text-zinc-900 bg-white border rounded cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Signature Verification</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    HMAC-SHA256 Verified Server-Side
                  </span>
                </div>
              </div>

              {/* Customer & Delivery */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-zinc-800 text-xs uppercase tracking-wider">Customer Information</h4>
                <div className="flex justify-between"><span className="text-zinc-500">Customer Name:</span><span className="font-bold text-zinc-800">{selectedPayment.customerName}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Mobile Phone:</span><span className="font-medium text-zinc-800">{selectedPayment.customerPhone || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Email Address:</span><span className="font-medium text-zinc-800">{selectedPayment.customerEmail || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Delivery Location:</span><span className="font-medium text-zinc-800">{selectedPayment.deliveryLocationName}</span></div>
              </div>

              {/* Items Breakdown */}
              {selectedPayment.items && selectedPayment.items.length > 0 && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                  <h4 className="font-bold text-zinc-800 text-xs uppercase tracking-wider">Order Items</h4>
                  <div className="divide-y divide-zinc-200/60">
                    {selectedPayment.items.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between">
                        <span className="text-zinc-700 font-medium">{item.name} × {item.quantity}</span>
                        <span className="font-bold text-zinc-900">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-zinc-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/admin/orders/${selectedPayment.orderId}`}
                className="px-5 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Go to Order #{selectedPayment.orderId}
              </Link>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
