'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  ShoppingBag, 
  Truck, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  UploadCloud, 
  Check, 
  AlertCircle,
  MapPin,
  Lock,
  Smartphone,
  ChevronRight,
  Shield,
  CreditCard,
  Zap,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Logo from '../../../../components/Logo';
import { useOrders, Order } from '../../../../context/OrderContext';
import { useToast } from '../../../../components/Toast';

interface QrResponse {
  success: boolean;
  upiId: string;
  amount: number;
  uri: string;
  merchantName: string;
  orderId: string;
  note?: string;
  error?: string;
}

export default function OrderPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderById } = useOrders();
  const { showToast } = useToast();
  
  const rawParamId = (params.id as string || '').trim();
  let cleanOrderId = rawParamId;
  while (cleanOrderId.includes('%23') || cleanOrderId.includes('%20') || cleanOrderId.includes('%2F')) {
    try {
      const decoded = decodeURIComponent(cleanOrderId);
      if (decoded === cleanOrderId) break;
      cleanOrderId = decoded;
    } catch {
      break;
    }
  }
  const orderId = cleanOrderId.replace(/^#+/, '').trim();
  const contextOrder = getOrderById(orderId) || getOrderById(rawParamId) || getOrderById(cleanOrderId);
  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isConfirmedNotFound, setIsConfirmedNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeOrderRef = useRef<Order | null>(contextOrder || null);
  const isFetchingRef = useRef(false);
  const reqSeqRef = useRef(0);
  const latestHandledSeqRef = useRef(0);

  // Dynamic UPI QR details from backend
  const [qrDetails, setQrDetails] = useState<QrResponse | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Payment proof form state
  const [utr, setUtr] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Monotonic state-safety: prevent out-of-order stale poll responses from reverting approved states
  const isMonotonicallySafe = useCallback((current: Order | null, incoming: Order): boolean => {
    if (!current) return true;

    const currentPaid = current.paymentStatus === 'PAID' || current.status === 'Confirmed' || current.status === 'Preparing' || current.status === 'Packed' || current.status === 'Out for Delivery' || current.status === 'Delivered';
    const incomingPaid = incoming.paymentStatus === 'PAID' || incoming.status === 'Confirmed' || incoming.status === 'Preparing' || incoming.status === 'Packed' || incoming.status === 'Out for Delivery' || incoming.status === 'Delivered';

    // Rule 1: Once confirmed/paid, NEVER revert to pending or under review or rejected
    if (currentPaid && !incomingPaid) {
      return false;
    }

    // Rule 2: If current is REJECTED, do not revert to pending/unpaid unless incoming has a newer paymentSubmittedAt
    const currentRejected = current.paymentStatus === 'REJECTED';
    const incomingRejected = incoming.paymentStatus === 'REJECTED';
    if (currentRejected && !incomingRejected && !incomingPaid) {
      if (incoming.paymentSubmittedAt && current.paymentRejectedAt) {
        if (new Date(incoming.paymentSubmittedAt).getTime() <= new Date(current.paymentRejectedAt).getTime()) {
          return false;
        }
      } else {
        return false;
      }
    }

    // Rule 3: If current has verified timestamp and incoming is older, reject
    if (current.paymentVerifiedAt && incoming.paymentVerifiedAt) {
      if (new Date(incoming.paymentVerifiedAt).getTime() < new Date(current.paymentVerifiedAt).getTime()) {
        return false;
      }
    }

    // Rule 4: If current state has newer updatedAt timestamp, reject older payment status
    if (current.updatedAt && incoming.updatedAt) {
      if (new Date(incoming.updatedAt).getTime() < new Date(current.updatedAt).getTime()) {
        if (current.paymentStatus !== incoming.paymentStatus && incoming.paymentStatus === 'PAYMENT_VERIFICATION_PENDING') {
          return false;
        }
      }
    }

    return true;
  }, []);

  // Fetch order details from API with cache: 'no-store'
  const fetchOrderDetails = useCallback(async (silent = false) => {
    if (!orderId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    const thisSeq = ++reqSeqRef.current;
    try {
      if (!silent && !activeOrderRef.current) setLoading(true);
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);

      if (res.ok && data && !data.error && data.id) {
        if (thisSeq >= latestHandledSeqRef.current) {
          latestHandledSeqRef.current = thisSeq;
          setFetchedOrder((prev) => {
            const current = prev || activeOrderRef.current;
            if (!isMonotonicallySafe(current, data)) {
              return prev;
            }
            activeOrderRef.current = data;
            return data;
          });
          setFetchError(null);
          setIsConfirmedNotFound(false);
        }
      } else if (res.status === 404) {
        // Only set confirmed not-found if there is genuinely no existing order loaded anywhere
        if (!activeOrderRef.current && !fetchedOrder && !contextOrder) {
          setIsConfirmedNotFound(true);
          setFetchError(data?.error || 'Order not found in records.');
        }
      } else {
        if (!activeOrderRef.current && !fetchedOrder && !contextOrder) {
          setFetchError(data?.error || `Connecting to payment gateway (${res.status})...`);
        }
      }
    } catch (err) {
      console.warn("[PAYMENT] Network error during order fetch:", err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [orderId, isMonotonicallySafe]);

  // Initial load + fast live polling every 1.2s for instant admin-approve sync (with strict sequence/monotonic guard)
  useEffect(() => {
    void fetchOrderDetails(false);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchOrderDetails(true);
    }, 1200);
    return () => clearInterval(interval);
  }, [fetchOrderDetails]);

  const order = fetchedOrder || activeOrderRef.current || contextOrder;

  // Fetch dynamic QR code data from backend API whenever order is loaded
  useEffect(() => {
    if (!order?.id || !order?.total) return;
    let isMounted = true;
    setQrLoading(true);

    fetch(`/api/payments/qr?orderId=${encodeURIComponent(order.id)}&amount=${encodeURIComponent(String(order.total))}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: QrResponse | null) => {
        if (isMounted && data && data.success) {
          setQrDetails(data);
        }
      })
      .catch((err) => console.error('Error loading QR code data:', err))
      .finally(() => {
        if (isMounted) setQrLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [order?.id, order?.total]);

  // Handle local file preview cleanup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (PNG, JPG, JPEG, WebP).', 'error');
        return;
      }
      setProofFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCopyUpi = async () => {
    const targetUpi = qrDetails?.upiId || '8081988627@pthdfc';
    try {
      await navigator.clipboard.writeText(targetUpi);
      setCopied(true);
      showToast(`UPI ID copied: ${targetUpi}`, 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast(`UPI ID: ${targetUpi}`, 'info');
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || isSubmittingProof) return;

    const trimmedUtr = utr.trim();
    if (!trimmedUtr) {
      showToast('Please enter the 12-digit UTR / transaction reference number.', 'error');
      return;
    }

    if (!proofFile) {
      showToast('Please upload a screenshot of your payment confirmation.', 'error');
      return;
    }

    try {
      setIsSubmittingProof(true);

      // Fast single-request atomic multipart submit
      const targetOrderId = String(order?.id || orderId || rawParamId || '').replace(/^#+/, '').trim();
      const formData = new FormData();
      formData.append('orderId', targetOrderId);
      formData.append('paymentId', order?.paymentId || `pay-${targetOrderId}`);
      formData.append('amount', String(order?.total || 0));
      formData.append('utr', trimmedUtr);
      formData.append('file', proofFile);

      const submitRes = await fetch('/api/payments/submit', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000)
      });

      const submitData = await submitRes.json().catch(() => null) as { success?: boolean; error?: string; paymentStatus?: string; order?: Order } | null;
      if (!submitRes.ok || !submitData || !submitData.success) {
        const errorMsg = submitData?.error || `Failed to submit payment verification (HTTP ${submitRes.status})`;
        throw new Error(errorMsg);
      }

      // Immediately transition UI to "Verification in Progress"
      const now = new Date().toISOString();
      const updatedOrderData: Order = submitData.order || {
        ...order,
        paymentStatus: 'PAYMENT_VERIFICATION_PENDING' as const,
        utr: trimmedUtr,
        proofImageUrl: previewUrl || '',
        paymentSubmittedAt: now,
        updatedAt: now,
      };

      setFetchedOrder(updatedOrderData);
      activeOrderRef.current = updatedOrderData;
      setIsConfirmedNotFound(false);

      showToast('Payment submitted successfully! Your payment is under review.', 'success');
      setUtr('');
      setProofFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error('[PAYMENT SUBMIT ERROR]', err);
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // UPI configuration fallback
  const merchantUpi = qrDetails?.upiId || '8081988627@pthdfc';
  const merchantName = qrDetails?.merchantName || 'FATAFAT';
  const finalAmount = Number(order?.total || qrDetails?.amount || 0);
  const formattedAmount = finalAmount.toFixed(2);
  const upiUri = qrDetails?.uri || `upi://pay?pa=${merchantUpi}&pn=${encodeURIComponent(merchantName)}&am=${formattedAmount}&cu=INR&tr=${encodeURIComponent(order?.id || '')}`;

  // Status flags
  const isPaidOrConfirmed = order?.paymentStatus === 'PAID' || order?.status === 'Confirmed';
  const isRejected = order?.paymentStatus === 'REJECTED';
  const isPendingVerification = order?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING';
  const hasSubmittedProof = Boolean(order?.utr || order?.proofImageUrl);

  // 1. Loading State
  if (loading && !order) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-brand-burgundy/20 border-t-brand-burgundy animate-spin mb-4" />
          <h2 className="text-base font-semibold text-slate-900">Loading Secure Payment Gateway...</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Retrieving payment parameters and verifying session for Order #{orderId}.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // 2. Confirmed Order Not Found (404 from backend and no existing order in state)
  if (!order && isConfirmedNotFound) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-full mb-3">
            <XCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Order Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {fetchError || 'We could not locate this order in our records. Please verify in your account.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push('/account/orders')}
              className="px-5 py-2.5 rounded-lg bg-brand-burgundy text-white text-xs font-semibold hover:bg-brand-burgundy-dark transition-colors"
            >
              View My Orders
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-white transition-colors"
            >
              Back to Home
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 3. Temporary connection / retrieval issue when no order in state
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-full mb-3">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Connecting to Gateway...</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {fetchError || 'Synchronizing your order details with the payment gateway.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => void fetchOrderDetails()}
              className="px-5 py-2.5 rounded-lg bg-brand-burgundy text-white text-xs font-semibold hover:bg-brand-burgundy-dark transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={() => router.push('/account/orders')}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-white transition-colors"
            >
              My Orders
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900 font-sans antialiased">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1040px] w-full space-y-6">

          {/* 1. PROFESSIONAL GATEWAY HEADER BAR */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-lg bg-brand-burgundy/10 flex items-center justify-center text-brand-burgundy shrink-0">
                <Logo iconOnly size="sm" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    Complete Payment
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    <Lock className="h-3 w-3 text-slate-500" /> 256-Bit Encrypted
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order ID: <span className="font-mono font-semibold text-slate-800">#{order.id}</span>
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight border ${
                isPaidOrConfirmed 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : isRejected 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : (isPendingVerification && hasSubmittedProof)
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {isPaidOrConfirmed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Payment Confirmed
                  </>
                ) : isRejected ? (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-rose-600" /> Verification Failed
                  </>
                ) : (isPendingVerification && hasSubmittedProof) ? (
                  <>
                    <Clock className="h-3.5 w-3.5 text-amber-600 animate-spin" /> Verification in Progress
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 text-slate-500" /> Payment Pending
                  </>
                )}
              </span>
            </div>
          </div>

          {/* 2. MAIN 2-COLUMN PAYMENT CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN (7 COLS): PAYMENT FLOW */}
            <div className="lg:col-span-7 space-y-6">

              {/* A: PAYMENT CONFIRMED STATE */}
              {isPaidOrConfirmed ? (
                <div className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-8 shadow-sm text-center space-y-6">
                  <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                      Payment Successful
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Payment of ₹{order.total} Received!
                    </h2>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Your UPI payment has been verified and confirmed. Your order has been placed successfully and is now moving to packing and delivery.
                    </p>
                  </div>

                  {/* Transaction Details Box */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 text-xs space-y-2.5 text-left">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Order ID</span>
                      <span className="font-mono font-semibold text-slate-900">#{order.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Amount Paid</span>
                      <span className="font-bold text-slate-900">₹{order.total}</span>
                    </div>
                    {order.utr && (
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Transaction Reference (UTR)</span>
                        <span className="font-mono font-semibold text-slate-800">{order.utr}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Delivery Option</span>
                      <span className="font-medium text-slate-800">{order.deliveryOption} ({order.eta})</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-500">Estimated Delivery</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" /> Within 12 hours
                      </span>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Link
                      href={`/track/${order.id}`}
                      className="px-6 py-2.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      Track Order <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/account/orders"
                      className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center"
                    >
                      View All Orders
                    </Link>
                  </div>
                </div>
              ) : isPendingVerification && hasSubmittedProof ? (

                /* B: UNDER VERIFICATION STATE */
                <div className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-8 shadow-sm text-center space-y-6">
                  <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                    <Clock className="h-10 w-10 animate-pulse" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      Verification in Progress
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Payment Details Submitted
                    </h2>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Your payment proof has been received. Our operations team is verifying your UTR with the bank. Order confirmation will update here automatically.
                    </p>
                  </div>

                  {/* Submission Details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2.5 text-left">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Order ID</span>
                      <span className="font-mono font-semibold text-slate-900">#{order.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Payable Amount</span>
                      <span className="font-bold text-slate-900">₹{order.total}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Submitted UTR</span>
                      <span className="font-mono font-semibold text-slate-800">{order.utr || 'Under Review'}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-500">Status</span>
                      <span className="font-semibold text-amber-700 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Verifying with Bank
                      </span>
                    </div>
                  </div>

                  {/* Auto-Sync Banner */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-lg text-left flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 leading-relaxed">
                      <strong>Auto-Refresh Active:</strong> This screen automatically synchronizes with our backend every 3 seconds. You do not need to refresh manually.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Link
                      href={`/track/${order.id}`}
                      className="px-6 py-2.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      Track Order Status
                    </Link>
                    <Link
                      href="/account/orders"
                      className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center"
                    >
                      Go to Orders
                    </Link>
                  </div>
                </div>
              ) : (

                /* C: ACTIVE PAYMENT CHECKOUT FORM */
                <div className="space-y-6">

                  {/* Rejection Notification if failed previously */}
                  {isRejected && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-left space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span>Payment Verification Failed</span>
                      </div>
                      <p className="text-xs text-rose-700 leading-relaxed">
                        {order.rejectionReason || 'The submitted transaction reference could not be verified against the bank statement. Please verify your payment and submit the correct 12-digit UTR and screenshot.'}
                      </p>
                    </div>
                  )}

                  {/* 1. UPI QR & SCAN BOX */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-7 shadow-sm space-y-6">
                    
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Pay Securely using UPI
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI app
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-burgundy bg-brand-burgundy/10 px-2.5 py-1 rounded-md">
                        UPI QR
                      </span>
                    </div>

                    {/* Amount & QR Display */}
                    <div className="flex flex-col items-center justify-center py-2 space-y-4 text-center">
                      
                      {/* Amount Callout */}
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Amount to Pay</span>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                          ₹{order.total}
                        </div>
                      </div>

                      {/* Clean QR Code Container */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm inline-flex flex-col items-center">
                        {qrLoading ? (
                          <div className="w-[220px] h-[220px] flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-lg">
                            <RefreshCw className="h-6 w-6 text-brand-burgundy animate-spin" />
                            <span className="text-[11px] text-slate-500 font-medium">Generating UPI QR...</span>
                          </div>
                        ) : (
                          <QRCodeSVG 
                            value={upiUri} 
                            size={220} 
                            level="H" 
                            includeMargin={true}
                          />
                        )}
                        <span className="text-[11px] font-semibold text-slate-600 mt-2 flex items-center gap-1">
                          <Smartphone className="h-3.5 w-3.5 text-slate-500" /> Scan & Pay ₹{order.total}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 max-w-sm">
                        Open any UPI app on your phone, select QR scanner, and scan this code to pay.
                      </p>
                    </div>

                    {/* Merchant UPI ID & Direct Pay Row */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-slate-400">Merchant UPI ID</span>
                          <p className="font-mono text-xs sm:text-sm font-bold text-slate-800 select-all">
                            {merchantUpi}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            {copied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied ✓</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <a
                            href={upiUri}
                            className="px-3 py-1.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Pay on Mobile</span>
                          </a>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* 2. CONFIRM PAYMENT & UTR FORM */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-7 shadow-sm space-y-5">
                    
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900">
                        Confirm Your Payment
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        After completing the UPI payment, enter your 12-digit UTR and upload the payment receipt.
                      </p>
                    </div>

                    <form onSubmit={handleProofSubmit} className="space-y-4">
                      
                      {/* UTR Input */}
                      <div className="space-y-1.5">
                        <label htmlFor="utr-input" className="block text-xs font-semibold text-slate-700">
                          UPI Transaction / UTR Number <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="utr-input"
                          type="text"
                          required
                          value={utr}
                          onChange={(e) => setUtr(e.target.value)}
                          placeholder="e.g. 423456789012"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy transition-all"
                        />
                        <p className="text-[11px] text-slate-400">
                          Found under Transaction Details / Ref No. in your UPI app receipt.
                        </p>
                      </div>

                      {/* Screenshot Upload */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Upload Payment Screenshot <span className="text-rose-600">*</span>
                        </label>

                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 bg-slate-50/60 hover:bg-slate-50 transition-colors text-center cursor-pointer relative group">
                          <input
                            type="file"
                            required
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleFileChange}
                            aria-label="Upload payment screenshot"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />

                          {previewUrl ? (
                            <div className="flex flex-col items-center justify-center space-y-2.5 pointer-events-none">
                              <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-slate-200 shadow-xs bg-white">
                                <Image 
                                  src={previewUrl} 
                                  alt="Payment Confirmation Screenshot Preview" 
                                  fill 
                                  className="object-cover" 
                                />
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <FileCheck className="h-4 w-4 text-emerald-600" />
                                <span className="truncate max-w-[200px]">{proofFile?.name}</span>
                              </div>
                              <span className="text-[11px] text-slate-400">Click or tap to change file</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none py-2">
                              <div className="p-2.5 bg-white rounded-full border border-slate-200 text-slate-400 group-hover:text-brand-burgundy group-hover:border-brand-burgundy/30 transition-colors">
                                <UploadCloud className="h-5 w-5" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                Click or drag receipt screenshot here
                              </span>
                              <span className="text-[11px] text-slate-400">
                                PNG, JPG, JPEG, WebP up to 8MB
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Submit CTA */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmittingProof || !utr.trim() || !proofFile}
                          className="w-full bg-brand-burgundy hover:bg-brand-burgundy-dark active:bg-brand-burgundy text-white font-semibold rounded-lg py-3 px-4 text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                        >
                          {isSubmittingProof ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>Submitting Payment Proof...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4" />
                              <span>Submit Payment Proof</span>
                            </>
                          )}
                        </button>
                      </div>

                    </form>

                  </div>

                </div>
              )}

            </div>

            {/* RIGHT COLUMN (5 COLS): ORDER SUMMARY & ADDRESS */}
            <div className="lg:col-span-5 space-y-6">

              {/* Order Summary Card */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-brand-burgundy" /> Order Summary
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-slate-800">{item.name}</p>
                        <p className="text-[11px] text-slate-400">
                          Qty: {item.quantity} {item.selectedSize && `• ${item.selectedSize}`} {item.selectedType && `• ${item.selectedType}`}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-800 shrink-0">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing Table */}
                <div className="border-t border-slate-100 pt-3.5 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-800">₹{order.subtotal}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount</span>
                      <span>-₹{order.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery Charges</span>
                    <span className="font-medium text-slate-800">
                      {order.deliveryFee === 0 ? (
                        <span className="text-emerald-700 font-semibold uppercase text-[10px]">Free</span>
                      ) : (
                        `₹${order.deliveryFee}`
                      )}
                    </span>
                  </div>
                  
                  {/* Grand Total */}
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t border-slate-200 pt-3 mt-2">
                    <span>Grand Total</span>
                    <span className="text-lg text-brand-burgundy font-black">₹{order.total}</span>
                  </div>
                </div>

                {/* Delivery Address Block */}
                <div className="border-t border-slate-100 pt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5 text-brand-burgundy" /> Delivery Address
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 leading-relaxed text-slate-700">
                    <p className="font-semibold text-slate-900">{order.address.name} • +91 {order.address.mobile}</p>
                    <p className="text-slate-600 mt-0.5">
                      {order.address.house}, {order.address.street}, {order.address.area}, {order.address.city} - {order.address.pincode}
                    </p>
                    {order.address.landmark && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Landmark: {order.address.landmark}
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Security Badges Card */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Trusted & Secure Checkout</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-md border border-slate-200/60">
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                    <span>256-Bit Encrypted</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-md border border-slate-200/60">
                    <Zap className="h-3.5 w-3.5 text-slate-500" />
                    <span>Instant UPI Match</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-md border border-slate-200/60">
                    <Truck className="h-3.5 w-3.5 text-slate-500" />
                    <span>Fast Dispatch</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-md border border-slate-200/60">
                    <Shield className="h-3.5 w-3.5 text-slate-500" />
                    <span>Verified Merchant</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center pt-1">
                  Payment processed securely for FATAFAT Commerce
                </p>
              </div>

            </div>

          </div>

          {/* 3. TRUST & SECURITY GATEWAY FOOTER */}
          <div className="py-4 text-center text-xs text-slate-500 space-y-2 border-t border-slate-200/60">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> End-to-End Encrypted</span>
              <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Universal UPI Support</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Anti-Fraud Verification</span>
              <span className="flex items-center gap-1"><Logo iconOnly size="sm" className="h-4 w-4 text-[9px]" /> FATAFAT Verified</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Need help with your payment? Contact support at <a href="mailto:support@fatafatapp.me" className="text-brand-burgundy underline hover:opacity-80">support@fatafatapp.me</a>
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
