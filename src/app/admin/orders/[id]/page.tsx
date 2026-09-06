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
  Sparkles, Gift, Camera, PenTool, ExternalLink, X, ZoomIn, Copy,
  Calendar, Check, ChevronRight, Hash, MessageSquare, Info
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
  const [previewModalImage, setPreviewModalImage] = useState<{ src: string; title: string } | null>(null);

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

  const handleCopyText = (text: string, label: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      showToast(`Copied ${label} to clipboard!`, 'success');
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
      { label: 'Order Placed', time: getStepCompletedTime('Order Placed') || formatDateTime(order.createdAt), desc: 'Received & acknowledged by operations center', completed: true },
      { label: 'Confirmed', time: getStepCompletedTime('Confirmed'), desc: 'Inventory reserved & baking pipeline confirmed', completed: ['Confirmed', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Preparing', time: getStepCompletedTime('Preparing'), desc: 'Handcrafting, custom messaging & decoration in progress', completed: ['Preparing', 'Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Packed', time: getStepCompletedTime('Packed'), desc: 'Quality inspected & packaged in celebration box', completed: ['Packed', 'Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Out for Delivery', time: getStepCompletedTime('Out for Delivery'), desc: 'Assigned to quick delivery courier partner', completed: ['Out for Delivery', 'Delivered'].includes(order.status) },
      { label: 'Delivered', time: getStepCompletedTime('Delivered'), desc: 'Customer OTP verified at doorstep', completed: order.status === 'Delivered' }
    ];
  };

  if (loading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="h-8 w-8 text-brand-burgundy animate-spin" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Loading Order Details from PostgreSQL...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4 bg-white border rounded-3xl shadow-sm">
        <AlertCircle className="h-12 w-12 text-red-600 animate-bounce" />
        <h3 className="text-base font-bold text-zinc-900">Error Loading Order</h3>
        <p className="text-xs text-zinc-500 max-w-sm">{error}</p>
        <button
          onClick={() => router.push('/admin/orders')}
          className="px-6 py-2.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold rounded-xl uppercase tracking-wider text-[11px] transition-all shadow"
        >
          Back to Orders List
        </button>
      </div>
    );
  }

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const address = order.address || {};
  const customerName = address.name || order.customerName || 'Customer';
  const customerMobile = address.mobile || address.phone || order.customerPhone || 'N/A';
  const customerEmail = order.customerEmail || address.email || 'N/A';

  // Format delivery address lines
  const addressParts = [
    address.house,
    address.street,
    address.area
  ].filter(Boolean);

  const cityPincode = [address.city, address.pincode].filter(Boolean).join(' - ');

  return (
    <div className="space-y-6 text-xs text-left max-w-7xl mx-auto pb-12">
      
      {/* Top Header Bar with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/orders')}
            className="p-2.5 hover:bg-zinc-100 rounded-2xl transition-colors text-zinc-600 border border-zinc-200"
            title="Back to Orders"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-serif font-black text-zinc-900">Order #{order.id}</h3>
              <button 
                onClick={() => handleCopyText(order.id, 'Order ID')}
                className="p-1 text-zinc-400 hover:text-brand-burgundy rounded transition-colors"
                title="Copy Order ID"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-zinc-500 font-medium">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>Placed on {formatDateTime(order.createdAt)}</span>
              {order.updatedAt && (
                <span className="text-[10px] text-zinc-400 font-normal">
                  • Updated {formatDateTime(order.updatedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded-xl flex items-center gap-1.5 transition-colors text-[10px]"
            title="Print Window"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            className="px-4 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all shadow text-[10px] disabled:opacity-50 cursor-pointer"
            title="Download Official FATAFAT PDF Invoice"
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
            title="Refresh order data from PostgreSQL"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Main Order Data */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest block">Reference</span>
              <h4 className="text-sm font-bold text-zinc-900 mt-0.5">#{order.id}</h4>
              <span className="text-[10px] text-zinc-500 font-medium block mt-0.5">
                {order.deliveryLocationName || 'Nawabganj, Unnao'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest block">Grand Total</span>
              <p className="text-base font-black text-brand-burgundy mt-0.5">₹{order.total}</p>
              <span className="text-[10px] text-zinc-500 block">
                {rawItems.length} SKU{rawItems.length === 1 ? '' : 's'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest block">Payment</span>
              <span className={`inline-block px-2 py-0.5 rounded font-extrabold tracking-wider text-[9px] mt-1 ${
                String(order.paymentStatus).toUpperCase() === 'PAID' || String(order.paymentStatus).toUpperCase() === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : String(order.paymentStatus).toUpperCase() === 'REJECTED'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {String(order.paymentStatus).toUpperCase() === 'PAID' ? '✓ PAID' : (order.paymentStatus || 'PENDING')}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">{order.paymentMethod || 'Razorpay Online'}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest block">Fulfillment</span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black bg-brand-burgundy/10 text-brand-burgundy mt-1">
                {String(order.status || 'Pending').toUpperCase()}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">
                {order.deliveryOption === 'Scheduled' 
                  ? `Slot: ${order.deliveryTimeSlot || 'Scheduled'}` 
                  : 'ASAP (30-45 Mins)'}
              </span>
            </div>
          </div>

          {/* Customer & Delivery Coordinates Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Details */}
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-3.5">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-zinc-400" /> Customer Details
                </span>
                {order.customerId && (
                  <span className="text-[9px] font-mono text-zinc-400 font-normal">
                    ID: {order.customerId.slice(0, 10)}...
                  </span>
                )}
              </h4>
              <div className="space-y-2.5 text-zinc-700">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Customer Name</span>
                  <p className="font-bold text-zinc-900 text-xs">{customerName}</p>
                </div>
                
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Mobile Contact</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <a href={`tel:${customerMobile}`} className="font-bold text-brand-burgundy hover:underline text-xs">
                      {customerMobile}
                    </a>
                    {customerMobile !== 'N/A' && (
                      <button 
                        onClick={() => handleCopyText(customerMobile, 'Phone Number')}
                        className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
                        title="Copy Phone"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Email Address</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <a href={`mailto:${customerEmail}`} className="font-medium text-zinc-800 hover:underline text-xs truncate max-w-[200px] block">
                      {customerEmail}
                    </a>
                  </div>
                </div>

                {order.customerId && (
                  <div className="pt-1">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Customer UUID</span>
                    <p className="font-mono text-[9px] text-zinc-500 select-all">{order.customerId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Delivery Address */}
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-3.5">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-zinc-400" /> Delivery Address & Coordinates
              </h4>
              <div className="space-y-2.5 text-zinc-700">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Full Address</span>
                  <p className="leading-relaxed font-semibold text-zinc-900 mt-0.5">
                    {addressParts.length > 0 ? addressParts.join(', ') : 'No street address specified'}
                  </p>
                  {cityPincode && (
                    <p className="text-zinc-600 font-bold mt-0.5">
                      {cityPincode}
                    </p>
                  )}
                </div>

                {address.landmark && (
                  <div className="p-2.5 bg-[#FAF9F6] rounded-xl border border-zinc-200">
                    <span className="text-[8px] text-zinc-400 uppercase font-extrabold tracking-wider block">Landmark / Directions</span>
                    <p className="text-zinc-800 font-medium text-xs mt-0.5">{address.landmark}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Delivery Hub / Zone</span>
                    <p className="font-bold text-zinc-900 mt-0.5">{order.deliveryLocationName || 'Nawabganj Hub'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">Delivery Mode</span>
                    <p className="font-bold text-brand-burgundy mt-0.5">
                      {order.deliveryOption === 'Scheduled' ? '📅 Scheduled' : '⚡ Instant ASAP'}
                    </p>
                  </div>
                </div>

                {order.scheduledDeliveryAt && (
                  <div className="p-2 bg-amber-50/60 border border-amber-200 rounded-xl text-[10px]">
                    <span className="font-bold text-amber-900 block">Scheduled Time Window:</span>
                    <span className="text-amber-800">{formatDateTime(order.scheduledDeliveryAt)} ({order.deliveryTimeSlot || 'Custom Slot'})</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Ordered Items & Complete Customisation Breakdown */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-serif font-extrabold text-sm text-brand-burgundy flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-zinc-400" /> Ordered Items & Customer Customisations
                </h4>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                  Complete product snapshot, selected variants, inscriptions, custom photo uploads, and add-ons.
                </p>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-lg">
                {rawItems.length} SKU{rawItems.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-zinc-200 space-y-5">
              {rawItems.length > 0 ? (
                rawItems.map((it: any, idx: number) => {
                  const name = String(it.name || it.title || it.product?.name || 'Celebration Product').trim();
                  const price = Number(it.price || it.product?.price || 0);
                  const qty = Number(it.quantity || 1);
                  const itemSubtotal = Number(it.subtotal || (price * qty));
                  const image = it.image || it.imageUrl || it.product?.image || '';
                  const selectedSize = it.selectedSize || it.size || it.weight || it.variant || it.selectedWeight;
                  const selectedType = it.selectedType || it.type || it.eggless || it.dietary;
                  const flavour = it.flavour || it.flavor || it.selectedFlavour;
                  const cakeMessage = it.cakeMessage || it.message || it.text || it.inscription || it.customMessage;
                  const customImage = it.customImage || it.customImageUrl || it.uploadedImageUrl || it.photoUrl || it.uploadedImage || it.photo || it.referenceImageUrl;
                  
                  const rawAddons = it.addons || it.addOns || it.selectedAddOns;
                  const addons = Array.isArray(rawAddons) ? rawAddons : (rawAddons ? [rawAddons] : []);
                  const specialInstructions = it.specialInstructions || it.instructions || it.notes || it.specialInstruction || it.note;
                  const customisation = it.customisation || it.customization;

                  const hasCustomisation = !!(cakeMessage || customImage || addons.length > 0 || specialInstructions || customisation);

                  return (
                    <div key={idx} className="pt-5 first:pt-0 space-y-3.5">
                      
                      {/* Main Item Row */}
                      <div className="flex gap-4 items-start">
                        {/* Product Thumbnail with Zoom */}
                        <div 
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border border-zinc-200 bg-[#FAF9F6] shrink-0 relative group cursor-pointer"
                          onClick={() => image && setPreviewModalImage({ src: image, title: name })}
                          title="Click to zoom product image"
                        >
                          <SafeImage 
                            src={image} 
                            alt={name} 
                            category={it.category || it.product?.category} 
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform" 
                          />
                          {image && (
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Title & Pricing */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h5 className="font-bold text-zinc-900 text-sm">{name}</h5>
                              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                SKU: {it.productId || it.id || 'N/A'} {it.category ? `• ${it.category}` : ''}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-zinc-900 text-sm">₹{itemSubtotal}</span>
                              <span className="text-[10px] text-zinc-400 block font-medium">₹{price} × {qty}</span>
                            </div>
                          </div>

                          {/* Variant & Specifications Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {selectedSize && (
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 text-[10px] font-bold border border-zinc-200">
                                ⚖️ Size/Weight: {selectedSize}
                              </span>
                            )}
                            {selectedType && (
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                String(selectedType).toLowerCase().includes('eggless') 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {String(selectedType).toLowerCase().includes('eggless') ? '🌿 ' : '🥚 '}{selectedType}
                              </span>
                            )}
                            {flavour && (
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 text-[10px] font-bold border border-zinc-200">
                                🍓 Flavour: {flavour}
                              </span>
                            )}
                            {it.unit && (
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 text-[10px] font-bold border border-zinc-200">
                                {it.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Customer Customisation Cards Section */}
                      {hasCustomisation && (
                        <div className="ml-0 sm:ml-24 p-4 bg-[#FAF9F6] border border-zinc-200 rounded-2xl space-y-3">
                          
                          <div className="flex items-center gap-1.5 text-zinc-500 font-bold uppercase text-[9px] tracking-wider border-b border-zinc-200/60 pb-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                            <span>Customer Customisation Details</span>
                          </div>

                          {/* 1. Cake Inscription / Message */}
                          {cakeMessage && (
                            <div className="p-3 bg-white border border-brand-burgundy/20 rounded-xl flex items-start gap-2.5 shadow-xs">
                              <PenTool className="h-4 w-4 text-brand-burgundy mt-0.5 shrink-0" />
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-brand-burgundy block">
                                  Cake Message / Inscription
                                </span>
                                <p className="font-serif font-bold text-zinc-900 text-xs italic leading-relaxed">
                                  &ldquo;{cakeMessage}&rdquo;
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 2. Customer Uploaded Photo / Custom Image */}
                          {customImage && (
                            <div className="p-3 bg-white border border-amber-300/40 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="h-12 w-12 rounded-lg overflow-hidden border border-zinc-300 shrink-0 bg-zinc-100 cursor-pointer group relative"
                                  onClick={() => setPreviewModalImage({ src: customImage, title: 'Customer Uploaded Photo' })}
                                >
                                  <img 
                                    src={customImage} 
                                    alt="Custom Customer Upload" 
                                    className="h-full w-full object-cover group-hover:scale-110 transition-transform" 
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <ZoomIn className="h-3 w-3 text-white" />
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-brand-burgundy block flex items-center gap-1">
                                    <Camera className="h-3.5 w-3.5 text-brand-burgundy" /> Customer Uploaded Photo / Graphic
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-medium">Custom photo provided for edible printing or reference</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setPreviewModalImage({ src: customImage, title: 'Customer Uploaded Photo' })}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-lg flex items-center gap-1 text-[10px] transition-colors shrink-0"
                              >
                                <ZoomIn className="h-3 w-3" /> View Photo
                              </button>
                            </div>
                          )}

                          {/* 3. Selected Add-ons */}
                          {addons.length > 0 && (
                            <div className="p-2.5 bg-white border border-zinc-200 rounded-xl space-y-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block flex items-center gap-1">
                                <Gift className="h-3.5 w-3.5 text-brand-gold" /> Selected Celebration Add-ons
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {addons.map((a: any, aIdx: number) => {
                                  const name = typeof a === 'string' ? a : a.name || a.title || 'Addon';
                                  const addonPrice = typeof a === 'object' && a.price ? `(+₹${a.price})` : '';
                                  return (
                                    <span key={aIdx} className="px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 text-[10px] font-bold">
                                      + {name} {addonPrice}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 4. Special Preparation Note */}
                          {specialInstructions && (
                            <div className="p-2.5 bg-white border border-zinc-200 rounded-xl space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block flex items-center gap-1">
                                <MessageSquare className="h-3 w-3 text-zinc-400" /> Special Preparation Note
                              </span>
                              <p className="text-zinc-800 text-xs font-medium leading-relaxed">{specialInstructions}</p>
                            </div>
                          )}

                          {/* 5. Generic Customisation Data */}
                          {customisation && typeof customisation === 'string' && customisation !== cakeMessage && (
                            <div className="p-2.5 bg-white border border-zinc-200 rounded-xl space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                                Customisation Details
                              </span>
                              <p className="text-zinc-800 text-xs font-medium">{customisation}</p>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-zinc-400 italic">No item records found for this order.</div>
              )}
            </div>

            {/* Financial Breakdown Table */}
            <div className="pt-4 border-t border-zinc-200 space-y-2 text-right text-xs">
              <div className="flex justify-between text-zinc-600 font-medium">
                <span>Items Subtotal:</span>
                <span className="font-bold text-zinc-900">₹{order.subtotal || order.total || 0}</span>
              </div>
              
              {order.discount && Number(order.discount) > 0 ? (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount ({order.couponCode || 'PROMO'}):</span>
                  <span className="font-bold">-₹{order.discount}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-zinc-600 font-medium">
                <span>Courier Quick Dispatch:</span>
                <span className="font-bold text-zinc-900">
                  {order.deliveryFee && Number(order.deliveryFee) > 0 ? `₹${order.deliveryFee}` : 'FREE'}
                </span>
              </div>

              <div className="flex justify-between text-zinc-900 font-black border-t border-zinc-200 pt-3 text-sm">
                <span className="uppercase tracking-wider font-serif text-brand-burgundy">Grand Total:</span>
                <span className="text-base text-brand-burgundy">₹{order.total || 0}</span>
              </div>
            </div>
          </div>

          {/* Payment & Razorpay Gateway Details */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-zinc-400" /> Razorpay Payment & Gateway Audit
              </h4>
              <span className={`px-2 py-0.5 rounded font-extrabold tracking-wider text-[9px] ${
                String(order.paymentStatus).toUpperCase() === 'PAID' || String(order.paymentStatus).toUpperCase() === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {String(order.paymentStatus).toUpperCase() === 'PAID' ? '✓ VERIFIED & CAPTURED' : (order.paymentStatus || 'PENDING')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700">
              <div className="p-3 bg-zinc-50 rounded-xl space-y-1 border border-zinc-200">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Razorpay Payment ID</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-zinc-900 text-xs truncate select-all">
                    {order.razorpayPaymentId || order.paymentId || 'N/A (Awaiting Payment)'}
                  </span>
                  {(order.razorpayPaymentId || order.paymentId) && (
                    <button 
                      onClick={() => handleCopyText(order.razorpayPaymentId || order.paymentId, 'Payment ID')}
                      className="p-1 text-zinc-400 hover:text-zinc-600 rounded shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl space-y-1 border border-zinc-200">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Razorpay Order ID</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-zinc-900 text-xs truncate select-all">
                    {order.razorpayOrderId || 'N/A'}
                  </span>
                  {order.razorpayOrderId && (
                    <button 
                      onClick={() => handleCopyText(order.razorpayOrderId, 'Razorpay Order ID')}
                      className="p-1 text-zinc-400 hover:text-zinc-600 rounded shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl space-y-1 border border-zinc-200">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Payment Method</span>
                <span className="font-semibold text-zinc-900 text-xs block">
                  {order.paymentMethod || 'Razorpay Online'}
                </span>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl space-y-1 border border-zinc-200">
                <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Total Transaction Amount</span>
                <span className="font-black text-brand-burgundy text-xs block">
                  ₹{order.total || 0}
                </span>
              </div>

              {order.utr && (
                <div className="p-3 bg-zinc-50 rounded-xl space-y-1 border border-zinc-200 sm:col-span-2">
                  <span className="text-[9px] uppercase font-extrabold text-zinc-400 tracking-wider block">Bank UTR Reference</span>
                  <span className="font-mono font-bold text-zinc-900 text-xs select-all">{order.utr}</span>
                </div>
              )}
            </div>
          </div>

          {/* Refund Information Card (if applicable) */}
          {(order.refundStatus || order.refund || order.refundAmount) && (
            <div className="bg-white border border-amber-300/60 rounded-3xl p-6 shadow-sm space-y-3.5">
              <h4 className="font-serif font-extrabold text-sm text-amber-900 border-b pb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-amber-600" /> Refund Status & Audit
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700">
                <div className="p-3 bg-amber-50/60 rounded-xl space-y-0.5 border border-amber-200">
                  <span className="text-[9px] uppercase font-extrabold text-amber-800 tracking-wider block">Refund Status</span>
                  <span className="font-bold text-amber-950 text-xs uppercase">{order.refundStatus || order.refund?.status || 'REQUESTED'}</span>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl space-y-0.5 border border-amber-200">
                  <span className="text-[9px] uppercase font-extrabold text-amber-800 tracking-wider block">Refund Amount</span>
                  <span className="font-black text-amber-950 text-xs">₹{order.refundAmount || order.refund?.amount || order.total}</span>
                </div>
                {order.refundReason && (
                  <div className="p-3 bg-amber-50/60 rounded-xl space-y-0.5 border border-amber-200 sm:col-span-2">
                    <span className="text-[9px] uppercase font-extrabold text-amber-800 tracking-wider block">Reason for Refund</span>
                    <p className="font-medium text-amber-950 text-xs">{order.refundReason}</p>
                  </div>
                )}
                {order.razorpayRefundId && (
                  <div className="p-3 bg-amber-50/60 rounded-xl space-y-0.5 border border-amber-200 sm:col-span-2">
                    <span className="text-[9px] uppercase font-extrabold text-amber-800 tracking-wider block">Razorpay Refund ID</span>
                    <span className="font-mono font-bold text-zinc-900 text-xs select-all">{order.razorpayRefundId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (4 cols): Pipeline controls, OTP & delivery tracking */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          {/* Status Controllers */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-serif font-extrabold text-sm text-zinc-900 border-b pb-2">Status Control</h4>
            
            <div className="space-y-2">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px] block">Pipeline State</label>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full p-3 border border-zinc-200 rounded-xl bg-[#FAF9F6] font-bold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-burgundy transition-colors text-xs"
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

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button 
                onClick={() => handleStatusChange('Confirmed')}
                disabled={order.status === 'Confirmed'}
                className="py-2.5 bg-zinc-800 hover:bg-zinc-950 text-white font-bold uppercase rounded-xl transition-colors text-[10px] disabled:opacity-40 cursor-pointer"
              >
                Confirm
              </button>
              <button 
                onClick={() => handleStatusChange('Preparing')}
                disabled={order.status === 'Preparing'}
                className="py-2.5 bg-zinc-800 hover:bg-zinc-950 text-white font-bold uppercase rounded-xl transition-colors text-[10px] disabled:opacity-40 cursor-pointer"
              >
                Preparing
              </button>
              <button 
                onClick={() => handleStatusChange('Packed')}
                disabled={order.status === 'Packed'}
                className="py-2.5 bg-zinc-800 hover:bg-zinc-950 text-white font-bold uppercase rounded-xl transition-colors text-[10px] disabled:opacity-40 cursor-pointer"
              >
                Packed
              </button>
              <button 
                onClick={() => handleStatusChange('Out for Delivery')}
                disabled={order.status === 'Out for Delivery'}
                className="py-2.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold uppercase rounded-xl transition-colors text-[10px] disabled:opacity-40 cursor-pointer"
              >
                Dispatch
              </button>
            </div>
          </div>

          {/* OTP Verification & Logistics Partner Card */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <h4 className="font-serif font-extrabold text-sm text-zinc-900 border-b pb-2 flex items-center justify-between">
              <span>Logistics & OTP Log</span>
              {order.delivery_otp_verified && (
                <span className="text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> VERIFIED
                </span>
              )}
            </h4>
            
            <div className="space-y-3 font-medium text-zinc-700">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">OTP State:</span>
                <span className="font-extrabold text-zinc-900">
                  {order.delivery_otp_verified ? (
                    <span className="text-emerald-700 font-bold">✓ VERIFIED</span>
                  ) : order.otpExpiresAt && new Date() > new Date(order.otpExpiresAt) ? (
                    <span className="text-red-600 font-bold">EXPIRED</span>
                  ) : order.status === 'Out for Delivery' ? (
                    <span className="text-amber-700 font-bold animate-pulse">PENDING AT DOORSTEP</span>
                  ) : (
                    <span className="text-zinc-400 font-bold">AWAITING DISPATCH</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">Delivery OTP Code:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-brand-burgundy font-mono text-sm select-all">
                    {order.deliveryOtp || 'N/A'}
                  </span>
                  {order.deliveryOtp && (
                    <button 
                      onClick={() => handleCopyText(order.deliveryOtp, 'Delivery OTP')}
                      className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
                      title="Copy OTP"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">Failed OTP Tries:</span>
                <span className={`font-bold ${order.otpFailedAttempts >= 5 ? 'text-red-600' : 'text-zinc-800'}`}>
                  {order.otpFailedAttempts || 0} / 5
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">Assigned Partner:</span>
                <span className="font-bold text-zinc-900">
                  {order.assignedPartnerName || order.deliveryPartner || 'Unassigned'}
                </span>
              </div>

              {order.delivery_otp_verified && (
                <>
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                    <span className="text-zinc-500">Verified At:</span>
                    <span className="font-bold text-zinc-900">
                      {order.otp_verified_at ? formatDateTime(order.otp_verified_at) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                    <span className="text-zinc-500">Verified By Partner:</span>
                    <span className="font-bold text-zinc-900">
                      {order.assignedPartnerName || order.verified_by_partner_id || 'Courier'}
                    </span>
                  </div>
                </>
              )}

              {order.adminOverride && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 mt-2">
                  <span className="text-[9px] font-black text-red-700 tracking-wider block uppercase">
                    ⚠️ EMERGENCY ADMIN OVERRIDE
                  </span>
                  <p className="text-[10px] text-red-800 leading-normal">
                    <strong>Reason:</strong> {order.adminOverride.reason}
                  </p>
                  <p className="text-[8px] text-zinc-500 font-semibold leading-none pt-0.5">
                    By Admin: {order.adminOverride.adminId} • {formatDateTime(order.adminOverride.timestamp)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Timeline History */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4 text-left">
            <h4 className="font-serif font-extrabold text-sm text-zinc-900 border-b pb-2">Delivery Timeline Log</h4>
            <div className="relative pl-6 space-y-5 border-l-2 border-zinc-200 ml-2 pt-1">
              {getTimelineSteps().map((step, idx) => (
                <div key={idx} className="relative">
                  <div className={`absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 ${
                    step.completed ? 'bg-brand-burgundy border-brand-burgundy' : 'bg-white border-zinc-300'
                  }`} />
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`font-bold ${step.completed ? 'text-zinc-900' : 'text-zinc-400'}`}>
                        {step.label}
                      </span>
                      {step.completed && <span className="text-zinc-400 font-mono">{step.time}</span>}
                    </div>
                    <p className="text-[9px] text-zinc-500 font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* High-Resolution Photo Zoom Modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" 
          onClick={() => setPreviewModalImage(null)}
        >
          <div 
            className="relative bg-white rounded-3xl p-5 max-w-lg max-h-[90vh] overflow-hidden shadow-2xl space-y-3.5 w-full" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-2.5">
              <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-brand-burgundy" /> {previewModalImage.title}
              </h4>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="rounded-2xl overflow-hidden max-h-[60vh] bg-zinc-50 flex items-center justify-center border border-zinc-200">
              <img 
                src={previewModalImage.src} 
                alt={previewModalImage.title} 
                className="max-h-[60vh] w-auto object-contain" 
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <a 
                href={previewModalImage.src} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Full Image in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Admin Override Dialog */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl text-left">
            <div className="space-y-1 text-zinc-900">
              <h4 className="text-sm font-serif font-extrabold text-red-600 flex items-center gap-1.5">
                ⚠️ Emergency Admin Override
              </h4>
              <p className="text-[11px] text-zinc-600 leading-normal">
                You are bypassing the customer doorstep OTP verification check for Order #{order.id}. This action will be logged in PostgreSQL.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">Reason for Override</label>
              <textarea
                rows={3}
                placeholder="e.g. Customer verified package delivery but has lost mobile connection..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full p-2.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] text-xs font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-burgundy"
              />
            </div>

            <div className="flex gap-3 text-[10px]">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideReason('');
                }}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
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
