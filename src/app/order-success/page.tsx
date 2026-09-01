'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Truck, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useOrders, Order } from '../../context/OrderContext';
import { useToast } from '../../components/Toast';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getOrderById } = useOrders();
  const { showToast } = useToast();
  
  const orderId = searchParams.get('orderId') || '';
  const order = orderId ? getOrderById(orderId) : undefined;
  const paymentStatusLabel = order?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING'
    ? 'Payment Submitted — Awaiting Admin Verification'
    : order?.status === 'Confirmed' || order?.paymentStatus === 'PAID'
      ? 'Order Confirmed'
      : 'Order Received — Awaiting Payment Verification';

  if (!orderId || !order) {
    return (
      <div className="mx-auto max-w-md w-full px-4 text-center py-16 space-y-4">
        <CheckCircle2 className="h-12 w-12 text-brand-burgundy mb-4 animate-bounce mx-auto" />
        <h2 className="text-xl font-bold font-serif">Verifying Checkout Details...</h2>
        <p className="text-xs text-zinc-400 mt-1">If this takes longer, you can check active order lists inside your Account dashboard.</p>
        <button
          onClick={() => router.push('/account/orders')}
          className="mt-6 px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider"
        >
          Go to My Orders
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl w-full px-4 py-8">
      <div className="bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm text-center space-y-6">
        
        {/* Checkmark icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
            <CheckCircle2 className="h-10 w-10" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-800">
            {paymentStatusLabel}
          </h1>
          <p className="text-xs text-zinc-500">
            {order.paymentStatus === 'PAYMENT_VERIFICATION_PENDING'
              ? 'Your payment proof has been submitted. We will confirm the order only after admin verification.'
              : order.status === 'Confirmed' || order.paymentStatus === 'PAID'
                ? 'Thank you for celebrating with FATAFAT. Your delivery runner is being assigned.'
                : 'Your order has been received. Please complete the UPI verification step to receive final confirmation.'}
          </p>
        </div>

        {/* Info panel */}
        <div className="p-5 bg-[#FAF9F6] border border-zinc-100 rounded-2xl text-xs space-y-3 text-left">
          <div className="flex justify-between border-b pb-2.5">
            <span className="text-zinc-400 font-bold">Order ID</span>
            <span className="font-extrabold text-brand-burgundy">#{order.id}</span>
          </div>
          <div className="flex justify-between border-b pb-2.5">
            <span className="text-zinc-400 font-bold">Total Paid</span>
            <span className="font-extrabold">₹{order.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400 font-bold">ETA</span>
            <span className="font-extrabold flex items-center gap-1 text-green-700">
              <Truck className="h-4 w-4" /> Within 12 hours
            </span>
          </div>
        </div>

        {/* Micro-timeline visualizer */}
        <div className="py-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-left mb-4">Initial Setup Timeline</h3>
          <div className="grid grid-cols-5 gap-1.5 text-[9px] font-bold text-center text-zinc-400">
            <div className="space-y-1 text-emerald-600">
              <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">✓</div>
              <p>Confirmed</p>
            </div>
            <div className="space-y-1 text-zinc-600 animate-pulse">
              <div className="h-6 w-6 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mx-auto">○</div>
              <p>Preparing</p>
            </div>
            <div className="space-y-1">
              <div className="h-6 w-6 rounded-full bg-zinc-50 border flex items-center justify-center mx-auto">○</div>
              <p>Packed</p>
            </div>
            <div className="space-y-1">
              <div className="h-6 w-6 rounded-full bg-zinc-50 border flex items-center justify-center mx-auto">○</div>
              <p>Shipping</p>
            </div>
            <div className="space-y-1">
              <div className="h-6 w-6 rounded-full bg-zinc-50 border flex items-center justify-center mx-auto">○</div>
              <p>Delivered</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href={`/track-order?id=${order.id}`}
            className="px-8 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-burgundy/10 group"
          >
            Track Delivery <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          
          <Link
            href="/"
            className="px-8 py-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 border-t pt-4 border-dashed">
          <ShieldCheck className="h-4 w-4 text-brand-gold" />
          <span>Compliant discreet packaging holds privacy for all sensitive products.</span>
        </div>

      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-16 flex items-center justify-center">
        <Suspense fallback={<div className="text-center py-20 text-xs">Loading Success Context...</div>}>
          <OrderSuccessContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
