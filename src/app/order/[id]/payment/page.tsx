'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  Lock, 
  CreditCard, 
  Smartphone, 
  Shield, 
  AlertCircle,
  MapPin,
  ChevronRight,
  ExternalLink,
  Zap
} from 'lucide-react';
import Script from 'next/script';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Logo from '../../../../components/Logo';
import { useOrders, Order } from '../../../../context/OrderContext';
import { useToast } from '../../../../components/Toast';

// Ultra-robust Helper to load Razorpay SDK with automatic retries
function loadRazorpayScript(retries = 3): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    let attempt = 0;
    const tryLoad = () => {
      attempt++;
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const existing = document.getElementById('razorpay-checkout-script') as HTMLScriptElement | null;
      if (existing) {
        if ((window as any).Razorpay) {
          resolve(true);
          return;
        }
        existing.addEventListener('load', () => resolve(Boolean((window as any).Razorpay)), { once: true });
        existing.addEventListener('error', () => {
          if (attempt < retries) {
            existing.remove();
            setTimeout(tryLoad, 600);
          } else {
            resolve(false);
          }
        }, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(Boolean((window as any).Razorpay));
      script.onerror = () => {
        script.remove();
        if (attempt < retries) {
          setTimeout(tryLoad, 600);
        } else {
          resolve(false);
        }
      };
      document.head.appendChild(script);
    };

    tryLoad();
  });
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

  // Razorpay Checkout States
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const activeOrderRef = useRef<Order | null>(contextOrder || null);
  const isFetchingRef = useRef(false);
  const reqSeqRef = useRef(0);
  const latestHandledSeqRef = useRef(0);

  // Monotonic safety: once confirmed/paid, never revert
  const isMonotonicallySafe = useCallback((current: Order | null, incoming: Order): boolean => {
    if (!current) return true;
    const currentPaid = current.paymentStatus === 'PAID' || current.status === 'Confirmed' || current.status === 'Preparing' || current.status === 'Packed' || current.status === 'Out for Delivery' || current.status === 'Delivered';
    const incomingPaid = incoming.paymentStatus === 'PAID' || incoming.status === 'Confirmed' || incoming.status === 'Preparing' || incoming.status === 'Packed' || incoming.status === 'Out for Delivery' || incoming.status === 'Delivered';

    if (currentPaid && !incomingPaid) {
      return false;
    }
    return true;
  }, []);

  // Fetch order details
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
      console.warn('[PAYMENT] Error fetching order:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [orderId, isMonotonicallySafe, fetchedOrder, contextOrder]);

  // Preload Razorpay Checkout SDK & fetch order
  useEffect(() => {
    void loadRazorpayScript();
    void fetchOrderDetails(false);
  }, [fetchOrderDetails]);

  const order = fetchedOrder || activeOrderRef.current || contextOrder;
  const isPaidOrConfirmed = order?.paymentStatus === 'PAID' || order?.status === 'Confirmed';

  // Handle Razorpay Checkout button click
  const handlePayWithRazorpay = async () => {
    if (!order || isInitiating || isVerifying) return;

    if (isPaidOrConfirmed) {
      showToast('This order has already been paid and confirmed.', 'info');
      return;
    }

    setPaymentError(null);
    setIsInitiating(true);

    try {
      // 1. Ensure Razorpay script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error('Unable to load Razorpay payment gateway. Please check your internet connection.');
      }

      // 2. Request Server to create a Razorpay Order
      const targetOrderId = String(order.id || orderId).replace(/^#+/, '').trim();
      const createRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: targetOrderId }),
      });

      const createData = await createRes.json().catch(() => null);

      if (!createRes.ok || !createData || !createData.success) {
        throw new Error(createData?.error || 'Failed to initialize payment gateway.');
      }

      if (createData.alreadyPaid) {
        showToast('Payment already confirmed for this order.', 'success');
        await fetchOrderDetails(false);
        setIsInitiating(false);
        return;
      }

      // 3. Open Razorpay Standard Checkout Modal
      const options = {
        key: createData.keyId,
        amount: createData.amount,
        currency: createData.currency || 'INR',
        name: 'FATAFAT',
        description: `Payment for Order #${targetOrderId}`,
        image: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
        order_id: createData.orderId,
        prefill: {
          name: createData.customer?.name || '',
          email: createData.customer?.email || '',
          contact: createData.customer?.contact || '',
        },
        notes: {
          orderId: targetOrderId,
        },
        theme: {
          color: '#701A28', // Brand Burgundy
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            setIsVerifying(true);
            setIsInitiating(false);

            // 4. Server-Side HMAC Signature Verification
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: targetOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => null);

            if (!verifyRes.ok || !verifyData || !verifyData.success) {
              throw new Error(verifyData?.error || 'Payment signature verification failed on the server.');
            }

            // Immediately transition local state to Confirmed
            if (verifyData.order) {
              setFetchedOrder(verifyData.order);
              activeOrderRef.current = verifyData.order;
            } else {
              setFetchedOrder((prev) => prev ? {
                ...prev,
                paymentStatus: 'PAID',
                status: 'Confirmed',
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
              } : null);
            }

            showToast('Payment successful! Your order has been placed and confirmed.', 'success');
          } catch (verifyErr) {
            console.error('[RAZORPAY VERIFY ERROR]', verifyErr);
            const msg = verifyErr instanceof Error ? verifyErr.message : 'Payment verification failed.';
            setPaymentError(msg);
            showToast(msg, 'error');
          } finally {
            setIsVerifying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsInitiating(false);
            setPaymentError('Payment was cancelled or closed. You can retry anytime.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on('payment.failed', function (response: any) {
        setIsInitiating(false);
        const reason = response.error?.description || 'Payment was declined or failed.';
        setPaymentError(reason);
        showToast(reason, 'error');
      });

      rzp.open();
    } catch (err) {
      console.error('[RAZORPAY CHECKOUT ERROR]', err);
      const msg = err instanceof Error ? err.message : 'Could not start payment. Please try again.';
      setPaymentError(msg);
      showToast(msg, 'error');
      setIsInitiating(false);
    }
  };

  // 1. Loading State
  if (loading && !order) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-brand-burgundy/20 border-t-brand-burgundy animate-spin mb-4" />
          <h2 className="text-base font-semibold text-slate-900">Loading Payment Gateway...</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Retrieving secure payment parameters for Order #{orderId}.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // 2. Order Not Found
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
            {fetchError || 'We could not locate this order. Please check in your account orders.'}
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

  // 3. Temporary connection state
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
            {fetchError || 'Synchronizing your order details with Razorpay.'}
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

  const orderAddress = (order.address && typeof order.address === 'object') ? (order.address as any) : {};

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900 font-sans antialiased">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[960px] w-full space-y-6">

          {/* 1. HEADER BAR */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-brand-burgundy/10 flex items-center justify-center text-brand-burgundy shrink-0">
                <Logo iconOnly size="sm" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    {isPaidOrConfirmed ? 'Payment Confirmed' : 'Complete Online Payment'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                    <Lock className="h-3 w-3 text-emerald-600" /> Razorpay 256-Bit Encrypted
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order Reference: <span className="font-mono font-semibold text-slate-800">#{order.id}</span>
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight border ${
                isPaidOrConfirmed 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isPaidOrConfirmed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Payment Confirmed
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 text-amber-600" /> Awaiting Payment
                  </>
                )}
              </span>
            </div>
          </div>

          {/* 2. MAIN CONTAINER */}
          {isPaidOrConfirmed ? (

            /* A: PAYMENT CONFIRMED RECEIPT VIEW */
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-xs text-center space-y-6">
              <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                <CheckCircle2 className="h-12 w-12" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 text-xs font-bold shadow-xs">
                  <span>✅</span>
                  <span>Payment Verified</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-1">
                  Payment of ₹{order.total} Received! 🎉
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your payment has been securely verified. Your order is confirmed and moving into quick packing and delivery dispatch.
                </p>
              </div>

              {/* Transaction Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs space-y-3 text-left max-w-lg mx-auto">
                <div className="flex justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-mono font-semibold text-slate-900">#{order.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-bold text-slate-900">₹{order.total}</span>
                </div>
                {order.razorpayPaymentId && (
                  <div className="flex justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500">Razorpay Payment ID</span>
                    <span className="font-mono font-semibold text-brand-burgundy">{order.razorpayPaymentId}</span>
                  </div>
                )}
                {order.razorpayOrderId && (
                  <div className="flex justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500">Razorpay Order ID</span>
                    <span className="font-mono text-slate-700">{order.razorpayOrderId}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-slate-500">Delivery Option</span>
                  <span className="font-medium text-slate-800">{order.deliveryOption} ({order.eta || 'Within 12 hours'})</span>
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
                  className="px-7 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  Track Live Order <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/account/orders"
                  className="px-7 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center"
                >
                  View All Orders
                </Link>
              </div>
            </div>

          ) : (

            /* B: ACTIVE RAZORPAY CHECKOUT INTERFACE */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (7 cols): Payment CTA & Gateways */}
              <div className="lg:col-span-7 space-y-6">

                {/* Error Banner if any */}
                {paymentError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-left flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900">Payment Notice</h4>
                      <p className="text-xs text-rose-700 mt-0.5">{paymentError}</p>
                    </div>
                  </div>
                )}

                {/* Payment Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-burgundy bg-brand-burgundy/10 px-2.5 py-1 rounded-md">
                      Instant Checkout
                    </span>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mt-2">
                      Pay with Razorpay
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Complete your payment securely via UPI, Credit/Debit Cards, NetBanking, or Wallets.
                    </p>
                  </div>

                  {/* Amount Callout */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Payable</span>
                      <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                        ₹{order.total}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                        <ShieldCheck className="h-4 w-4" /> 100% Buyer Protection
                      </span>
                      <span className="text-slate-400 text-[11px] mt-0.5 block">Zero Convenience Fee</span>
                    </div>
                  </div>

                  {/* Primary Pay with Razorpay Button */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handlePayWithRazorpay}
                      disabled={isInitiating || isVerifying}
                      className="w-full bg-brand-burgundy hover:bg-brand-burgundy-dark active:scale-[0.99] text-white font-semibold rounded-xl py-4 px-6 text-sm uppercase tracking-wider transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Verifying Payment Signature...</span>
                        </>
                      ) : isInitiating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Connecting to Razorpay...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span>Pay with Razorpay (₹{order.total})</span>
                        </>
                      )}
                    </button>

                    {/* Razorpay Trust Messaging */}
                    <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center gap-3 text-left">
                      <span className="text-base shrink-0">🔒</span>
                      <div>
                        <h5 className="font-bold text-xs text-slate-800 leading-tight">Secure Payment</h5>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Payments are securely processed and verified by Razorpay.</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-center text-slate-400">
                      Clicking will open the official Razorpay checkout popup.
                    </p>
                  </div>

                  {/* Supported Payment Channels */}
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Accepted Payment Methods
                    </span>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-700">
                      <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-brand-burgundy" />
                        <span className="font-medium">UPI / QR</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-brand-burgundy" />
                        <span className="font-medium">Cards</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center gap-2">
                        <Lock className="h-4 w-4 text-brand-burgundy" />
                        <span className="font-medium">Net Banking</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center gap-2">
                        <Shield className="h-4 w-4 text-brand-burgundy" />
                        <span className="font-medium">Wallets</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Guarantee */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-3 text-xs text-slate-500">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>Your transaction is secured with bank-grade 256-bit encryption. No payment details are stored on our servers.</span>
                  </div>

                </div>

              </div>

              {/* Right Column (5 cols): Order Summary & Delivery Preview */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Order Summary Box */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-brand-burgundy" />
                    Order Summary (#{order.id})
                  </h3>

                  {/* Items List */}
                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      order.items.map((item: any, idx: number) => (
                        <div key={idx} className="py-2.5 flex justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                            <p className="text-[11px] text-slate-400">Qty: {item.quantity} {item.selectedSize && `• ${item.selectedSize}`}</p>
                          </div>
                          <span className="font-semibold text-slate-700 shrink-0">₹{Number(item.price || 0) * Number(item.quantity || 1)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-2">Items detail recorded.</p>
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-800">₹{order.subtotal || order.total}</span>
                    </div>
                    {Number(order.discount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discount Applied</span>
                        <span>-₹{order.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Delivery Fee</span>
                      <span className="font-medium text-slate-800">
                        {Number(order.deliveryFee || 0) === 0 ? <span className="text-emerald-600 font-bold uppercase text-[10px]">Free</span> : `₹${order.deliveryFee}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-100 pt-3">
                      <span>Total Amount</span>
                      <span className="text-base text-brand-burgundy font-extrabold">₹{order.total}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Destination Box */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                    <MapPin className="h-4 w-4 text-brand-burgundy" /> Delivery Destination
                  </h4>
                  <p className="font-semibold text-slate-800">{orderAddress.name || 'Customer'}</p>
                  <p className="text-slate-600 leading-relaxed">
                    {orderAddress.house ? `${orderAddress.house}, ` : ''}
                    {orderAddress.street ? `${orderAddress.street}, ` : ''}
                    {orderAddress.area ? `${orderAddress.area}, ` : ''}
                    {orderAddress.city ? `${orderAddress.city} ` : ''}
                    {orderAddress.pincode ? `- ${orderAddress.pincode}` : ''}
                  </p>
                  {orderAddress.mobile && (
                    <p className="text-slate-500 font-mono text-[11px] pt-1">
                      Phone: +91 {orderAddress.mobile}
                    </p>
                  )}
                </div>

              </div>

            </div>

          )}

        </div>
      </main>

      <Script
        id="razorpay-checkout-script"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <Footer />
    </div>
  );
}
