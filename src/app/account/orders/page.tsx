'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Truck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useOrders } from '../../../context/OrderContext';
import { useAuth } from '../../../context/AuthContext';

export default function AccountOrdersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { orders, isLoading: isOrdersLoading, error: orderError, statusCode: orderStatusCode } = useOrders();

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
      <div className="flex flex-col items-center justify-center py-16 space-y-2">
        <span className="animate-spin h-6 w-6 border-2 border-brand-burgundy border-t-transparent rounded-full"></span>
        <p className="text-xs text-zinc-500 font-medium">Verifying credentials...</p>
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
        <div className="flex justify-center text-red-500">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h3 className="text-sm font-bold font-serif text-red-800">Access Denied</h3>
        <p className="text-xs text-red-600 leading-relaxed">
          You are not authorized to view these order details. Please verify your credentials or sign in with another account.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-brand-burgundy text-white font-serif font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
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
        <div className="flex justify-center text-amber-500">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h3 className="text-sm font-bold font-serif text-amber-800">Server Connection Error</h3>
        <p className="text-xs text-amber-600 leading-relaxed">
          We encountered a connection issue while retrieving your history list. Please try reloading the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // 4. Orders Loading State
  if (isOrdersLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-2">
        <span className="animate-spin h-6 w-6 border-2 border-brand-burgundy border-t-transparent rounded-full"></span>
        <p className="text-xs text-zinc-500 font-medium">Fetching orders list...</p>
      </div>
    );
  }

  // 5. Filter orders safely mapping all canonical ID keys (migration safe)
  const customerOrders = orders.filter(o => {
    if (user.email && o.customerEmail && o.customerEmail.toLowerCase() === user.email.toLowerCase()) {
      return true;
    }
    if (user.email && o.customerId && o.customerId.toLowerCase() === user.email.toLowerCase()) {
      return true;
    }
    if (user.phone && o.customerId && o.customerId.toLowerCase() === user.phone.toLowerCase()) {
      return true;
    }
    if (user.googleProviderId && o.customerId && o.customerId.toLowerCase() === user.googleProviderId.toLowerCase()) {
      return true;
    }
    return false;
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif font-extrabold text-zinc-800">My Orders</h3>
        <p className="text-xs text-zinc-500">Track and view history of your quick commerce deliveries.</p>
      </div>

      {customerOrders.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="flex justify-center text-zinc-300">
            <ShoppingBag className="h-12 w-12" />
          </div>
          <h4 className="text-sm font-bold font-serif text-zinc-800">No orders yet</h4>
          <p className="text-xs text-zinc-400">When you place orders, they will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {customerOrders.map((order) => (
            <div
              key={order.id}
              className="border border-zinc-100 rounded-2xl p-5 hover:border-brand-burgundy/10 transition-colors space-y-4 text-xs bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-zinc-100">
                <div>
                  <span className="text-zinc-400 font-bold">Order ID:</span>{' '}
                  <span className="font-extrabold text-brand-burgundy">{order.id}</span>
                </div>
                <div>
                  <span className="text-zinc-400 font-medium">Placed:</span>{' '}
                  <span className="font-semibold text-zinc-700">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 font-medium">Status:</span>{' '}
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase ${
                    order.status === 'Delivered'
                      ? 'bg-green-100 text-green-700'
                      : order.status === 'Cancelled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-brand-gold/20 text-brand-gold-dark'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-8 w-8 object-cover rounded-md border"
                    />
                    <div className="flex-1 truncate">
                      <p className="font-bold truncate text-zinc-800">{item.name}</p>
                      <p className="text-[9px] text-zinc-400">Qty: {item.quantity} {item.selectedSize && `• Size: ${item.selectedSize}`}</p>
                    </div>
                    <span className="font-semibold text-zinc-700">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Total & Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-zinc-100">
                <div>
                  <span className="text-zinc-400 font-medium">Total Charged:</span>{' '}
                  <span className="font-extrabold text-sm text-zinc-800">₹{order.total}</span>
                </div>
                
                <Link
                  href={`/account/orders/${order.id}`}
                  className="w-full sm:w-auto px-4 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Truck className="h-3.5 w-3.5" /> View Details & Track
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
