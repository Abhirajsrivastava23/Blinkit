'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Clock, ArrowLeft, AlertCircle, ShieldCheck, MapPin, ShoppingBag } from 'lucide-react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { Order, STATUS_RANK } from '../../../context/OrderContext';
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
  const { showToast } = useToast();

  const rawParamId = (params.id as string || '').trim();
  let cleanOrderId = rawParamId;
  while (cleanOrderId.includes('%23') || cleanOrderId.includes('%20') || cleanOrderId.includes('%2F')) {
    try {
      const decoded = decodeURIComponent(cleanOrderId);
      if (decoded === cleanOrderId) break;
      cleanOrderId = decoded;
    } catch {
      break;
    }
  }
  const orderId = cleanOrderId.replace(/^#+/, '').trim();

  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reqSeqRef = React.useRef(0);
  const latestHandledSeqRef = React.useRef(0);
  const isFetchingRef = React.useRef(false);

  const isMonotonicallySafe = (current: Order | undefined, incoming: Order): boolean => {
    if (!current) return true;
    const currentRank = STATUS_RANK[current.status] || 0;
    const incomingRank = STATUS_RANK[incoming.status] || 0;

    if (currentRank > incomingRank && current.updatedAt && incoming.updatedAt) {
      if (new Date(current.updatedAt).getTime() > new Date(incoming.updatedAt).getTime()) {
        return false;
      }
    }

    const currentPaid = current.paymentStatus === 'PAID' || currentRank >= 20;
    const incomingPaid = incoming.paymentStatus === 'PAID' || incomingRank >= 20;

    if (currentPaid && !incomingPaid && incoming.paymentStatus !== 'REJECTED') return false;
    return true;
  };

  const fetchOrder = async () => {
    if (!orderId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    const thisSeq = ++reqSeqRef.current;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (thisSeq >= latestHandledSeqRef.current) {
          latestHandledSeqRef.current = thisSeq;
          setOrder((prev) => {
            if (!isMonotonicallySafe(prev, data)) {
              return prev;
            }
            return data;
          });
          setError(null);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (!order) {
          setError(data.error || 'Failed to load order tracking details.');
        }
      }
    } catch (err) {
      console.error(err);
      if (!order) {
        setError('Connection to server failed.');
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrder();
    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchOrder();
    }, 2000);
    return () => {
      window.clearInterval(interval);
    };
  }, [orderId]);

  const handleRegenerateOtp = async () => {
    if (!order) return;
    try {
      const res = await fetch('/api/orders/regenerate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder((prev) => (prev ? { ...prev, deliveryOtp: data.deliveryOtp } : prev));
        showToast('A new delivery OTP has been generated.', 'success');
      } else {
        showToast(data.error || 'Failed to regenerate OTP.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error regenerating OTP.', 'error');
    }
  };

  if (loading && !order) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <Clock className="h-12 w-12 text-brand-burgundy mb-4 animate-spin" />
          <h2 className="text-xl font-bold font-serif">Locating Package...</h2>
          <p className="text-xs text-zinc-400 mt-1">Fetching details for Order ID #{orderId}</p>
        </div>
        <Footer />
      </>
    );
  }

  if (error && !order) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <AlertCircle className="h-12 w-12 text-red-650 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold font-serif text-zinc-800">Access Denied / Order Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">{error}</p>
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

  if (!order) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-[#FAF9F6] flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          <Clock className="h-12 w-12 text-brand-burgundy mb-4 animate-spin" />
          <h2 className="text-xl font-bold font-serif">Loading Order Details...</h2>
        </div>
        <Footer />
      </>
    );
  }

  const mapActualStatusToStep = (actualStatus: string): string => {
    if (['Pending'].includes(actualStatus)) return 'Pending';
    if (['Confirmed'].includes(actualStatus)) return 'Confirmed';
    if (['Preparing', 'Packed', 'Ready for Delivery'].includes(actualStatus)) return 'Preparing';
    if (['Waiting for Partner', 'Assigned', 'Accepted'].includes(actualStatus)) return 'Assigned';
    if (['Picked Up'].includes(actualStatus)) return 'Picked Up';
    if (['Out for Delivery'].includes(actualStatus)) return 'Out for Delivery';
    if (['Delivered'].includes(actualStatus)) return 'Delivered';
    return 'Pending';
  };

  const getStepStatus = (stepName: string) => {
    const steps = ['Pending', 'Confirmed', 'Preparing', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'];
    const currentStep = mapActualStatusToStep(order.status);
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(stepName);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStepCompletedTime = (stepName: string) => {
    if (!order.statusHistory) return '';
    
    const statusMapping: Record<string, string[]> = {
      'Pending': ['Pending'],
      'Confirmed': ['Confirmed'],
      'Preparing': ['Preparing', 'Packed', 'Ready for Delivery'],
      'Assigned': ['Waiting for Partner', 'Assigned', 'Accepted'],
      'Picked Up': ['Picked Up'],
      'Out for Delivery': ['Out for Delivery'],
      'Delivered': ['Delivered']
    };
    
    const statuses = statusMapping[stepName] || [stepName];
    const match = [...order.statusHistory].reverse().find(
      (h: { newStatus: string }) => statuses.includes(h.newStatus)
    );
    
    if (match) {
      return new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
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
          </div>

          {/* Payment Status Alert Banner if not PAID */}
          {order.paymentStatus !== 'PAID' && order.status !== 'Confirmed' && (
            <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              order.paymentStatus === 'REJECTED'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="font-bold">
                  {order.paymentStatus === 'REJECTED'
                    ? '⚠️ Payment Verification Rejected'
                    : order.utr
                    ? '⏳ Payment Under Admin Review'
                    : '💳 UPI Payment Required'}
                </p>
                <p className="text-[11px] opacity-90">
                  {order.paymentStatus === 'REJECTED'
                    ? order.rejectionReason || 'Please resubmit your payment transfer proof.'
                    : order.utr
                    ? 'Your UTR & screenshot are being verified by our team. Order fulfillment begins upon approval.'
                    : 'Please complete your UPI transfer and submit the UTR reference to confirm this order.'}
                </p>
              </div>
              <Link
                href={`/order/${order.id}`}
                className="px-5 py-2.5 bg-brand-burgundy text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-brand-burgundy-dark transition-all shrink-0 shadow"
              >
                {order.paymentStatus === 'REJECTED' ? 'Resubmit Proof' : order.utr ? 'View Payment Details' : 'Pay via UPI'}
              </Link>
            </div>
          )}

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
                
                {['Pending', 'Confirmed', 'Preparing', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'].map((step) => {
                  const status = getStepStatus(step);
                  const completedTime = getStepCompletedTime(step);
                  return (
                    <div key={step} className="flex gap-6 items-start relative z-10 text-xs text-left">
                      
                      {/* Circle Indicator */}
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold border transition-all shrink-0 ${
                        status === 'completed'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : status === 'active'
                          ? 'bg-brand-burgundy border-brand-burgundy text-white shadow-md shadow-brand-burgundy/10'
                          : 'bg-white border-zinc-200 text-zinc-400'
                      }`}>
                        {status === 'completed' ? '✓' : '•'}
                      </div>
                      
                      {/* Step info text */}
                      <div className="pt-1.5 flex-grow">
                        <div className="flex justify-between items-center">
                          <h4 className={`font-bold ${
                            status === 'active' 
                              ? 'text-brand-burgundy text-sm' 
                              : status === 'completed' 
                              ? 'text-zinc-800' 
                              : 'text-zinc-400'
                          }`}>
                            {step === 'Pending' && 'Order Placed'}
                            {step === 'Confirmed' && 'Store Confirmed'}
                            {step === 'Preparing' && 'Kitchen Preparing'}
                            {step === 'Assigned' && 'Partner Assigned'}
                            {step === 'Picked Up' && 'Picked Up from Hub'}
                            {step === 'Out for Delivery' && 'Out for Delivery 🚀'}
                            {step === 'Delivered' && 'Delivered to Doorstep 🎉'}
                          </h4>
                          {completedTime && (
                            <span className="text-[10px] text-zinc-400 font-mono font-bold">{completedTime}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
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
              
              {/* Delivery OTP Verification Panel */}
              <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-serif font-extrabold text-zinc-800 flex items-center gap-1.5 border-b pb-2.5">
                  <ShieldCheck className="h-4 w-4 text-brand-burgundy" /> Delivery Verification
                </h3>
                
                {order.status === 'Delivered' ? (
                  <div className="text-center p-4 bg-green-50 border border-green-100 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-green-700 flex items-center justify-center gap-1">
                      ✓ DELIVERY VERIFIED
                    </span>
                    <p className="text-[10px] text-green-600 font-medium">
                      Your order has been delivered successfully.
                    </p>
                    {order.delivery_completed_at && (
                      <p className="text-[9px] text-zinc-400">
                        Delivered at {new Date(order.delivery_completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {['Out for Delivery'].includes(order.status) ? (
                      <div className="text-center space-y-3">
                        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-1">
                          <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest block">YOUR DELIVERY OTP</span>
                          <span className="text-2xl font-mono font-black text-brand-burgundy tracking-widest block">
                            {order.deliveryOtp || '******'}
                          </span>
                        </div>
                        <p className="text-[9px] text-amber-700 leading-normal font-bold">
                          ⚠️ Share this OTP with the delivery partner only after receiving your order.
                        </p>
                        <button
                          onClick={handleRegenerateOtp}
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-[9px] font-bold uppercase rounded-lg text-zinc-650 transition-all font-sans"
                        >
                          Regenerate OTP
                        </button>
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-zinc-50 border rounded-2xl">
                        <span className="text-2xl font-mono font-black text-zinc-300 tracking-widest block">
                          ******
                        </span>
                        <p className="text-[9px] text-zinc-450 leading-normal mt-2 font-medium">
                          OTP will become available when the runner is Out for Delivery.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                  {order.items.map((item: Order['items'][number], idx: number) => (
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
