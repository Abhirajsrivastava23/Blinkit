'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrders } from '../../../../context/OrderContext';
import { useToast } from '../../../../components/Toast';
import { 
  ArrowLeft, ShoppingBag, MapPin, CreditCard, Clock, 
  CheckCircle, Truck, PackageCheck, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { orders, updateOrderStatus } = useOrders();

  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (id && orders.length > 0) {
      const found = orders.find(o => o.id === id);
      setOrder(found || null);
    }
  }, [id, orders]);

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 text-brand-burgundy animate-spin" />
      </div>
    );
  }

  const handleStatusChange = (status: any) => {
    updateOrderStatus(order.id, status);
    showToast(`Order status updated to ${status}!`, 'success');
  };

  // Timeline step helper
  const getTimelineSteps = () => {
    const steps = [
      { label: 'Order Placed', time: '12:30 PM', desc: 'Received by operations center', completed: true },
      { label: 'Confirmed', time: '12:35 PM', desc: 'Sourcing validation pass', completed: ['Confirmed', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Preparing', time: '12:40 PM', desc: 'Chef assembling & wrapping', completed: ['Preparing', 'Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Packed', time: '12:48 PM', desc: 'Discreet unbranded packaging complete', completed: ['Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Out for Delivery', time: '12:55 PM', desc: 'Assigned to nearest courier runner', completed: ['Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Delivered', time: '01:05 PM', desc: 'Signed confirmation receipt', completed: order.status === 'Delivered' }
    ];
    return steps;
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Top back bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/admin/orders')}
          className="p-1.5 hover:bg-zinc-150 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h3 className="text-lg font-serif font-extrabold text-zinc-800">Order Details</h3>
          <p className="text-xs text-zinc-500">View timeline logs and manage quick delivery fulfillment status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols): Order content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Summary Banner */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-[9px] text-zinc-450 uppercase font-extrabold tracking-widest block">Reference</span>
              <h4 className="text-sm font-bold text-zinc-800">Order #VM{order.id.slice(0, 5).toUpperCase()}</h4>
            </div>
            <div>
              <span className="text-[9px] text-zinc-450 uppercase font-extrabold tracking-widest block">Total Amount</span>
              <p className="text-sm font-bold text-zinc-850">₹{order.total}</p>
            </div>
            <div>
              <span className="text-[9px] text-zinc-450 uppercase font-extrabold tracking-widest block">Payment Status</span>
              <span className="px-2 py-0.5 rounded bg-green-50 text-emerald-700 font-bold tracking-wider text-[9px]">PAID</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-450 uppercase font-extrabold tracking-widest block">Fulfillment</span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700">
                {order.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2">Ordered Items</h4>
            <div className="divide-y">
              {order.items.map((it: any, idx: number) => (
                <div key={idx} className="py-3 flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-800">{it.name}</p>
                    <p className="text-[10px] text-zinc-450">
                      Quantity: {it.quantity} {it.selectedSize && `• Size: ${it.selectedSize}`} {it.selectedType && `• ${it.selectedType}`}
                    </p>
                  </div>
                  <span className="font-bold text-zinc-850">₹{it.price * it.quantity}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t space-y-2 text-right text-xs">
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Subtotal:</span>
                <span>₹{order.total}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Quick Courier Dispatch:</span>
                <span className="text-emerald-700">FREE</span>
              </div>
              <div className="flex justify-between text-zinc-800 font-bold border-t pt-2 text-sm">
                <span>Grand Total:</span>
                <span>₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-3">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1">
              <MapPin className="h-4.5 w-4.5 text-zinc-400 font-bold" /> Shipping Coordinates
            </h4>
            <div className="space-y-1.5 text-zinc-700">
              <p className="font-bold text-zinc-850 text-xs">{order.address.name}</p>
              <p className="leading-relaxed font-medium">
                {order.address.house}, {order.address.street}, {order.address.area}, {order.address.city} - {order.address.pincode}
              </p>
              {order.address.landmark && <p className="text-zinc-500 font-medium">Landmark: {order.address.landmark}</p>}
              <p className="text-[10px] text-zinc-450 font-bold pt-1">Mobile Contact: {order.address.mobile}</p>
            </div>
          </div>

        </div>

        {/* Right Column (4 cols): Tracking timeline & control panel */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          {/* Status Controllers */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-serif font-extrabold text-sm text-zinc-800 border-b pb-2">Status Control</h4>
            <div className="space-y-2.5">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px] block">Pipeline State</label>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] font-bold text-zinc-700 focus:bg-white focus:outline-none focus:border-brand-burgundy"
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Packed">Packed</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => handleStatusChange('Confirmed')}
                className="w-full py-2.5 bg-zinc-800 text-white hover:bg-zinc-950 font-bold uppercase rounded-xl"
              >
                Confirm Order
              </button>
              <button 
                onClick={() => handleStatusChange('Out for Delivery')}
                className="w-full py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold uppercase tracking-wider rounded-xl shadow"
              >
                Dispatch to Courier
              </button>
            </div>
          </div>

          {/* Timeline Tracking */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <h4 className="font-serif font-extrabold text-sm text-zinc-800 border-b pb-2">Delivery Log</h4>
            <div className="relative pl-6 space-y-6 border-l-2 border-zinc-200 ml-2">
              {getTimelineSteps().map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Step point */}
                  <div className={`absolute -left-[30px] top-0 h-4 w-4 rounded-full border-2 ${
                    step.completed ? 'bg-brand-burgundy border-brand-burgundy' : 'bg-white border-zinc-300'
                  }`} />
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`font-bold ${step.completed ? 'text-zinc-800' : 'text-zinc-400'}`}>
                        {step.label}
                      </span>
                      {step.completed && <span className="text-zinc-400 font-mono">{step.time}</span>}
                    </div>
                    <p className="text-[9px] text-zinc-400 font-medium">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
