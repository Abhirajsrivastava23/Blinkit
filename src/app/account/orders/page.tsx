'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, Truck, AlertTriangle, ShieldAlert, ArrowRight, X, 
  ShieldCheck, RefreshCw, RotateCcw, CheckCircle2, Clock, Sparkles, 
  ExternalLink, CreditCard, MessageSquare, Calendar, Eye, FileText
} from 'lucide-react';
import { useOrders } from '../../../context/OrderContext';
import { useAuth } from '../../../context/AuthContext';
import SafeImage from '../../../components/SafeImage';

export default function AccountOrdersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { orders, isLoading: isOrdersLoading, statusCode: orderStatusCode, refreshOrders } = useOrders();
  
  // Tab: 'standard' vs 'custom'
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');

  const [cancellationInProgress, setCancellationInProgress] = useState<string | null>(null);
  const [cancellationError, setCancellationError] = useState<string | null>(null);

  // Custom Requests States
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [isLoadingCustomRequests, setIsLoadingCustomRequests] = useState<boolean>(true);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

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

  const fetchCustomRequests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/custom-requests', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.customRequests && Array.isArray(data.customRequests)) {
          setCustomRequests(data.customRequests);
        }
      }
    } catch (e) {
      console.error('Error fetching custom requests:', e);
    } finally {
      setIsLoadingCustomRequests(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRefunds();
    fetchCustomRequests();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchRefunds();
      fetchCustomRequests();
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchRefunds, fetchCustomRequests]);

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

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Cancelled':
      case 'Failed Delivery':
      case 'Not Available':
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
      case 'Paid':
        return 'bg-teal-100 text-teal-700 border border-teal-200';
      case 'Available / Quote Ready':
      case 'Payment Pending':
        return 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse';
      case 'Under Review':
        return 'bg-blue-50 text-blue-800 border border-blue-200';
      case 'Request Submitted':
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

  // Check if order is eligible for refund request (Pre-Preparation only)
  const canRequestRefund = (order: { status: string; paymentStatus?: string; total: number; id: string }): boolean => {
    const cleanOid = String(order.id).replace(/^#+/, '').trim().toLowerCase();
    const existingReq = refundRequests[cleanOid] || refundRequests[String(order.id).toLowerCase()];
    if (existingReq) return false;

    const pStatus = String(order.paymentStatus || '').toUpperCase();
    const isPaid = pStatus === 'PAID' || pStatus === 'COMPLETED';
    if (!isPaid) return false;

    const normStatus = String(order.status || '').toLowerCase().trim();
    const eligiblePrePreparation = ['pending', 'confirmed', 'order placed', 'payment confirmed', 'payment received'];
    return eligiblePrePreparation.includes(normStatus);
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
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-black text-zinc-900">My Orders & Requests</h1>
            <p className="text-sm text-zinc-500 mt-1">Track and manage your deliveries and bespoke personalisation requests</p>
          </div>
          <Link
            href="/personalisation"
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Request Personalisation</span>
          </Link>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 p-1 bg-zinc-100 rounded-xl max-w-md">
          <button
            onClick={() => setActiveTab('standard')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'standard'
                ? 'bg-white text-brand-burgundy shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'custom'
                ? 'bg-white text-brand-burgundy shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Custom Requests ({customRequests.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STANDARD ORDERS                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'standard' && (
        <>
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
                const isCustomOrder = (order as any).isCustomOrder || (order as any).customRequestId;

                return (
                <div
                  key={order.id}
                  className="border border-zinc-200 rounded-xl p-5 md:p-6 bg-white hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                    {/* Custom Order Flag Badge */}
                    {isCustomOrder && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-xs">
                        <Sparkles className="w-3 h-3" />
                        <span>Custom Order</span>
                      </div>
                    )}
                    
                    {/* Header: Order ID, Status, Date */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-4 border-b border-zinc-100">
                      <div className="flex items-center justify-between md:flex-col md:items-start gap-3 flex-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Order ID</p>
                            {isCustomOrder && (
                              <span className="md:hidden px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                                Custom Order
                              </span>
                            )}
                          </div>
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
                              {(item as any).flavour && ` • ${(item as any).flavour}`}
                            </p>
                            {(item as any).cakeMessage && (
                              <p className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                                Inscription: &ldquo;{(item as any).cakeMessage}&rdquo;
                              </p>
                            )}
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

                        {/* Pay Now Button if payment is pending */}
                        {String(order.paymentStatus || '').toUpperCase() === 'PENDING' && order.status !== 'Cancelled' && (
                          <Link
                            href={`/order/${order.id}/payment`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
                          >
                            <CreditCard className="h-4 w-4" />
                            <span>Pay Now (₹{order.total.toLocaleString('en-IN')})</span>
                          </Link>
                        )}

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
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOM REQUESTS & PERSONALISATION                                  */}
      {/* ========================================================================= */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          {isLoadingCustomRequests ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="animate-spin h-8 w-8 border-3 border-amber-500 border-t-transparent rounded-full"></div>
              <p className="text-sm text-zinc-500 font-medium">Loading your custom requests...</p>
            </div>
          ) : customRequests.length === 0 ? (
            <div className="py-16 bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-serif font-bold text-zinc-900">No Custom Requests Yet</h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  Want a customized photo cake, an engraved plaque message, or an unlisted gift item? Submit a request and our team will review and fulfill it!
                </p>
              </div>
              <Link
                href="/personalisation"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-burgundy text-white font-bold text-xs rounded-xl hover:bg-brand-burgundy/90 transition-colors shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                <span>Explore Personalisation</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {customRequests.map((req) => {
                const photo = req.uploadedImageUrl || req.referenceImageUrl;
                const isPaid = String(req.paymentStatus || '').toUpperCase() === 'PAID';
                const hasQuote = req.quotedAmount && Number(req.quotedAmount) > 0;

                return (
                  <div
                    key={req.id}
                    className="border border-zinc-200 rounded-2xl p-5 md:p-6 bg-white hover:shadow-md transition-all duration-200 relative overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-full uppercase tracking-wider">
                            {req.requestType === 'UNLISTED_PRODUCT' ? '✨ Unlisted Bespoke Request' : '🎂 Product Personalisation'}
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">#{req.id}</span>
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 mt-1">{req.productName}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusBadgeStyles(req.status)}`}>
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Photo preview */}
                      {photo && (
                        <div className="md:col-span-1">
                          <div 
                            onClick={() => setZoomImage(photo)}
                            className="relative aspect-square w-full rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 cursor-pointer group shadow-xs"
                          >
                            <SafeImage
                              src={photo}
                              alt="Customer Reference"
                              width={200}
                              height={200}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Zoom</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-400 text-center mt-1">Uploaded Reference Photo</p>
                        </div>
                      )}

                      {/* Request Details */}
                      <div className={photo ? 'md:col-span-3 space-y-3' : 'md:col-span-4 space-y-3'}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                            <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Quantity</span>
                            <span className="font-bold text-zinc-800">{req.quantity || 1} Unit(s)</span>
                          </div>
                          {req.variant && (
                            <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                              <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Size / Weight</span>
                              <span className="font-bold text-zinc-800">{req.variant}</span>
                            </div>
                          )}
                          {req.flavour && (
                            <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                              <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Flavour</span>
                              <span className="font-bold text-zinc-800">{req.flavour}</span>
                            </div>
                          )}
                          {req.preferredDeliveryDate && (
                            <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                              <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Preferred Date</span>
                              <span className="font-bold text-zinc-800">{req.preferredDeliveryDate}</span>
                            </div>
                          )}
                          {req.budget && (
                            <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                              <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Est. Budget</span>
                              <span className="font-bold text-zinc-800">{req.budget}</span>
                            </div>
                          )}
                          <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                            <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Submitted</span>
                            <span className="font-bold text-zinc-800">{new Date(req.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>

                        {/* Personalisation Message */}
                        {req.personalisationMessage && (
                          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                              🎂 Custom Inscription / Message:
                            </span>
                            <p className="font-serif italic font-bold text-zinc-900 mt-0.5 text-sm">
                              &ldquo;{req.personalisationMessage}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Special Instructions / Description */}
                        {(req.specialInstructions || req.requestedDetails) && (
                          <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl text-xs text-zinc-700">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                              Notes & Details:
                            </span>
                            <p className="mt-0.5 font-medium leading-relaxed">
                              {req.specialInstructions || req.requestedDetails}
                            </p>
                          </div>
                        )}

                        {/* Admin Feedback Notes */}
                        {req.adminNotes && (
                          <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-950">
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              FATAFAT Team Update:
                            </span>
                            <p className="mt-1 font-medium leading-relaxed">
                              {req.adminNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer / Quote & Action Buttons */}
                    <div className="pt-4 mt-2 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        {hasQuote ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs text-zinc-500 font-medium">Final Quoted Price:</span>
                            <span className="text-lg font-serif font-black text-brand-burgundy">
                              ₹{Number(req.quotedAmount).toLocaleString('en-IN')}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isPaid ? '✓ Paid' : 'Payment Pending'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 italic">
                            Our team is calculating the best quote for your custom request.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Custom Order Track Button */}
                        {req.customOrderId && (
                          <Link
                            href={`/account/orders/${req.customOrderId}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>View Order #{req.customOrderId}</span>
                          </Link>
                        )}

                        {/* Pay Now Button (if payment link exists or custom order created and unpaid) */}
                        {!isPaid && hasQuote && (req.paymentLinkUrl || req.customOrderId) && (
                          <a
                            href={req.paymentLinkUrl || `/order/${req.customOrderId}/payment`}
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md animate-pulse"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Now (₹{Number(req.quotedAmount).toLocaleString('en-IN')})</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <SafeImage
              src={zoomImage}
              alt="Zoomed Reference"
              width={800}
              height={800}
              className="w-full h-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
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
