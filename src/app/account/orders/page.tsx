'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Truck, AlertTriangle, ShieldAlert, ArrowRight, X, ShieldCheck, RefreshCw, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { useOrders } from '../../../context/OrderContext';
import { useAuth } from '../../../context/AuthContext';
import SafeImage from '../../../components/SafeImage';

export default function AccountOrdersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { orders, isLoading: isOrdersLoading, statusCode: orderStatusCode, refreshOrders } = useOrders();
  const [cancellationInProgress, setCancellationInProgress] = useState<string | null>(null);
  const [cancellationError, setCancellationError] = useState<string | null>(null);

  // Refund Management States
  const [refundRequests, setRefundRequests] = useState<Record<string, any>>({});
  const [refundModalOrder, setRefundModalOrder] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState<string>('Damaged or defective item received');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [submittingRefund, setSubmittingRefund] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState<string | null>(null);

  const fetchRefunds = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/refunds', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.refundRequests && Array.isArray(data.refundRequests)) {
          const map: Record<string, any> = {};
          for (const r of data.refundRequests) {
            const cleanOid = String(r.orderId || '').replace(/^#+/, '').trim().toLowerCase();
            map[cleanOid] = r;
          }
          setRefundRequests(map);
        }
      }
    } catch (e) {
      console.error('Error fetching refunds:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchRefunds();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchRefunds();
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchRefunds]);

  // Redirect to login if unauthenticated once auth finishes loading
  useEffect(() => {
    if (!isAuthLoading) {
      if (!user || orderStatusCode === 401) {
        router.push('/login?callback=/account/orders');
      }
    }
  }, [user, isAuthLoading, orderStatusCode, router]);

  // 1. Auth Loading State
  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="animate-spin h-8 w-8 border-3 border-brand-burgundy border-t-transparent rounded-full"></div>
        <p className="text-sm text-zinc-500 font-medium">Loading your orders...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Let the redirect trigger
  }

  // 2. 403 Forbidden State
  if (orderStatusCode === 403) {
    return (
      <div className="text-center py-12 space-y-4 max-w-md mx-auto">
        <div className="flex justify-center">
          <div className="p-3 bg-red-100 rounded-full">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div>
          <h3 className="text-base font-serif font-bold text-zinc-900">Access Denied</h3>
          <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
            You are not authorized to view these order details. Please verify your credentials or sign in with another account.
          </p>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 px-4 py-2.5 bg-brand-burgundy text-white font-medium text-sm rounded-lg hover:bg-brand-burgundy/90 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  // 3. 500+ Internal Server Error State
  if (orderStatusCode && orderStatusCode >= 500) {
    return (
      <div className="text-center py-12 space-y-4 max-w-md mx-auto">
        <div className="flex justify-center">
          <div className="p-3 bg-amber-100 rounded-full">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <div>
          <h3 className="text-base font-serif font-bold text-zinc-900">Connection Error</h3>
          <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
            We encountered a temporary issue while retrieving your orders. Please try reloading the page.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2.5 border border-zinc-300 text-zinc-700 font-medium text-sm rounded-lg hover:bg-zinc-50 transition-colors"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // 4. Orders Loading State
  if (isOrdersLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="animate-spin h-8 w-8 border-3 border-brand-burgundy border-t-transparent rounded-full"></div>
        <p className="text-sm text-zinc-500 font-medium">Fetching your orders...</p>
      </div>
    );
  }

  // 5. Use orders directly from API (already filtered by server for this authenticated customer)
  // The backend /api/orders endpoint returns only orders belonging to the authenticated session.userId
  // No additional frontend filtering needed - backend filtering is authoritative and secure.

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Cancelled':
      case 'Failed Delivery':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Picked Up':
      case 'Accepted':
      case 'Assigned':
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Preparing':
      case 'Packed':
        return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'Confirmed':
        return 'bg-teal-100 text-teal-700 border border-teal-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
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
      default:
        return 'Payment Pending';
    }
  };

  // Check if order is eligible for refund request
  const canRequestRefund = (order: { status: string; paymentStatus?: string; total: number; id: string }): boolean => {
    const cleanOid = String(order.id).replace(/^#+/, '').trim().toLowerCase();
    const existingReq = refundRequests[cleanOid] || refundRequests[String(order.id).toLowerCase()];
    if (existingReq) return false;

    const pStatus = String(order.paymentStatus || '').toUpperCase();
    const isPaid = pStatus === 'PAID' || pStatus === 'COMPLETED';
    if (!isPaid) return false;

    return order.status === 'Delivered' || order.status === 'Cancelled' || order.status === 'Confirmed';
  };

  const getRefundBadge = (refundReq: any) => {
    if (!refundReq) return null;
    switch (refundReq.status) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold">
            <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            <span>Refund Requested (Under Review)</span>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-xs font-bold">
            <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
            <span>Refund Approved (Processing Gateway)</span>
          </div>
        );
      case 'REFUNDED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Refunded ₹{Number(refundReq.amount || 0).toLocaleString('en-IN')}{refundReq.razorpayRefundId ? ` • ${refundReq.razorpayRefundId}` : ''}</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-800 rounded-full text-xs font-bold" title={refundReq.adminReason || 'Rejected by Admin'}>
            <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
            <span>Refund Request Rejected</span>
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-xs font-bold">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            <span>Refund Processing Issue (Retrying)</span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleOpenRefundModal = (e: React.MouseEvent, order: any) => {
    e.preventDefault();
    e.stopPropagation();
    setRefundModalOrder(order);
    setRefundReason('Damaged or defective item received');
    setRefundNotes('');
    setRefundError(null);
    setRefundSuccessMsg(null);
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalOrder) return;
    setSubmittingRefund(true);
    setRefundError(null);

    try {
      const res = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: refundModalOrder.id,
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
      await fetchRefunds();
      await refreshOrders();
      setTimeout(() => {
        setRefundModalOrder(null);
        setRefundSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setRefundError(err.message || 'Network error submitting refund request.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Check if order can be cancelled (only Pending and Confirmed statuses)
  const canCancelOrder = (order: { status: string }): boolean => {
    const cancellableStatuses = ['Pending', 'Confirmed'];
    return cancellableStatuses.includes(order.status);
  };

  // Get delivery promise text
  const getDeliveryPromise = (order: { deliveryOption: string; scheduledDeliveryAt?: string }): string => {
    if (order.deliveryOption === 'Scheduled' && order.scheduledDeliveryAt) {
      const date = new Date(order.scheduledDeliveryAt);
      return `Scheduled for ${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Within 12 hours';
  };

  // Handle order cancellation
  const handleCancelOrder = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setCancellationInProgress(orderId);
    setCancellationError(null);

    try {
      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          reason: 'Customer requested cancellation'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        setCancellationError(errData.error || `Failed to cancel order (HTTP ${response.status})`);
        setCancellationInProgress(null);
        return;
      }

      await refreshOrders();
      setCancellationInProgress(null);
    } catch (err) {
      setCancellationError(err instanceof Error ? err.message : 'Failed to cancel order');
      setCancellationInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-zinc-100 pb-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-black text-zinc-900">My Orders</h1>
            <p className="text-sm text-zinc-500 mt-2">Track and manage your quick commerce deliveries</p>
          </div>
          {orders.length > 0 && (
            <div className="text-right">
              <span className="text-sm font-medium text-zinc-600">Total Orders</span>
              <p className="text-2xl font-serif font-bold text-brand-burgundy">{orders.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {orders.length === 0 ? (
        <div className="py-16">
          <div className="max-w-sm mx-auto text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-zinc-100 rounded-full">
                <ShoppingBag className="h-12 w-12 text-zinc-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-zinc-900">No orders yet</h3>
              <p className="text-sm text-zinc-500 mt-2">When you place orders, they will appear here. Start exploring FATAFAT&apos;s amazing selection!</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-brand-burgundy text-white font-medium text-sm rounded-lg hover:bg-brand-burgundy/90 transition-colors"
            >
              <span>Start Shopping</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {cancellationError && (
            <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 text-sm rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Cancellation Failed</p>
                <p className="mt-1">{cancellationError}</p>
              </div>
            </div>
          )}
          <div className="space-y-4">
          {orders.map((order) => {
            const cleanOid = String(order.id).replace(/^#+/, '').trim().toLowerCase();
            const rReq = refundRequests[cleanOid] || refundRequests[String(order.id).toLowerCase()];

            return (
            <div
              key={order.id}
              className="border border-zinc-200 rounded-xl p-5 md:p-6 bg-white hover:shadow-md transition-all duration-200"
            >
                
                {/* Header: Order ID, Status, Date */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-4 border-b border-zinc-100">
                  <div className="flex items-center justify-between md:flex-col md:items-start gap-3 flex-1">
                    <div>
                      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Order ID</p>
                      <p className="text-base md:text-lg font-serif font-bold text-brand-burgundy">{order.id}</p>
                    </div>
                    <div className="md:hidden flex items-center gap-2">
                      <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${getStatusBadgeStyles(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 flex-1">
                    <div>
                      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Placed</p>
                      <p className="text-sm font-semibold text-zinc-700">{new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="hidden md:block text-right">
                      <span className={`inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full ${getStatusBadgeStyles(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Refund Status Banner if requested */}
                {rReq && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-zinc-50 to-amber-50/40 border border-zinc-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      {getRefundBadge(rReq)}
                    </div>
                    {rReq.adminReason && rReq.status === 'REJECTED' && (
                      <p className="text-xs text-red-700 font-medium">
                        Admin Note: {rReq.adminReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Items Summary */}
                <div className="mb-4 space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200">
                        <SafeImage
                          src={item.image}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 line-clamp-2">{item.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Qty: {item.quantity}
                          {item.selectedSize && ` • Size: ${item.selectedSize}`}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold text-zinc-900">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery OTP Card */}
                {order.deliveryOtp && order.deliveryOtp !== '******' && order.status !== 'Cancelled' && (
                  <div className="my-3 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200/90 rounded-xl flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-amber-500/10 text-amber-800 rounded-lg flex-shrink-0">
                        <ShieldCheck className="h-5 w-5 text-brand-burgundy" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                          Delivery OTP
                        </p>
                        <p className="text-[11px] text-zinc-600 font-medium leading-tight mt-0.5">
                          Give this OTP to the delivery partner when your order arrives.
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="px-3.5 py-1.5 bg-white border border-amber-300/80 rounded-lg shadow-sm">
                        <span className="font-mono text-lg md:text-xl font-black text-brand-burgundy tracking-widest block">
                          {order.deliveryOtp}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer: Payment, Delivery & Actions */}
                <div className="pt-4 space-y-3 border-t border-zinc-100">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="font-medium text-zinc-500 uppercase tracking-wide">Payment</span>
                      <p className="font-bold text-zinc-900 mt-1">{getPaymentStatusLabel(order.paymentStatus)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-zinc-500 uppercase tracking-wide">Delivery</span>
                      <p className="font-bold text-zinc-900 mt-1">{getDeliveryPromise(order)}</p>
                    </div>
                    <div className="text-right md:text-left">
                      <span className="font-medium text-zinc-500 uppercase tracking-wide">Total</span>
                      <p className="font-bold text-zinc-900 mt-1">₹{order.total.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-burgundy text-white font-medium text-sm rounded-lg hover:bg-brand-burgundy/90 transition-colors"
                    >
                      <span>View Details & Track</span>
                      <Truck className="h-4 w-4" />
                    </Link>

                    {canRequestRefund(order) && (
                      <button
                        onClick={(e) => handleOpenRefundModal(e, order)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-300 text-amber-900 font-bold text-sm rounded-lg hover:bg-amber-100 transition-colors shadow-sm"
                      >
                        <RotateCcw className="h-4 w-4 text-amber-700" />
                        <span>Request Refund</span>
                      </button>
                    )}

                    {canCancelOrder(order) && (
                      <button
                        onClick={(e) => handleCancelOrder(e, order.id)}
                        disabled={cancellationInProgress === order.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 font-medium text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="h-4 w-4" />
                        <span>{cancellationInProgress === order.id ? 'Cancelling...' : 'Cancel Order'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}

      {/* Customer Refund Request Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-zinc-900">Request Refund</h3>
                  <p className="text-xs text-zinc-500">Order #{refundModalOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setRefundModalOrder(null)}
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
                <p className="text-xs text-zinc-500">Redirecting to your updated orders list...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRefund} className="space-y-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-600">Eligible Refund Amount:</span>
                  <span className="font-black text-brand-burgundy text-sm">₹{refundModalOrder.total?.toLocaleString('en-IN')}</span>
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
                    onClick={() => setRefundModalOrder(null)}
                    className="flex-1 py-2.5 px-4 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="flex-1 py-2.5 px-4 bg-brand-burgundy text-white text-xs font-bold rounded-xl hover:bg-brand-burgundy-dark transition-colors shadow flex items-center justify-center gap-2 disabled:opacity-50"
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
