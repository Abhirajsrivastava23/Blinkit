'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  ShoppingBag, 
  Truck, 
  ArrowRight, 
  ShieldCheck, 
  XCircle, 
  RefreshCw, 
  MapPin,
  CreditCard,
  Lock,
  ExternalLink
} from 'lucide-react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useOrders, Order, STATUS_RANK } from '../../../context/OrderContext';
import { useToast } from '../../../components/Toast';

export default function OrderConfirmationPage() {
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

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          setFetchedOrder(prev => {
            if (!prev) return data;
            const currentRank = STATUS_RANK[prev.status] || 0;
            const incomingRank = STATUS_RANK[data.status] || 0;

            if (currentRank > incomingRank && prev.updatedAt && data.updatedAt) {
              if (new Date(prev.updatedAt).getTime() > new Date(data.updatedAt).getTime()) {
                return prev;
              }
            }

            const currentPaid = prev.paymentStatus === 'PAID' || currentRank >= 20;
            const incomingPaid = data.paymentStatus === 'PAID' || incomingRank >= 20;
            if (currentPaid && !incomingPaid) return prev;

            return data;
          });
          setFetchError(null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (!contextOrder && !fetchedOrder) {
          setFetchError(errData.error || `HTTP Error ${res.status}`);
        }
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, contextOrder, fetchedOrder]);

  useEffect(() => {
    void fetchOrderDetails();
    const interval = setInterval(() => {
      void fetchOrderDetails();
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchOrderDetails]);

  const order = fetchedOrder || contextOrder;

  // If unpaid and not confirmed, redirect to Razorpay payment page
  useEffect(() => {
    if (order && order.paymentStatus !== 'PAID' && order.status === 'Pending') {
      router.replace(`/order/${order.id}/payment`);
    }
  }, [order, router]);

  if (loading && !order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
          <RefreshCw className="h-10 w-10 text-brand-burgundy mb-4 animate-spin" />
          <h2 className="text-lg font-bold font-serif text-zinc-800">Loading Order Details...</h2>
          <p className="text-xs text-zinc-400 mt-1">Connecting to database records for Order #{orderId}.</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
          <div className="p-4 bg-red-50 text-red-600 rounded-full mb-3">
            <XCircle className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold font-serif text-zinc-800">Order Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {fetchError || 'We could not locate this order in our records. Please check your active orders inside your Account.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push('/account/orders')}
              className="px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider hover:bg-brand-burgundy-dark transition-all shadow"
            >
              View My Orders
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 rounded-full border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 transition-all"
            >
              Return Home
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isPaidOrConfirmed = order.paymentStatus === 'PAID' || order.status === 'Confirmed';

  return (
    <>
      <Header />

      <main className="flex-1 bg-[#FAF9F6] py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">

          {isPaidOrConfirmed ? (
            /* PAYMENT CONFIRMED / ORDER CONFIRMED */
            <div className="bg-white border border-emerald-100 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full animate-bounce">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Payment Verified
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-900">
                  Order Confirmed! 🎉
                </h1>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
                  Thank you for shopping with FATAFAT! Your Razorpay payment has been verified and confirmed. Your order is moving to fulfillment and dispatch.
                </p>
              </div>

              {/* Order Specs Block */}
              <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs space-y-3 max-w-md mx-auto text-left">
                <div className="flex justify-between border-b pb-2.5">
                  <span className="text-zinc-400 font-bold">Order ID</span>
                  <span className="font-extrabold text-brand-burgundy">#{order.id}</span>
                </div>
                <div className="flex justify-between border-b pb-2.5">
                  <span className="text-zinc-400 font-bold">Total Amount</span>
                  <span className="font-extrabold text-zinc-900">₹{order.total}</span>
                </div>
                {order.razorpayPaymentId && (
                  <div className="flex justify-between border-b pb-2.5">
                    <span className="text-zinc-400 font-bold">Razorpay Payment ID</span>
                    <span className="font-mono text-zinc-800 font-bold">{order.razorpayPaymentId}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2.5">
                  <span className="text-zinc-400 font-bold">Payment Status</span>
                  <span className="font-extrabold uppercase text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Paid & Confirmed
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold">Estimated Delivery</span>
                  <span className="font-extrabold flex items-center gap-1 text-green-700">
                    <Truck className="h-4 w-4" /> Within 12 hours
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  href={`/track/${order.id}`}
                  className="px-8 py-3.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-burgundy/10 group"
                >
                  Track Live Order <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/account/orders"
                  className="px-8 py-3.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center"
                >
                  View All Orders
                </Link>
              </div>
            </div>
          ) : (
            /* PAYMENT PENDING: CTA TO PAY */
            <div className="bg-white border border-amber-100 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-full">
                  <CreditCard className="h-12 w-12" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                  Payment Required
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-900">
                  Complete Your Payment
                </h1>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
                  Please complete payment for Order #{order.id} (₹{order.total}) via Razorpay to confirm your delivery.
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <Link
                  href={`/order/${order.id}/payment`}
                  className="px-8 py-3.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Pay with Razorpay (₹{order.total})</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 pt-2">
            <ShieldCheck className="h-4 w-4 text-brand-gold" />
            <span>Encrypted online transaction with 100% buyer protection.</span>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
