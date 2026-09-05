'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Truck, MapPin, Clock, ArrowLeft, ShoppingBag, X, AlertTriangle, CreditCard } from 'lucide-react';
import { useOrders, Order, STATUS_RANK } from '../../../../context/OrderContext';
import { useToast } from '../../../../components/Toast';

const STATUS_PROGRESSION: Order['status'][] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Packed',
  'Out for Delivery',
  'Delivered'
];

export default function AccountOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderById, refreshOrders } = useOrders();
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

  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [cancellationInProgress, setCancellationInProgress] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);

  const reqSeqRef = React.useRef(0);
  const latestHandledSeqRef = React.useRef(0);
  const isFetchingRef = React.useRef(false);

  const isMonotonicallySafe = (current: Order | undefined, incoming: Order): boolean => {
    if (!current) return true;
    const currentRank = STATUS_RANK[current.status] || 0;
    const incomingRank = STATUS_RANK[incoming.status] || 0;

    // Prevent stale delayed polling response from downgrading a newer status if local was updated more recently
    if (currentRank > incomingRank && current.updatedAt && incoming.updatedAt) {
      if (new Date(current.updatedAt).getTime() > new Date(incoming.updatedAt).getTime()) {
        return false;
      }
    }

    const currentPaid = current.paymentStatus === 'PAID' || currentRank >= 20;
    const incomingPaid = incoming.paymentStatus === 'PAID' || incomingRank >= 20;

    if (currentPaid && !incomingPaid && incoming.paymentStatus !== 'REJECTED') return false;

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

    return true;
  };

  useEffect(() => {
    const found = getOrderById(orderId) || getOrderById(rawParamId);
    if (found) {
      setOrder(found);
      setLoading(false);
    }

    const fetchDetail = () => {
      if (!orderId || isFetchingRef.current) return;
      isFetchingRef.current = true;
      const thisSeq = ++reqSeqRef.current;

      fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error && thisSeq >= latestHandledSeqRef.current) {
            latestHandledSeqRef.current = thisSeq;
            setOrder((prev) => {
              if (!isMonotonicallySafe(prev, data)) {
                return prev;
              }
              return data;
            });
          }
        })
        .catch((err) => console.error(err))
        .finally(() => {
          isFetchingRef.current = false;
          setLoading(false);
        });
    };

    fetchDetail();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchDetail();
    }, 2000);
    return () => clearInterval(interval);
  }, [orderId, getOrderById]);

  if (loading && !order) {
    return (
      <div className="text-center py-12 text-xs text-zinc-400">
        Locating order specifications...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-xs text-zinc-500">
        Order not found.
      </div>
    );
  }

  // Check if order can be cancelled (only Pending and Confirmed statuses)
  const canCancelOrder = (order: Order): boolean => {
    const cancellableStatuses = ['Pending', 'Confirmed'];
    return cancellableStatuses.includes(order.status);
  };

  // Get delivery promise text
  const getDeliveryPromise = (order: Order): string => {
    if (order.deliveryOption === 'Scheduled' && order.scheduledDeliveryAt) {
      const date = new Date(order.scheduledDeliveryAt);
      return `Scheduled for ${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Within 12 hours';
  };

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setCancellationInProgress(true);
    setCancellationError(null);

    try {
      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          reason: 'Customer requested cancellation'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        setCancellationError(errData.error || `Failed to cancel order (HTTP ${response.status})`);
        setCancellationInProgress(false);
        return;
      }

      // Refresh and show success
      await refreshOrders();
      showToast('Order cancelled successfully', 'success');
      router.push('/account/orders');
    } catch (err) {
      setCancellationError(err instanceof Error ? err.message : 'Failed to cancel order');
      setCancellationInProgress(false);
    }
  };

  const getStepStatus = (stepName: Order['status']) => {
    if (!order) return 'pending';
    const currentIndex = STATUS_PROGRESSION.indexOf(order.status);
    const stepIndex = STATUS_PROGRESSION.indexOf(stepName);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getPaymentStatusLabel = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'PENDING':
        return 'Payment Required';
      case 'PAYMENT_VERIFICATION_PENDING':
        return 'Payment Under Review';
      case 'PAID':
      case 'COMPLETED':
        return 'Payment Successful';
      case 'REJECTED':
        return 'Payment Rejected';
      default:
        return 'Payment Required';
    }
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Top action bar */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <button
            onClick={() => router.push('/account/orders')}
            className="text-brand-burgundy hover:underline flex items-center gap-1 font-bold mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
          </button>
          <h3 className="text-base font-serif font-extrabold text-zinc-800">Order ID: #{order.id}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tracking Timeline */}
        <div className="p-5 border rounded-2xl space-y-4 bg-zinc-50/50">
          <h4 className="font-serif font-extrabold text-zinc-800">Live Delivery Runner Timeline</h4>
          
          <div className="space-y-5 pl-3 relative">
            <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-zinc-200" />
            {STATUS_PROGRESSION.map((step) => {
              const status = getStepStatus(step);
              return (
                <div key={step} className="flex gap-4 items-start relative z-10">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold border text-[11px] transition-colors ${
                    status === 'completed'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : status === 'active'
                      ? 'bg-brand-burgundy border-brand-burgundy text-white shadow'
                      : 'bg-white border-zinc-200 text-zinc-400'
                  }`}>
                    {status === 'completed' ? '✓' : '•'}
                  </div>
                  <div className="pt-1 flex-1">
                    <p className={`font-bold ${status === 'active' ? 'text-brand-burgundy' : 'text-zinc-700'}`}>
                      {step}
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-0.5">
                      {status === 'completed' && 'Completed'}
                      {status === 'active' && 'Active phase'}
                      {status === 'pending' && 'Awaiting'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info detail card */}
        <div className="space-y-6">
          
          {/* Destination */}
          <div className="p-5 border rounded-2xl space-y-2">
            <h4 className="font-serif font-extrabold text-zinc-800 flex items-center gap-1"><MapPin className="h-4 w-4 text-brand-burgundy" /> Delivery Destination</h4>
            <p className="text-zinc-600 leading-relaxed">
              <strong>{order.address.name}</strong> • +91 {order.address.mobile} <br />
              {order.address.house}, {order.address.street}, <br />
              {order.address.area}, {order.address.city} - {order.address.pincode}
            </p>
          </div>

          {/* Items Summary */}
          <div className="p-5 border rounded-2xl space-y-3">
            <h4 className="font-serif font-extrabold text-zinc-800 flex items-center gap-1"><ShoppingBag className="h-4 w-4 text-brand-burgundy" /> Ordered Items</h4>
            <div className="divide-y divide-zinc-50">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-zinc-700">
                  <span>{it.name} x {it.quantity}</span>
                  <span className="font-bold">₹{it.price * it.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2.5 flex justify-between font-bold text-zinc-800">
              <span>Grand Total</span>
              <span className="text-brand-burgundy">₹{order.total}</span>
            </div>
          </div>

          {/* Payment & Delivery Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 border rounded-xl bg-zinc-50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Payment</p>
              <p className="font-bold text-zinc-800 mt-2">{getPaymentStatusLabel(order.paymentStatus)}</p>
            </div>
            <div className="p-4 border rounded-xl bg-zinc-50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Delivery</p>
              <p className="font-bold text-zinc-800 mt-2">{getDeliveryPromise(order)}</p>
            </div>
          </div>

          {/* Pay Button if unpaid */}
          {order.paymentStatus !== 'PAID' && order.status !== 'Cancelled' && (
            <Link
              href={`/order/${order.id}/payment`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-burgundy text-white font-bold text-sm rounded-xl hover:bg-brand-burgundy-dark transition-all shadow"
            >
              <CreditCard className="h-4 w-4" />
              <span>Pay Now with Razorpay (₹{order.total})</span>
            </Link>
          )}

          {/* Cancellation Info / Error */}
          {cancellationError && (
            <div className="p-4 bg-red-100 border border-red-300 text-red-700 text-xs rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>{cancellationError}</div>
            </div>
          )}

          {/* Cancellation Status */}
          {order.status === 'Cancelled' && (
            <div className="p-4 bg-amber-100 border border-amber-300 text-amber-900 text-xs rounded-xl">
              <p className="font-bold">Order Cancelled</p>
              {order.cancellationReason && (
                <p className="mt-1">{order.cancellationReason}</p>
              )}
              {order.cancelledAt && (
                <p className="mt-1 text-[10px] opacity-75">
                  Cancelled on {new Date(order.cancelledAt).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
          )}

          {/* Cancel Button - Only show if cancellable */}
          {canCancelOrder(order) && (
            <button
              onClick={handleCancelOrder}
              disabled={cancellationInProgress}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              <span>{cancellationInProgress ? 'Cancelling...' : 'Cancel This Order'}</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
