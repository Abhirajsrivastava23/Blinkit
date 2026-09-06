'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Truck, MapPin, Clock, ArrowLeft, ShoppingBag, X, AlertTriangle, CreditCard, ShieldCheck, RotateCcw, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
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

  // Refund states
  const [refundReq, setRefundReq] = useState<any | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('Damaged or defective item received');
  const [refundNotes, setRefundNotes] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState<string | null>(null);

  const fetchRefundForOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/refunds?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.refundRequests && data.refundRequests.length > 0) {
          setRefundReq(data.refundRequests[0]);
        }
      }
    } catch (e) {}
  }, [orderId]);

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
    fetchRefundForOrder();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchDetail();
      fetchRefundForOrder();
    }, 2000);
    return () => clearInterval(interval);
  }, [orderId, getOrderById, fetchRefundForOrder]);

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

  const canRequestRefund = (order: Order): boolean => {
    if (refundReq) return false;
    const pStatus = String(order.paymentStatus || '').toUpperCase();
    const isPaid = pStatus === 'PAID' || pStatus === 'COMPLETED';
    if (!isPaid) return false;
    const normStatus = String(order.status || '').toLowerCase().trim();
    const eligiblePrePreparation = ['pending', 'confirmed', 'order placed', 'payment confirmed', 'payment received'];
    return eligiblePrePreparation.includes(normStatus);
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSubmittingRefund(true);
    setRefundError(null);

    try {
      const res = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          reason: refundReason,
          notes: refundNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setRefundError(data.error || 'Failed to submit refund request.');
        setSubmittingRefund(false);
        return;
      }

      setRefundSuccessMsg('Refund request submitted successfully! We are reviewing it.');
      await fetchRefundForOrder();
      await refreshOrders();
      setTimeout(() => {
        setIsRefundModalOpen(false);
        setRefundSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setRefundError(err.message || 'Network error submitting refund request.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const getRefundBadge = () => {
    if (!refundReq) return null;
    switch (refundReq.status) {
      case 'PENDING':
        return (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
              <span>Refund Requested (Under Review)</span>
            </div>
            <span className="text-[11px] font-medium text-amber-700">₹{Number(refundReq.amount || order.total).toLocaleString('en-IN')}</span>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              <span>Refund Approved (Processing Gateway)</span>
            </div>
            <span className="text-[11px] font-medium text-blue-700">₹{Number(refundReq.amount || order.total).toLocaleString('en-IN')}</span>
          </div>
        );
      case 'REFUNDED':
        return (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Refund Processed Successfully</span>
              </div>
              <span className="text-emerald-800">₹{Number(refundReq.amount || order.total).toLocaleString('en-IN')}</span>
            </div>
            {refundReq.razorpayRefundId && (
              <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                Razorpay Refund ID: {refundReq.razorpayRefundId}
              </p>
            )}
          </div>
        );
      case 'REJECTED':
        return (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-xl space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <span>Refund Request Rejected</span>
            </div>
            {refundReq.adminReason && (
              <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                Admin Note: {refundReq.adminReason}
              </p>
            )}
          </div>
        );
      case 'FAILED':
        return (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-2 text-xs font-bold">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>Refund Processing Issue (Support team is investigating)</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getPaymentStatusLabel = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'PENDING':
        return 'Payment Pending';
      case 'PAYMENT_VERIFICATION_PENDING':
      case 'PROCESSING':
        return 'Payment Processing';
      case 'PAID':
      case 'COMPLETED':
        return 'Payment Successful';
      case 'REJECTED':
      case 'FAILED':
        return 'Payment Failed';
      case 'REFUNDED':
        return 'Refunded';
      default:
        return 'Payment Pending';
    }
  };

  const getDeliveryPromise = (order: Order): string => {
    if (order.deliveryOption === 'Scheduled' && order.scheduledDeliveryAt) {
      const date = new Date(order.scheduledDeliveryAt);
      return `Scheduled for ${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Within 12 hours';
  };

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

      await refreshOrders();
      showToast('Order cancelled successfully', 'success');
      setCancellationInProgress(false);
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

          {/* Refund Status Banner */}
          {refundReq && getRefundBadge()}

          {/* Delivery OTP */}
          {order.deliveryOtp && order.status !== 'Cancelled' && (
            <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Delivery OTP</p>
                  <p className="text-[11px] text-emerald-700 font-medium">Give this OTP to the delivery partner when your order arrives.</p>
                </div>
              </div>
              <div className="text-right pl-3">
                <span className="font-mono text-xl md:text-2xl font-black text-emerald-900 tracking-widest bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-inner inline-block">
                  {order.deliveryOtp}
                </span>
              </div>
            </div>
          )}
          
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
              <p className="font-bold text-zinc-800 mt-1">{getPaymentStatusLabel(order.paymentStatus)}</p>
              {order.paymentStatus === 'PAID' && (
                <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                  <span>✅</span> <span>Your payment has been securely verified.</span>
                </p>
              )}
            </div>
            <div className="p-4 border rounded-xl bg-zinc-50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Delivery</p>
              <p className="font-bold text-zinc-800 mt-1">{getDeliveryPromise(order)}</p>
            </div>
          </div>

          {/* Pay Button if unpaid */}
          {order.paymentStatus !== 'PAID' && order.status !== 'Cancelled' && (
            <div className="space-y-2">
              <Link
                href={`/order/${order.id}/payment`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-burgundy text-white font-bold text-sm rounded-xl hover:bg-brand-burgundy-dark transition-all shadow"
              >
                <CreditCard className="h-4 w-4" />
                <span>Pay Now with Razorpay (₹{order.total})</span>
              </Link>
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center gap-3 text-left">
                <span className="text-base shrink-0">🔒</span>
                <div>
                  <h5 className="font-bold text-xs text-slate-800 leading-tight">Secure Payment</h5>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Payments are securely processed and verified by Razorpay.</p>
                </div>
              </div>
            </div>
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

          {/* Request Refund Button if eligible */}
          {canRequestRefund(order) && (
            <button
              onClick={() => {
                setIsRefundModalOpen(true);
                setRefundReason('Damaged or defective item received');
                setRefundNotes('');
                setRefundError(null);
                setRefundSuccessMsg(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 border border-amber-300 text-amber-900 font-bold text-sm rounded-xl hover:bg-amber-100 transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-amber-700" />
              <span>Request Refund for this Order</span>
            </button>
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

      {/* Customer Refund Request Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-zinc-900">Request Refund</h3>
                  <p className="text-xs text-zinc-500">Order #{order.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {refundSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="h-12 w-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-zinc-900 text-base">{refundSuccessMsg}</h4>
                <p className="text-xs text-zinc-500">Updating order status...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRefund} className="space-y-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-600">Eligible Refund Amount:</span>
                  <span className="font-black text-brand-burgundy text-sm">₹{order.total?.toLocaleString('en-IN')}</span>
                </div>

                {refundError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{refundError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide block">
                    Reason for Refund <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:border-brand-burgundy outline-none bg-white font-medium"
                    required
                  >
                    <option value="Damaged or defective item received">Damaged or defective item received</option>
                    <option value="Wrong or missing item in package">Wrong or missing item in package</option>
                    <option value="Quality / freshness issue">Quality / freshness issue</option>
                    <option value="Extreme delivery delay">Extreme delivery delay</option>
                    <option value="Order cancelled / unfulfilled">Order cancelled / unfulfilled</option>
                    <option value="Other concern">Other concern</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide block">
                    Additional Details / Explanation (Optional)
                  </label>
                  <textarea
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    placeholder="Describe the issue in detail to help our admin team process your refund faster..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:border-brand-burgundy outline-none resize-none font-medium placeholder-zinc-400"
                  />
                </div>

                <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  🛡️ <strong>FATAFAT Money-Back Guarantee:</strong> Approved refunds are credited directly to your original payment method (Razorpay UPI/Card/Netbanking) within 2-5 business days.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRefundModalOpen(false)}
                    className="flex-1 py-2.5 px-4 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="flex-1 py-2.5 px-4 bg-brand-burgundy text-white text-xs font-bold rounded-xl hover:bg-brand-burgundy-dark transition-colors shadow flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingRefund ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Refund Request</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
