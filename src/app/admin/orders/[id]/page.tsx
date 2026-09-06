'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrders } from '../../../../context/OrderContext';
import { useToast } from '../../../../components/Toast';
import SafeImage from '../../../../components/SafeImage';
import { generateOrderPdf } from '../../../../utils/generateOrderPdf';
import { 
  ArrowLeft, ShoppingBag, MapPin, CreditCard, Clock, 
  CheckCircle, Truck, PackageCheck, AlertCircle, RefreshCw, 
  ShieldCheck, FileDown, Printer, User, Phone, Mail, 
  Sparkles, Gift, Camera, PenTool, ExternalLink, X, ZoomIn, Copy
} from 'lucide-react';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { updateOrderStatus } = useOrders();

  const id = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Order not found.');
      }
    } catch {
      setError('Server error connecting to database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      void fetchOrderDetail();
    }
  }, [id]);

  const handleStatusChange = async (status: string) => {
    if (status === 'Delivered' && !order?.delivery_otp_verified) {
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
        updateOrderStatus(order.id, status as any);
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

  const handleDownloadPdf = async () => {
    if (!order) return;
    setIsPdfGenerating(true);
    showToast('Generating official FATAFAT Order PDF...', 'info');
    try {
      const success = await generateOrderPdf(order);
      if (success) {
        showToast(`PDF Invoice for Order #${order.id} downloaded successfully!`, 'success');
      } else {
        showToast('Failed to generate PDF invoice.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error downloading PDF invoice.', 'error');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleCopyOrderId = () => {
    if (order?.id) {
      navigator.clipboard.writeText(order.id);
      showToast(`Copied Order #${order.id} to clipboard!`, 'success');
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
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

  const getTimelineSteps = () => {
    if (!order) return [];
    return [
      { label: 'Order Placed', time: getStepCompletedTime('Order Placed') || formatDateTime(order.createdAt), desc: 'Received by operations center', completed: true },
      { label: 'Confirmed', time: getStepCompletedTime('Confirmed'), desc: 'Sourcing & inventory reserved', completed: ['Confirmed', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Preparing', time: getStepCompletedTime('Preparing'), desc: 'Handcrafting & customising product', completed: ['Preparing', 'Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Packed', time: getStepCompletedTime('Packed'), desc: 'Quality checked & celebratory packaging ready', completed: ['Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Out for Delivery', time: getStepCompletedTime('Out for Delivery'), desc: 'Assigned to nearest courier partner', completed: ['Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Delivered', time: getStepCompletedTime('Delivered'), desc: 'Doorstep OTP verified & signed', completed: order.status === 'Delivered' }
    ];
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

  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.address || {};
  const customerName = address.name || order.customerName || 'Customer';
  const customerMobile = address.mobile || address.phone || order.customerPhone || 'N/A';
  const customerEmail = order.customerEmail || 'N/A';

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Top Header Bar with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/orders')}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600"
            title="Back to Orders"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-serif font-black text-zinc-900">Order #{order.id}</h3>
              <button 
                onClick={handleCopyOrderId}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded transition-colors"
                title="Copy Order ID"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 font-medium">Placed on {formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded-xl flex items-center gap-1.5 transition-colors text-[10px]"
            title="Print invoice window"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            className="px-4 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all shadow text-[10px] disabled:opacity-50"
            title="Download Official PDF Invoice"
          >
            {isPdfGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            Download PDF
          </button>

          <button
            onClick={fetchOrderDetail}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition-colors"
            title="Refresh order data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols): Order content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Summary Status Banner */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest block">Reference</span>
              <h4 className="text-sm font-bold text-zinc-800">#{order.id}</h4>
              <span className="text-[9px] text-zinc-400 font-mono block mt-0.5">{order.deliveryLocationName || 'Nawabganj, Unnao'}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest block">Grand Total</span>
              <p className="text-base font-black text-brand-burgundy">₹{order.total}</p>
              <span className="text-[9px] text-zinc-400 block">{items.length} item{items.length === 1 ? '' : 's'}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest block">Payment</span>
              <span className={`inline-block px-2 py-0.5 rounded font-extrabold tracking-wider text-[9px] mt-1 ${
                order.paymentStatus === 'PAID' ? 'bg-green-50 text-emerald-700 border border-emerald-200/25' :
                order.paymentStatus === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200/25' :
                'bg-amber-50 text-amber-700 border border-amber-200/25'
              }`}>
                {order.paymentStatus === 'PAID' ? '✓ PAID' : (order.paymentStatus || 'PENDING')}
              </span>
              <span className="text-[9px] text-zinc-400 block mt-0.5">{order.paymentMethod || 'Razorpay'}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest block">Fulfillment</span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black bg-brand-burgundy/10 text-brand-burgundy mt-1">
                {String(order.status || 'Pending').toUpperCase()}
              </span>
              <span className="text-[9px] text-zinc-400 block mt-0.5">
                {order.deliveryOption === 'Scheduled' ? `Slot: ${order.deliveryTimeSlot || ''}` : 'ASAP Delivery'}
              </span>
            </div>
          </div>

          {/* Customer & Address Two-Column Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Details */}
            <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1.5">
                <User className="h-4 w-4 text-zinc-400" /> Customer Information
              </h4>
              <div className="space-y-2 text-zinc-700">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Full Name</span>
                  <p className="font-bold text-zinc-800 text-xs">{customerName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Mobile Contact</span>
                    <a href={`tel:${customerMobile}`} className="font-bold text-brand-burgundy hover:underline text-xs">
                      {customerMobile}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Email Address</span>
                    <a href={`mailto:${customerEmail}`} className="font-medium text-zinc-700 hover:underline text-xs truncate max-w-[200px] block">
                      {customerEmail}
                    </a>
                  </div>
                </div>
                {order.customerId && (
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Customer ID</span>
                    <p className="font-mono text-[9px] text-zinc-500 select-all">{order.customerId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-zinc-400" /> Shipping & Delivery Coordinates
              </h4>
              <div className="space-y-2 text-zinc-700 font-medium">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Recipient Address</span>
                  <p className="leading-relaxed font-semibold text-zinc-850">
                    {[address.house, address.street, address.area].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-zinc-600 font-bold">
                    {[address.city, address.pincode].filter(Boolean).join(' - ')}
                  </p>
                </div>
                {address.landmark && (
                  <div className="p-2 bg-[#FAF9F6] rounded-xl border border-zinc-150">
                    <span className="text-[8px] text-zinc-400 uppercase font-extrabold tracking-wider block">Landmark</span>
                    <p className="text-zinc-700 font-medium">{address.landmark}</p>
                  </div>
                )}
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Delivery Zone</span>
                  <p className="font-bold text-zinc-800">{order.deliveryLocationName || 'Nawabganj, Unnao'}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Ordered Items & Complete Customisation Details Card */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-zinc-400" /> Ordered Items & Customer Customisations
              </h4>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {items.length} SKU{items.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y space-y-4">
              {items.length > 0 ? (
                items.map((it: any, idx: number) => {
                  const qty = Number(it.quantity || 1);
                  const price = Number(it.price || 0);
                  const itemSubtotal = qty * price;
                  const hasCakeMessage = !!it.cakeMessage;
                  const hasCustomImage = !!it.customImage;
                  const hasAddons = Array.isArray(it.addons) && it.addons.length > 0;
                  const hasCustomisation = hasCakeMessage || hasCustomImage || hasAddons || it.selectedSize || it.selectedType || it.flavour || it.specialInstructions;

                  return (
                    <div key={idx} className="pt-4 first:pt-0 space-y-3">
                      
                      {/* Item Main Row */}
                      <div className="flex gap-4 items-start">
                        {/* Product Thumbnail */}
                        <div className="h-16 w-16 rounded-2xl overflow-hidden border bg-[#FAF9F6] shrink-0">
                          <SafeImage 
                            src={it.image} 
                            alt={it.name || 'Product'} 
                            category={it.category} 
                            className="h-full w-full object-cover" 
                          />
                        </div>

                        {/* Title & Quantity */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h5 className="font-bold text-zinc-900 text-sm">{it.name || 'Handcrafted Celebration Product'}</h5>
                              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                SKU: {it.productId || it.id || 'N/A'} • {it.category || 'Celebration'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-zinc-900 text-sm">₹{itemSubtotal}</span>
                              <span className="text-[9px] text-zinc-400 block">₹{price} × {qty}</span>
                            </div>
                          </div>

                          {/* Quick Specs Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {it.selectedSize && (
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 text-[9px] font-bold">
                                ⚖️ Size/Weight: {it.selectedSize}
                              </span>
                            )}
                            {it.selectedType && (
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                                String(it.selectedType).toLowerCase().includes('eggless') 
                                  ? 'bg-green-50 text-emerald-700 border border-emerald-200/25' 
                                  : 'bg-amber-50 text-amber-800 border border-amber-200/25'
                              }`}>
                                {it.selectedType}
                              </span>
                            )}
                            {it.flavour && (
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 text-[9px] font-bold">
                                🍓 Flavour: {it.flavour}
                              </span>
                            )}
                            {it.unit && (
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 text-[9px] font-bold">
                                {it.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Customisation Details Box (if any customization provided) */}
                      {hasCustomisation && (
                        <div className="ml-0 sm:ml-20 p-3.5 bg-[#FAF9F6] border border-zinc-200/30 rounded-2xl space-y-2.5">
                          
                          {/* 1. Cake Inscription / Message */}
                          {hasCakeMessage && (
                            <div className="p-2.5 bg-white border border-brand-burgundy/15 rounded-xl flex items-start gap-2 shadow-xs">
                              <PenTool className="h-3.5 w-3.5 text-brand-burgundy mt-0.5 shrink-0" />
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-brand-burgundy block">
                                  Custom Cake Message / Inscription
                                </span>
                                <p className="font-serif font-bold text-zinc-850 text-xs italic">
                                  &ldquo;{it.cakeMessage}&rdquo;
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 2. Customer Uploaded Custom Photo */}
                          {hasCustomImage && (
                            <div className="p-2.5 bg-white border border-brand-coral/20 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="h-10 w-10 rounded-lg overflow-hidden border border-zinc-200 shrink-0 bg-zinc-100">
                                  <img 
                                    src={it.customImage} 
                                    alt="Custom Customer Upload" 
                                    className="h-full w-full object-cover" 
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-brand-burgundy block flex items-center gap-1">
                                    <Camera className="h-3 w-3" /> Customer Uploaded Photo
                                  </span>
                                  <span className="text-[9px] text-zinc-500 font-medium">Click thumbnail to inspect full high-res photo</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setPreviewModalImage(it.customImage)}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-lg flex items-center gap-1 text-[9px] transition-colors"
                              >
                                <ZoomIn className="h-3 w-3" /> View Photo
                              </button>
                            </div>
                          )}

                          {/* 3. Add-ons List */}
                          {hasAddons && (
                            <div className="p-2 bg-white border border-zinc-200/30 rounded-xl space-y-1">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block flex items-center gap-1">
                                <Gift className="h-3 w-3 text-brand-gold" /> Selected Add-ons
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {it.addons.map((a: any, aIdx: number) => {
                                  const name = typeof a === 'string' ? a : a.name || a.title || 'Addon';
                                  const addonPrice = typeof a === 'object' && a.price ? `(₹${a.price})` : '';
                                  return (
                                    <span key={aIdx} className="px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-700 text-[9px] font-bold">
                                      + {name} {addonPrice}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 4. Special Instructions */}
                          {it.specialInstructions && (
                            <div className="p-2 bg-white border border-zinc-200/30 rounded-xl space-y-0.5">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                                📝 Special Preparation Note
                              </span>
                              <p className="text-zinc-700 text-xs font-medium">{it.specialInstructions}</p>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-zinc-400 italic">No items recorded for this order.</div>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="pt-4 border-t space-y-2 text-right text-xs">
              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Items Subtotal:</span>
                <span className="font-bold text-zinc-700">₹{order.subtotal || order.total || 0}</span>
              </div>
              
              {order.discount && Number(order.discount) > 0 ? (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount ({order.couponCode || 'PROMO'}):</span>
                  <span className="font-bold">-₹{order.discount}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-zinc-500 font-medium">
                <span>Quick Courier Dispatch:</span>
                <span className="font-bold text-zinc-700">
                  {order.deliveryFee ? `₹${order.deliveryFee}` : 'FREE'}
                </span>
              </div>

              <div className="flex justify-between text-zinc-900 font-black border-t pt-3 text-sm">
                <span className="uppercase tracking-wider font-serif text-brand-burgundy">Grand Total:</span>
                <span className="text-base text-brand-burgundy">₹{order.total || 0}</span>
              </div>
            </div>
          </div>

          {/* Razorpay Gateway Audit */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-3">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1.5">
              <CreditCard className="h-4.5 w-4.5 text-zinc-400" /> Razorpay Payment & Gateway Audit
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700">
              <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Razorpay Payment ID</span>
                <span className="font-mono font-bold text-zinc-900 text-xs select-all">
                  {order.razorpayPaymentId || order.paymentId || 'N/A (Awaiting or Not Recorded)'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Razorpay Order ID</span>
                <span className="font-mono font-bold text-zinc-900 text-xs select-all">
                  {order.razorpayOrderId || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Payment Method</span>
                <span className="font-semibold text-zinc-800 text-xs">
                  {order.paymentMethod || 'Razorpay Online'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Gateway Status</span>
                <span className={`font-bold text-xs ${order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {order.paymentStatus === 'PAID' ? '✓ Verified & Captured' : (order.paymentStatus || 'PENDING')}
                </span>
              </div>
              {order.utr && (
                <div className="p-3 bg-zinc-50 rounded-xl space-y-0.5 border border-zinc-150 sm:col-span-2">
                  <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Bank UTR Reference</span>
                  <span className="font-mono font-bold text-zinc-900 text-xs select-all">{order.utr}</span>
                </div>
              )}
            </div>
          </div>

          {/* Refund Audit Card (if applicable) */}
          {(order.refundStatus || order.refund || order.refundAmount) && (
            <div className="bg-white border border-amber-200/40 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="font-serif font-extrabold text-sm text-amber-800 border-b pb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-amber-600" /> Refund Status & Audit
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700">
                <div className="p-3 bg-amber-50/50 rounded-xl space-y-0.5 border border-amber-200/30">
                  <span className="text-[9px] uppercase font-extrabold text-amber-700 tracking-wider block">Refund Status</span>
                  <span className="font-bold text-amber-900 text-xs uppercase">{order.refundStatus || order.refund?.status || 'REQUESTED'}</span>
                </div>
                <div className="p-3 bg-amber-50/50 rounded-xl space-y-0.5 border border-amber-200/30">
                  <span className="text-[9px] uppercase font-extrabold text-amber-700 tracking-wider block">Refund Amount</span>
                  <span className="font-black text-amber-900 text-xs">₹{order.refundAmount || order.refund?.amount || order.total}</span>
                </div>
                {order.refundReason && (
                  <div className="p-3 bg-amber-50/50 rounded-xl space-y-0.5 border border-amber-200/30 sm:col-span-2">
                    <span className="text-[9px] uppercase font-extrabold text-amber-700 tracking-wider block">Reason</span>
                    <p className="font-medium text-amber-950 text-xs">{order.refundReason}</p>
                  </div>
                )}
                {order.razorpayRefundId && (
                  <div className="p-3 bg-amber-50/50 rounded-xl space-y-0.5 border border-amber-200/30 sm:col-span-2">
                    <span className="text-[9px] uppercase font-extrabold text-amber-700 tracking-wider block">Razorpay Refund ID</span>
                    <span className="font-mono font-bold text-zinc-900 text-xs select-all">{order.razorpayRefundId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (4 cols): Logistics partner, status controls & timeline */}
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
                className="w-full py-2.5 bg-zinc-800 text-white hover:bg-zinc-950 font-bold uppercase rounded-xl transition-colors"
              >
                Confirm Order
              </button>
              <button 
                onClick={() => handleStatusChange('Out for Delivery')}
                className="w-full py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold uppercase tracking-wider rounded-xl shadow transition-colors"
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
                <span className="font-black text-brand-burgundy font-mono text-xs select-all">{order.deliveryOtp || 'N/A'}</span>
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
                      {order.otp_verified_at ? formatDateTime(order.otp_verified_at) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-zinc-400">Verified by Partner:</span>
                    <span className="font-bold text-zinc-800">{order.assignedPartnerName || order.verified_by_partner_id || 'N/A'}</span>
                  </div>
                </>
              )}
              {order.assignedPartnerName && !order.delivery_otp_verified && (
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-zinc-400">Assigned Partner:</span>
                  <span className="font-bold text-zinc-800">{order.assignedPartnerName}</span>
                </div>
              )}
              {order.adminOverride && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-1.5 mt-2">
                  <span className="text-[9px] font-black text-red-700 tracking-wider block uppercase font-sans">⚠️ EMERGENCY ADMIN OVERRIDE</span>
                  <p className="text-[10px] text-red-700 leading-normal">
                    <strong>Reason:</strong> {order.adminOverride.reason}
                  </p>
                  <p className="text-[8px] text-zinc-400 font-semibold leading-none">
                    By Admin: {order.adminOverride.adminId} • {formatDateTime(order.adminOverride.timestamp)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Tracking */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <h4 className="font-serif font-extrabold text-sm text-zinc-800 border-b pb-2">Delivery Timeline Log</h4>
            <div className="relative pl-6 space-y-6 border-l-2 border-zinc-200 ml-2">
              {getTimelineSteps().map((step, idx) => (
                <div key={idx} className="relative">
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

      {/* Full Resolution Photo Modal */}
      {previewModalImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewModalImage(null)}>
          <div className="relative bg-white rounded-3xl p-4 max-w-lg max-h-[90vh] overflow-hidden shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-brand-burgundy" /> Customer Uploaded Photo
              </h4>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden max-h-[60vh] bg-zinc-50 flex items-center justify-center border">
              <img 
                src={previewModalImage} 
                alt="Custom Upload" 
                className="max-h-[60vh] w-auto object-contain" 
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <a 
                href={previewModalImage} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 bg-brand-burgundy text-white font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Full Image
              </a>
            </div>
          </div>
        </div>
      )}

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
