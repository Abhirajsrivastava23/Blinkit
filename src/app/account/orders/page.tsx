'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Truck, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import { useOrders } from '../../../context/OrderContext';
import { useAuth } from '../../../context/AuthContext';

export default function AccountOrdersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { orders, isLoading: isOrdersLoading, statusCode: orderStatusCode } = useOrders();

  // Redirect to login if unauthenticated once auth finishes loading
  useEffect(() => {
    if (!isAuthLoading) {
      if (!user || user.email === 'guest@fatafat.com' || orderStatusCode === 401) {
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

  if (!user || user.email === 'guest@fatafat.com') {
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
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="group"
            >
              <div className="border border-zinc-200 rounded-xl p-5 md:p-6 bg-white hover:border-brand-burgundy/30 hover:shadow-md transition-all duration-200 cursor-pointer">
                
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

                {/* Footer: Total & Action */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Charged</span>
                    <span className="text-xl font-serif font-bold text-zinc-900">₹{order.total.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-brand-burgundy font-medium text-sm group-hover:gap-3 transition-all">
                    <span>View Details & Track</span>
                    <Truck className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
