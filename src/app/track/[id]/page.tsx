'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Truck, MapPin, Clock, CheckCircle2, ChevronRight, RefreshCw, ShoppingBag, ArrowLeft } from 'lucide-react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useOrders, Order } from '../../../context/OrderContext';
import { useToast } from '../../../components/Toast';

const STATUS_PROGRESSION: Order['status'][] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Packed',
  'Out for Delivery',
  'Delivered'
];

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrderById, updateOrderStatus } = useOrders();
  const { showToast } = useToast();

  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | undefined>(undefined);

  // Sync state with Context
  useEffect(() => {
    const found = getOrderById(orderId);
    if (found) {
      setOrder(found);
    }
  }, [orderId, getOrderById]);

  if (!order) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center">
          <Clock className="h-12 w-12 text-brand-burgundy mb-4 animate-spin" />
          <h2 className="text-xl font-bold font-serif">Locating Package...</h2>
          <p className="text-xs text-zinc-400 mt-1">Fetching details for Order ID #{orderId}</p>
          <button
            onClick={() => router.push('/account')}
            className="mt-6 px-6 py-2.5 rounded-full bg-brand-burgundy text-white text-xs font-bold uppercase tracking-wider"
          >
            My Orders
          </button>
        </div>
        <Footer />
      </>
    );
  }

  // Developer simulation helper
  const handleSimulateNextStep = () => {
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
    const currentIndex = STATUS_PROGRESSION.indexOf(order.status);
    const stepIndex = STATUS_PROGRESSION.indexOf(stepName);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <>
      <Header />

      <main className="flex-1 bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1.5 text-center sm:text-left">
              <Link href="/account" className="text-xs text-brand-burgundy hover:underline flex items-center gap-1 font-bold mb-1">
                <ArrowLeft className="h-3 w-3" /> Back to My Orders
              </Link>
              <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-800">
                Track Delivery Runner
              </h1>
              <p className="text-xs text-zinc-500">Order ID: <span className="font-extrabold text-brand-burgundy">#{order.id}</span></p>
            </div>

            {/* Developer Fast Forward button */}
            {order.status !== 'Delivered' && (
              <button
                onClick={handleSimulateNextStep}
                className="flex items-center gap-1 px-4 py-2 bg-brand-gold text-zinc-900 hover:bg-brand-gold-light text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow"
              >
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                Fast-Forward Status
              </button>
            )}
          </div>

          {/* Core Tracking Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Timeline details */}
            <div className="md:col-span-7 bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              
              {/* ETA Panel */}
              <div className="p-5 bg-zinc-50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-brand-burgundy text-white">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Estimated Delivery ETA</p>
                    <h3 className="text-lg font-extrabold text-zinc-800">
                      {order.status === 'Delivered' ? 'Delivered' : order.eta}
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] bg-brand-gold/20 text-[#7A6010] px-3 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse">
                  {order.status}
                </span>
              </div>

              {/* Status Timeline visualizer */}
              <div className="space-y-6 pl-4 relative">
                
                {/* Visual Line connector */}
                <div className="absolute left-[29px] top-4 bottom-4 w-0.5 bg-zinc-100" />
                
                {STATUS_PROGRESSION.map((step) => {
                  const status = getStepStatus(step);
                  return (
                    <div key={step} className="flex gap-6 items-start relative z-10 text-xs">
                      
                      {/* Circle Indicator */}
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold border transition-all ${
                        status === 'completed'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : status === 'active'
                          ? 'bg-brand-burgundy border-brand-burgundy text-white shadow-md shadow-brand-burgundy/10'
                          : 'bg-white border-zinc-200 text-zinc-400'
                      }`}>
                        {status === 'completed' ? '✓' : '•'}
                      </div>
                      
                      {/* Step info text */}
                      <div className="pt-1.5">
                        <h4 className={`font-bold ${
                          status === 'active' 
                            ? 'text-brand-burgundy text-sm' 
                            : status === 'completed' 
                            ? 'text-zinc-800' 
                            : 'text-zinc-400'
                        }`}>
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

            {/* Right Column: Address and Order review */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Delivery Address */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-3 text-xs leading-relaxed">
                <h3 className="text-xs font-serif font-extrabold text-zinc-800 flex items-center gap-1.5 border-b pb-2.5">
                  <MapPin className="h-4 w-4 text-brand-burgundy" /> Delivery Destination
                </h3>
                <p className="text-zinc-700">
                  <strong>{order.address.name}</strong> • +91 {order.address.mobile} <br />
                  {order.address.house}, {order.address.street}, <br />
                  {order.address.area}, {order.address.city} - {order.address.pincode}
                </p>
                {order.address.landmark && (
                  <p className="text-[9px] text-[#7A6010] bg-brand-gold/10 px-2 py-0.5 rounded inline-block mt-1">
                    📍 Landmark: {order.address.landmark}
                  </p>
                )}
              </div>

              {/* Items summary review */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-3">
                <h3 className="text-xs font-serif font-extrabold text-zinc-800 flex items-center gap-1.5 border-b pb-2.5">
                  <ShoppingBag className="h-4 w-4 text-brand-burgundy" /> Included Products
                </h3>
                
                <div className="divide-y divide-zinc-50">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                      <div className="min-w-0">
                        <p className="font-bold truncate text-zinc-800">{item.name}</p>
                        <p className="text-[9px] text-zinc-400">Qty: {item.quantity} {item.selectedSize && `• Size: ${item.selectedSize}`}</p>
                      </div>
                      <span className="font-semibold text-zinc-600">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 flex justify-between text-xs font-bold text-zinc-800">
                  <span>Grand Total Paid</span>
                  <span className="text-brand-burgundy text-sm">₹{order.total}</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
