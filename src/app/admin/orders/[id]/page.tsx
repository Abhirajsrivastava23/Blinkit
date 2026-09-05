'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrders } from '../../../../context/OrderContext';
import { useToast } from '../../../../components/Toast';
import { 
  ArrowLeft, ShoppingBag, MapPin, CreditCard, Clock, 
  CheckCircle, Truck, PackageCheck, AlertCircle, RefreshCw, ShieldCheck 
} from 'lucide-react';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { orders, updateOrderStatus } = useOrders();

  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const fetchOrderDetail = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Unauthorized or order not found.');
      }
    } catch (e) {
      setError('Server error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const handleStatusChange = async (status: any) => {
    if (status === 'Delivered' && !order.delivery_otp_verified) {
      setShowOverrideModal(true);
      return;
    }
    
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, updates: { status } })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder(data.order);
        updateOrderStatus(order.id, status);
        showToast(`Order status updated to ${status}!`, 'success');
      } else {
        showToast(data.error || 'Failed to update order status.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating order status.', 'error');
    }
  };

  const handleConfirmOverride = async () => {
    if (!overrideReason.trim()) {
      showToast('Please enter a reason for the override.', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          updates: {
            status: 'Delivered',
            adminOverrideReason: overrideReason.trim()
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder(data.order);
        updateOrderStatus(order.id, 'Delivered');
        showToast('Emergency override successful. Order marked as Delivered.', 'success');
        setShowOverrideModal(false);
        setOverrideReason('');
      } else {
        showToast(data.error || 'Failed to override verification.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error executing emergency override.', 'error');
    }
  };

  const getStepCompletedTime = (stepLabel: string) => {
    if (!order || !order.statusHistory) return '';
    const mapping: Record<string, string[]> = {
      'Order Placed': ['Pending'],
      'Confirmed': ['Confirmed'],
      'Preparing': ['Preparing', 'Packed', 'Ready for Delivery'],
      'Packed': ['Packed'],
      'Out for Delivery': ['Out for Delivery'],
      'Delivered': ['Delivered']
    };
    const statuses = mapping[stepLabel] || [stepLabel];
    const match = [...order.statusHistory].reverse().find(
      (h: any) => statuses.includes(h.newStatus)
    );
    if (match) {
      return new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  };

  // Timeline step helper
  const getTimelineSteps = () => {
    if (!order) return [];
    
    const steps = [
      { label: 'Order Placed', time: getStepCompletedTime('Order Placed') || '12:30 PM', desc: 'Received by operations center', completed: true },
      { label: 'Confirmed', time: getStepCompletedTime('Confirmed'), desc: 'Sourcing validation pass', completed: ['Confirmed', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Preparing', time: getStepCompletedTime('Preparing'), desc: 'Chef assembling & wrapping', completed: ['Preparing', 'Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Packed', time: getStepCompletedTime('Packed'), desc: 'Discreet unbranded packaging complete', completed: ['Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Out for Delivery', time: getStepCompletedTime('Out for Delivery'), desc: 'Assigned to nearest courier runner', completed: ['Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Delivered', time: getStepCompletedTime('Delivered'), desc: 'Signed confirmation receipt', completed: order.status === 'Delivered' }
    ];
    return steps;
  };

  if (loading && !order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 text-brand-burgundy animate-spin" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-650 animate-bounce" />
        <h3 className="text-sm font-bold text-zinc-800">Error Loading Order</h3>
        <p className="text-xs text-zinc-550">{error}</p>
        <button
          onClick={() => router.push('/admin/orders')}
          className="px-6 py-2.5 bg-brand-burgundy text-white font-bold rounded-xl uppercase tracking-wider text-[10px]"
        >
          Back to Orders List
        </button>
      </div>
    );
  }

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
              <h4 className="text-sm font-bold text-zinc-800">Order #{order.id}</h4>
            </div>
            <div>
              <span className="text-[9px] text-zinc-450 uppercase font-extrabold tracking-widest block">Total Amount</span>
              <p className="text-sm font-bold text-zinc-850">₹{order.total}</p>
            </div>
            <div>
              <span className="text-[9px] text-zinc-450 uppercase font-extrabold tracking-widest block">Payment Status</span>
              <span className={`px-2 py-0.5 rounded font-bold tracking-wider text-[9px] ${
                order.paymentStatus === 'PAID' ? 'bg-green-50 text-emerald-700' :
                order.paymentStatus === 'REJECTED' ? 'bg-red-50 text-red-700' :
                'bg-amber-50 text-amber-700'
              }`}>
                {order.paymentStatus || 'PENDING'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-450 uppercase font-extrabold tracking-widest block">Fulfillment</span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700">
                {String(order.status || 'Pending').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2">Ordered Items</h4>
            <div className="divide-y">
              {Array.isArray(order.items) && order.items.length > 0 ? (
                order.items.map((it: any, idx: number) => (
                  <div key={idx} className="py-3 flex justify-between items-center text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-zinc-800">{it.name || 'Product'}</p>
                      <p className="text-[10px] text-zinc-450">
                        Quantity: {it.quantity || 1} {it.selectedSize && `• Size: ${it.selectedSize}`} {it.selectedType && `• ${it.selectedType}`}
                      </p>
                    </div>
                    <span className="font-bold text-zinc-850">₹{Number(it.price || 0) * Number(it.quantity || 1)}</span>
                  </div>
                ))
              ) : (
                <div className="py-3 text-xs text-zinc-400 italic">No item details recorded</div>
              )}
            </div>

            <div className="pt-3 border-t space-y-2 text-right text-xs">
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Subtotal:</span>
                <span>₹{order.subtotal || order.total || 0}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Quick Courier Dispatch:</span>
                <span className="text-emerald-700">{order.deliveryFee ? `₹${order.deliveryFee}` : 'FREE'}</span>
              </div>
              <div className="flex justify-between text-zinc-800 font-bold border-t pt-2 text-sm">
                <span>Grand Total:</span>
                <span>₹{order.total || 0}</span>
              </div>
            </div>
          </div>

          {/* Razorpay Gateway Audit */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-3">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1.5">
              <CreditCard className="h-4.5 w-4.5 text-zinc-400 font-bold" /> Razorpay Payment Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700">
              <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Razorpay Payment ID</span>
                <span className="font-mono font-bold text-zinc-900 text-xs select-all">
                  {order.razorpayPaymentId || 'N/A (Awaiting or Not Recorded)'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Razorpay Order ID</span>
                <span className="font-mono font-bold text-zinc-900 text-xs select-all">
                  {order.razorpayOrderId || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Method & Provider</span>
                <span className="font-semibold text-zinc-800 text-xs">
                  {order.paymentMethod || 'Razorpay'} • {order.paymentProvider || 'RAZORPAY'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Gateway Status</span>
                <span className={`font-bold text-xs ${order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {order.paymentStatus === 'PAID' ? '✓ Verified & Captured' : (order.paymentStatus || 'PENDING')}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-3">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1">
              <MapPin className="h-4.5 w-4.5 text-zinc-400 font-bold" /> Shipping Coordinates
            </h4>
            <div className="space-y-1.5 text-zinc-700">
              <p className="font-bold text-zinc-850 text-xs">{order.address?.name || 'Customer'}</p>
              <p className="leading-relaxed font-medium">
                {order.address?.house ? `${order.address.house}, ` : ''}
                {order.address?.street ? `${order.address.street}, ` : ''}
                {order.address?.area ? `${order.address.area}, ` : ''}
                {order.address?.city || ''}{order.address?.pincode ? ` - ${order.address.pincode}` : ''}
              </p>
              {order.address?.landmark && <p className="text-zinc-500 font-medium">Landmark: {order.address.landmark}</p>}
              <p className="text-[10px] text-zinc-450 font-bold pt-1">Mobile Contact: {order.address?.mobile || order.address?.phone || 'N/A'}</p>
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

          {/* OTP & Delivery Verification Log */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <h4 className="font-serif font-extrabold text-sm text-zinc-800 border-b pb-2">OTP Verification Log</h4>
            <div className="space-y-3 font-medium text-zinc-650">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-400">OTP Status:</span>
                <span className="font-extrabold text-zinc-800">
                  {order.delivery_otp_verified ? (
                    <span className="text-emerald-700 font-bold">✓ VERIFIED</span>
                  ) : order.otpExpiresAt && new Date() > new Date(order.otpExpiresAt) ? (
                    <span className="text-red-600 font-bold font-sans">EXPIRED</span>
                  ) : order.status === 'Out for Delivery' ? (
                    <span className="text-amber-700 font-bold animate-pulse">PENDING</span>
                  ) : (
                    <span className="text-zinc-400 font-bold">AWAITING DISPATCH</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-400">Client Delivery OTP:</span>
                <span className="font-black text-brand-burgundy font-mono text-xs">{order.deliveryOtp || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-400">Failed OTP Attempts:</span>
                <span className={`font-bold ${order.otpFailedAttempts >= 5 ? 'text-red-600 font-sans' : 'text-zinc-800'}`}>
                  {order.otpFailedAttempts || 0} / 5
                </span>
              </div>
              {order.delivery_otp_verified && (
                <>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-zinc-400">Verification Time:</span>
                    <span className="font-bold text-zinc-800">
                      {order.otp_verified_at ? new Date(order.otp_verified_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-zinc-400">Verified by Partner:</span>
                    <span className="font-bold text-zinc-800">{order.assignedPartnerName || order.verified_by_partner_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-zinc-400">Partner ID:</span>
                    <span className="font-bold text-zinc-850">{order.verified_by_partner_id || 'N/A'}</span>
                  </div>
                </>
              )}
              {order.adminOverride && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-1.5 mt-2">
                  <span className="text-[9px] font-black text-red-700 tracking-wider block uppercase font-sans">⚠️ EMERGENCY ADMIN OVERRIDE</span>
                  <p className="text-[10px] text-red-700 leading-normal">
                    <strong>Reason:</strong> {order.adminOverride.reason}
                  </p>
                  <p className="text-[8px] text-zinc-400 font-semibold leading-none">
                    By Admin: {order.adminOverride.adminId} • {new Date(order.adminOverride.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
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

      {/* Override dialog overlay */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-xl text-left">
            <div className="space-y-1 text-zinc-800">
              <h4 className="text-sm font-serif font-extrabold text-red-650 flex items-center gap-1">
                ⚠️ Emergency Admin Override
              </h4>
              <p className="text-[10px] text-zinc-500 leading-normal font-sans">
                You are bypassing the delivery OTP verification check for Order #{order.id}. This action will be logged.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-zinc-450 uppercase tracking-widest block font-sans">Reason for Override</label>
              <textarea
                rows={3}
                placeholder="e.g. Customer verified package delivery but has lost mobile connection..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-[#FAF9F6] text-xs font-semibold text-zinc-700 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex gap-3 text-[10px]">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideReason('');
                }}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-650 font-bold rounded-xl uppercase tracking-wider font-sans"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-750 text-white font-bold rounded-xl uppercase tracking-wider font-sans"
              >
                Confirm & Mark Delivered
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
