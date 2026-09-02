'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Truck, AlertTriangle, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { useOrders } from '../../../context/OrderContext';
import { useAuth } from '../../../context/AuthContext';

export default function AccountOrdersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { orders, isLoading: isOrdersLoading, statusCode: orderStatusCode, refreshOrders } = useOrders();
  const [cancellationInProgress, setCancellationInProgress] = useState<string | null>(null);
  const [cancellationError, setCancellationError] = useState<string | null>(null);

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
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
    }
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
      case 'FAILED':
        return 'Payment Failed';
      default:
        return 'Payment Required';
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

      // Refresh orders list
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
          {orders.map((order) => (
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
                    <div className="md:hidden">
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

                {/* Items Summary */}
                <div className="mb-4 space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200">
                        <Image
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
            ))}
          </div>
        </>
      )}
    </div>
  );
}
