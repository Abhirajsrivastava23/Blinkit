'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Truck, MapPin, Clock, ArrowLeft, RefreshCw, ShoppingBag } from 'lucide-react';
import { useOrders, Order } from '../../../../context/OrderContext';
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
  const { getOrderById, updateOrderStatus } = useOrders();
  const { showToast } = useToast();

  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | undefined>(undefined);

  useEffect(() => {
    const found = getOrderById(orderId);
    setOrder(found);
  }, [orderId, getOrderById]);

  if (!order) {
    return (
      <div className="text-center py-12 text-xs text-zinc-400">
        Locating order specifications...
      </div>
    );
  }

  const handleSimulateNextStep = () => {
    const currentIndex = STATUS_PROGRESSION.indexOf(order.status);
    if (currentIndex > -1 && currentIndex < STATUS_PROGRESSION.length - 1) {
      const nextStatus = STATUS_PROGRESSION[currentIndex + 1];
      updateOrderStatus(order.id, nextStatus);
      showToast(`Simulating status change: ${nextStatus}`, 'info');
      // Refresh local copy
      setOrder(getOrderById(orderId));
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

        {order.status !== 'Delivered' && (
          <button
            onClick={handleSimulateNextStep}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-gold hover:bg-brand-gold-light text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Fast-Forward
          </button>
        )}
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

        </div>

      </div>

    </div>
  );
}
