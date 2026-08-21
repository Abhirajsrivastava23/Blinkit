'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Truck, MapPin, Clock, CheckCircle2, ArrowLeft, RefreshCw, ShoppingBag, Search, AlertCircle } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useOrders, Order } from '../../context/OrderContext';
import { useToast } from '../../components/Toast';

const STATUS_PROGRESSION: Order['status'][] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Packed',
  'Out for Delivery',
  'Delivered'
];

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getOrderById, updateOrderStatus } = useOrders();
  const { showToast } = useToast();

  const queryId = searchParams.get('id') || '';
  const [orderIdInput, setOrderIdInput] = useState(queryId);
  const [order, setOrder] = useState<Order | undefined>(undefined);

  useEffect(() => {
    if (queryId) {
      const found = getOrderById(queryId);
      setOrder(found);
    } else {
      setOrder(undefined);
    }
  }, [queryId, getOrderById]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderIdInput.trim()) {
      router.push(`/track-order?id=${orderIdInput.trim().toUpperCase()}`);
    }
  };

  const handleSimulateNextStep = () => {
    if (!order) return;
    const currentIndex = STATUS_PROGRESSION.indexOf(order.status);
    if (currentIndex > -1 && currentIndex < STATUS_PROGRESSION.length - 1) {
      const nextStatus = STATUS_PROGRESSION[currentIndex + 1];
      updateOrderStatus(order.id, nextStatus);
      showToast(`Simulating status change: ${nextStatus}`, 'info');
    } else {
      showToast('Order is already fully delivered.', 'success');
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
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
      
      <Breadcrumbs />

      {/* Lookup view if no order is active */}
      {!order ? (
        <div className="bg-white border border-zinc-100 rounded-3xl p-8 max-w-md mx-auto shadow-sm space-y-6 text-center">
          <div className="flex justify-center text-brand-burgundy/25">
            <Truck className="h-14 w-14" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-serif font-extrabold text-zinc-800">Track Quick Delivery</h2>
            <p className="text-xs text-zinc-400">Enter your 5-digit Order ID to track our runner live.</p>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. VM10248"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-xs uppercase"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-bold text-xs uppercase rounded-xl transition-all shadow"
            >
              Track Status
            </button>
          </form>

          {queryId && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] flex items-center gap-1.5 justify-center">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Order ID &ldquo;{queryId}&rdquo; not found. Verify character inputs.</span>
            </div>
          )}
        </div>
      ) : (
        /* Timeline View */
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-2xl font-serif font-extrabold text-zinc-800">Live Delivery Timeline</h2>
              <p className="text-xs text-zinc-500">Order ID: <span className="font-extrabold text-brand-burgundy">#{order.id}</span></p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/track-order')}
                className="px-4 py-2 border text-zinc-600 hover:bg-zinc-50 text-xs font-bold uppercase tracking-wider rounded-xl"
              >
                New Search
              </button>

              {order.status !== 'Delivered' && (
                <button
                  onClick={handleSimulateNextStep}
                  className="flex items-center gap-1 px-4 py-2 bg-brand-gold text-zinc-900 hover:bg-brand-gold-light text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow"
                >
                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                  Fast-Forward
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Timeline Column */}
            <div className="md:col-span-7 bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              
              {/* ETA Display */}
              <div className="p-4 bg-zinc-50 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-brand-burgundy" />
                  <div>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase">Estimated ETA</p>
                    <p className="text-sm font-extrabold text-zinc-800">{order.status === 'Delivered' ? 'Delivered' : order.eta}</p>
                  </div>
                </div>
                <span className="text-[9px] bg-brand-gold/10 text-brand-gold-dark px-2 py-0.5 rounded-full font-bold uppercase">
                  {order.status}
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-6 pl-4 relative">
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-zinc-100" />
                {STATUS_PROGRESSION.map((step) => {
                  const status = getStepStatus(step);
                  return (
                    <div key={step} className="flex gap-4 items-start relative z-10 text-xs">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold border transition-colors ${
                        status === 'completed'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : status === 'active'
                          ? 'bg-brand-burgundy border-brand-burgundy text-white shadow'
                          : 'bg-white border-zinc-200 text-zinc-400'
                      }`}>
                        {status === 'completed' ? '✓' : '•'}
                      </div>
                      <div className="pt-1">
                        <h4 className={`font-bold ${status === 'active' ? 'text-brand-burgundy text-sm' : 'text-zinc-800'}`}>
                          {step === 'Pending' && 'Order Received'}
                          {step === 'Confirmed' && 'Store Confirmed'}
                          {step === 'Preparing' && 'Kitchen Chef Preparing'}
                          {step === 'Packed' && 'Handcrafted Box Packed'}
                          {step === 'Out for Delivery' && 'Runner Out for Delivery 🚀'}
                          {step === 'Delivered' && 'Delivered to Doorstep 🎉'}
                        </h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {status === 'completed' && 'Completed step'}
                          {status === 'active' && 'Active - our runner is handling this step'}
                          {status === 'pending' && 'Awaiting previous step completion'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* details panel */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Address */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm space-y-3 text-xs">
                <h3 className="text-xs font-serif font-extrabold text-zinc-800 flex items-center gap-1 border-b pb-2">
                  <MapPin className="h-4 w-4 text-brand-burgundy" /> Delivery Destination
                </h3>
                <p className="text-zinc-600">
                  <strong>{order.address.name}</strong> • +91 {order.address.mobile} <br />
                  {order.address.house}, {order.address.street}, {order.address.area}, {order.address.city} - {order.address.pincode}
                </p>
              </div>

              {/* Items list */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-serif font-extrabold text-zinc-800 flex items-center gap-1 border-b pb-2">
                  <ShoppingBag className="h-4 w-4 text-brand-burgundy" /> Included Products
                </h3>
                <div className="divide-y divide-zinc-50">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs gap-3">
                      <span className="truncate text-zinc-700">{it.name} x {it.quantity}</span>
                      <span className="font-semibold">₹{it.price * it.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2.5 flex justify-between text-xs font-bold text-zinc-800">
                  <span>Total Paid</span>
                  <span className="text-brand-burgundy">₹{order.total}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-[#FAF9F6] py-12">
        <Suspense fallback={<div className="text-center py-20 text-xs">Loading Tracking Details...</div>}>
          <TrackOrderContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
