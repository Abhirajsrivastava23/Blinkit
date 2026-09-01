'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, ShoppingBag, Truck, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useOrders, Order } from '../../../context/OrderContext';
import { useToast } from '../../../components/Toast';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderById } = useOrders();
  const { showToast } = useToast();
  
  const orderId = params.id as string;
  const order = getOrderById(orderId);
  const paymentStatusLabel = order?.paymentStatus === 'PAYMENT_VERIFICATION_PENDING'
    ? 'Payment Submitted — Awaiting Admin Verification'
    : order?.status === 'Confirmed' || order?.paymentStatus === 'PAID'
      ? 'Order Confirmed! 🎉'
      : 'Order Received — Awaiting Payment Verification';

  if (!order) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-brand-burgundy mb-4 animate-bounce" />
          <h2 className="text-xl font-bold font-serif">Verifying Order...</h2>
          <p className="text-xs text-zinc-400 mt-1">If this takes too long, please check your Account orders section.</p>
          <button
            onClick={() => router.push('/account')}
            className="mt-6 px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider"
          >
            Go to My Orders
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="flex-1 bg-[#FAF9F6] py-16 flex items-center justify-center">
        <div className="mx-auto max-w-xl w-full px-4">
          <div className="bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm text-center space-y-6">
            
            {/* Confirmation Header */}
            <div className="flex justify-center">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full animate-pulse">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-800">
                {paymentStatusLabel}
              </h1>
              <p className="text-xs text-zinc-500">
                {order.paymentStatus === 'PAYMENT_VERIFICATION_PENDING'
                  ? 'Your payment proof is under review. The order will be confirmed only after admin approval.'
                  : order.status === 'Confirmed' || order.paymentStatus === 'PAID'
                    ? 'Thank you for choosing FATAFAT. Your delivery runner will be assigned shortly.'
                    : 'Your order has been received. Please complete the UPI verification step to receive final confirmation.'}
              </p>
            </div>

            {/* Order specs block */}
            <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs space-y-3 max-w-md mx-auto text-left">
              <div className="flex justify-between border-b pb-2.5">
                <span className="text-zinc-400 font-bold">Order ID</span>
                <span className="font-extrabold text-brand-burgundy">#{order.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2.5">
                <span className="text-zinc-400 font-bold">Total Charged</span>
                <span className="font-extrabold">₹{order.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold">Estimated Delivery</span>
                <span className="font-extrabold flex items-center gap-1 text-green-700">
                  <Truck className="h-4 w-4" /> Within 12 hours
                </span>
              </div>
            </div>

            {/* Micro status timeline preview */}
            <div className="max-w-md mx-auto py-2">
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

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href={`/track/${order.id}`}
                className="px-8 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-burgundy/10 group"
              >
                Track Order <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              
              <Link
                href="/"
                className="px-8 py-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center"
              >
                Continue Shopping
              </Link>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-brand-gold" />
              <span>Compliant discreet packaging holds privacy for all sensitive products.</span>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
