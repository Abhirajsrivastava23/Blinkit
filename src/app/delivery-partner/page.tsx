'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, Clock, MapPin, CheckCircle, ShieldAlert, Sparkles, Navigation, 
  History, AlertTriangle, FileText, User, Settings, EyeOff, RotateCw, CheckCircle2,
  Phone, MessageSquare, Compass, ClipboardList, Check, X, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders, Order } from '../../context/OrderContext';
import { useProducts } from '../../context/ProductContext';
import { Product } from '../../data/mockData';
import { useToast } from '../../components/Toast';
import Logo from '../../components/Logo';
import SafeImage from '../../components/SafeImage';

export default function DeliveryPartnerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { orders, updateOrderStatus, updateOrderDetails } = useOrders();
  const { products, refreshProducts } = useProducts();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'home' | 'deliveries' | 'issues' | 'history' | 'profile'>('home');
  const [isOnline, setIsOnline] = useState(true);

  // Active delivery sub-states
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [arrivedNotify, setArrivedNotify] = useState(false);
  const [failedReason, setFailedReason] = useState('');
  const [failedComment, setFailedComment] = useState('');
  const [showFailForm, setShowFailForm] = useState(false);

  // Pickup checklist states
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  const [checklistHubVerified, setChecklistHubVerified] = useState(false);
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);

  // Inventory Issues states
  const [invSearch, setInvSearch] = useState('');
  const [selectedInvProduct, setSelectedInvProduct] = useState<any>(null);
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [updateReason, setUpdateReason] = useState('Physical count');
  const [reportsLog, setReportsLog] = useState<any[]>([]);

  // Availability security: rider phone/email
  const isRider = user && user.role === 'delivery_partner';

  // Load persistent rider data on mount & Verify Session
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [riderOrders, setRiderOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const storedOnline = localStorage.getItem('fatafat_rider_online');
    if (storedOnline !== null) {
      setIsOnline(storedOnline === 'true');
    }
    const storedReports = localStorage.getItem('fatafat_rider_reports');
    if (storedReports) {
      setReportsLog(JSON.parse(storedReports));
    }

    const checkRiderAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/delivery-partner/login');
          return;
        }

        const data = await res.json();
        if (data.user.role !== 'delivery_partner') {
          showToast('Access denied: Delivery Partner authorization required.', 'error');
          router.push('/delivery-partner/login');
          return;
        }

        // Store user in localStorage (Legacy matching)
        localStorage.setItem('fatafat_user', JSON.stringify(data.user));
        setVerifyingSession(false);
      } catch (err) {
        console.error('Rider layout verify error:', err);
        router.push('/delivery-partner/login');
      }
    };

    checkRiderAuth();
  }, [router]);

  const fetchRiderOrders = async () => {
    try {
      const res = await fetch('/api/delivery/orders');
      if (res.ok) {
        const data = await res.json();
        setRiderOrders(data);
      }
    } catch (e) {
      console.warn('Rider API error:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (verifyingSession) return;
    fetchRiderOrders();
    // Poll every 3 seconds to get real-time rider dispatch notifications
    const interval = setInterval(fetchRiderOrders, 3000);
    return () => clearInterval(interval);
  }, [verifyingSession, user]);

  // Find current active assigned order (not delivered)
  const activeOrder = riderOrders.find(o => 
    o.status !== 'Delivered' && o.status !== 'Cancelled'
  );

  const completedOrders = riderOrders.filter(o => o.status === 'Delivered');

  // Toggle availability
  const handleAvailabilityToggle = () => {
    if (isOnline && activeOrder) {
      showToast('Finish your current active delivery before going offline.', 'error');
      return;
    }
    const nextState = !isOnline;
    setIsOnline(nextState);
    localStorage.setItem('fatafat_rider_online', String(nextState));
    showToast(`Status updated: You are now ${nextState ? 'ONLINE' : 'OFFLINE'}`, 'info');
  };

  // Calculate earnings (mock 125 rs payout per delivery)
  const todayEarnings = completedOrders.length * 125;

  // Initialize item checklist when active order changes
  const activeOrderId = activeOrder?.id;
  useEffect(() => {
    if (activeOrder) {
      const itemsMap: Record<string, boolean> = {};
      activeOrder.items.forEach(item => {
        itemsMap[item.productId] = false;
      });
      setChecklistItems(itemsMap);
      setChecklistHubVerified(false);
      setOtpCode('');
      setOtpError('');
      setArrivedNotify(false);
      setShowFailForm(false);
    } else {
      setChecklistItems({});
      setChecklistHubVerified(false);
    }
  }, [activeOrderId]);

  const toggleChecklistItem = (productId: string) => {
    setChecklistItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const isChecklistComplete = activeOrder && 
    activeOrder.items.every(item => checklistItems[item.productId]) && 
    checklistHubVerified;

  // Step Status actions
  const handleConfirmPickup = async () => {
    if (!activeOrder) return;
    setIsConfirmingPickup(true);

    try {
      const verifiedItemIds = Object.keys(checklistItems).filter(
        (productId) => checklistItems[productId]
      );

      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeOrder.id,
          updates: {
            status: 'Picked Up',
            verifiedItemIds,
            boxSealVerified: checklistHubVerified
          }
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Update local context
        updateOrderStatus(activeOrder.id, 'Picked Up');
        showToast(`Order #${activeOrder.id} verified and picked up from hub.`, 'success');
      } else {
        showToast(data.error || 'Failed to confirm pickup.', 'error');
      }
    } catch (err) {
      console.error('Error confirming pickup:', err);
      showToast('Unable to confirm pickup. Please try again.', 'error');
    } finally {
      setIsConfirmingPickup(false);
    }
  };

  const handleStartTransit = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeOrder.id,
          updates: {
            status: 'Out for Delivery'
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        updateOrderStatus(activeOrder.id, 'Out for Delivery');
        showToast(`Order #${activeOrder.id} transit initiated.`, 'success');
      } else {
        showToast(data.error || 'Failed to initiate transit.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error initiating transit.', 'error');
    }
  };

  const handleArrived = () => {
    setArrivedNotify(true);
    showToast('Notification sent: Arrived at destination.', 'success');
  };

  const handleCompleteDelivery = async () => {
    if (!activeOrder) return;
    if (otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP.');
      return;
    }
    
    setOtpError('');
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeOrder.id,
          updates: {
            status: 'Delivered',
            otpCode: otpCode
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        updateOrderStatus(activeOrder.id, 'Delivered');
        showToast(`Order #${activeOrder.id} delivered successfully!`, 'success');
        setOtpCode('');
      } else {
        setOtpError(data.error || 'Invalid OTP code.');
        showToast(data.error || 'Failed to complete delivery.', 'error');
      }
    } catch (err) {
      console.error(err);
      setOtpError('Network connection failure.');
      showToast('Error completing delivery.', 'error');
    }
  };

  const handleFailDelivery = () => {
    if (!activeOrder) return;
    if (!failedReason) {
      showToast('Select a failure reason.', 'error');
      return;
    }
    updateOrderStatus(activeOrder.id, 'Cancelled');
    showToast(`Delivery ticket filed: Order #${activeOrder.id} marked as failed.`, 'info');
    setShowFailForm(false);
  };

  // Inventory Updates
  const handleReportIssue = async (productId: string, productName: string, reason: string, availableQty?: number, requestedQty?: number) => {
    try {
      const res = await fetch('/api/delivery/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName,
          reason,
          availableQty,
          requestedQty: requestedQty !== undefined ? requestedQty : 1,
          orderId: activeOrder?.id || 'N/A'
        })
      });

      if (res.ok) {
        showToast('Stock issue report submitted successfully!', 'success');
        
        const newReport = {
          product: { name: productName, id: productId },
          issue: reason,
          reportedStock: availableQty !== undefined ? availableQty : 0,
          date: new Date().toLocaleDateString()
        };
        const updatedReports = [newReport, ...reportsLog];
        setReportsLog(updatedReports);
        localStorage.setItem('fatafat_rider_reports', JSON.stringify(updatedReports));

        setSelectedInvProduct(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit stock issue report.', 'error');
      }
    } catch (err) {
      showToast('Connection to server failed.', 'error');
    }
  };

  const submitQuantityReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvProduct) return;

    await handleReportIssue(
      selectedInvProduct.id,
      selectedInvProduct.name,
      updateReason,
      physicalCount,
      1
    );
  };

  // Filter catalog items
  const filteredProducts = products.filter((p: Product) => 
    p.category !== 'wellness' && 
    (p.name.toLowerCase().includes(invSearch.toLowerCase()) || p.id.includes(invSearch))
  );

  // Authentication Fallback View
  if (!isRider || verifyingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] font-sans">
        <div className="text-center space-y-2">
          <RotateCw className="h-6 w-6 text-brand-burgundy animate-spin mx-auto" />
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Verifying Rider Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-brand-charcoal font-sans flex flex-col pb-20 select-none">
      
      {/* 1. COMPACT LOGISTICS HEADER */}
      <header className="sticky top-0 z-40 h-14 bg-white border-b border-zinc-200/50 px-4 flex items-center justify-between shadow-sm shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-brand-burgundy animate-pulse" />
          <div className="text-left leading-none">
            <span className="text-[10px] font-black text-brand-burgundy tracking-tight">FATAFAT</span>
            <span className="text-[7px] text-brand-coral font-black uppercase tracking-widest block">DELIVERY</span>
          </div>
        </div>

        {/* Availability Quick Badge */}
        <div className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-ping' : 'bg-zinc-400'}`} />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-600">
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Profile indicator */}
        <div className="flex items-center gap-2">
          <div className="text-right leading-none hidden sm:block">
            <p className="font-bold text-[10px] text-zinc-800">Hi, {user?.name || 'Rahul'}</p>
            <p className="text-[7px] text-zinc-400 uppercase tracking-widest font-extrabold mt-0.5">ID: {user?.deliveryPartnerId || 'DP-001'}</p>
          </div>
          <button 
            onClick={() => setActiveTab('profile')}
            className="h-8 w-8 bg-brand-burgundy text-white flex items-center justify-center rounded-xl font-serif font-bold text-xs select-none shadow-sm"
          >
            {user?.name?.[0] || 'R'}
          </button>
        </div>
      </header>

      {/* 2. DYNAMIC WORKSPACE ROUTE CONTENT */}
      <main className="flex-grow max-w-lg mx-auto w-full p-4 space-y-5 text-left">
        
        {/* ================= TAB 1: HOME ================= */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            {/* Welcoming banner */}
            <div className="flex justify-between items-center bg-white border border-zinc-200/40 p-4 rounded-2xl shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 leading-tight">Good morning, {user?.name || 'Rahul'} 👋</h2>
                <p className="text-[10px] text-zinc-500 font-medium">Zone: {user?.locationName || 'Nawabganj, Unnao'}</p>
              </div>
              
              {/* Availability Switch */}
              <button
                onClick={handleAvailabilityToggle}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                  isOnline 
                    ? 'border-green-200 bg-green-50 text-green-700' 
                    : 'border-zinc-200 bg-white text-zinc-500'
                }`}
              >
                {isOnline ? 'Go Offline' : 'Go Online'}
              </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-1">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">TODAY DELIVERIES</span>
                <span className="text-lg font-black text-zinc-800">{riderOrders.length}</span>
              </div>
              <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-1">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">COMPLETED</span>
                <span className="text-lg font-black text-emerald-700">{completedOrders.length}</span>
              </div>
              <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-1">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">ACTIVE</span>
                <span className="text-lg font-black text-brand-burgundy">{activeOrder ? '1' : '0'}</span>
              </div>
              <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-1">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">TODAY PAYOUT</span>
                <span className="text-lg font-black text-zinc-850">₹{todayEarnings}</span>
              </div>
            </div>

            {/* Availability Warning block if offline */}
            {!isOnline && (
              <div className="p-4 bg-zinc-150/40 border border-zinc-200 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-zinc-450 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-[10px] text-zinc-700 uppercase tracking-wider">OFFLINE STATUS</h4>
                  <p className="text-[9px] text-zinc-500 leading-relaxed mt-0.5 font-medium">
                    You are not accepting new deliveries. Toggle availability online to join the rider dispatch queue.
                  </p>
                </div>
              </div>
            )}

            {/* Today's summary list */}
            <div className="bg-white border border-zinc-200/40 p-4 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-xs font-serif font-black uppercase tracking-wider text-zinc-800">Shift summary</h3>
              <div className="divide-y space-y-2 text-[10px] font-medium text-zinc-650">
                {riderOrders.slice(0, 3).map((o) => (
                  <div key={o.id} className="pt-2 first:pt-0 flex justify-between items-center">
                    <span>Order #{o.id} • {o.address.city}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[8px] uppercase tracking-wider ${
                      o.status === 'Delivered' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {o.status}
                    </span>
                  </div>
                ))}
                {riderOrders.length === 0 && (
                  <div className="text-center py-6 text-zinc-400 font-bold">
                    No courier activities recorded today.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: DELIVERIES (ACTIVE WORKFLOW) ================= */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4">
            
            {activeOrder ? (
              <div className="space-y-4">
                
                {/* Active order status card */}
                <div className="bg-white border border-zinc-200/40 p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-baseline border-b pb-2">
                    <div>
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-brand-burgundy block">ACTIVE JOB</span>
                      <h4 className="font-extrabold text-sm text-zinc-900">Order #{activeOrder.id}</h4>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{activeOrder.eta} ETA</span>
                  </div>
                  <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-wider text-zinc-450 py-2 border-b border-t my-1">
                    <span className={`flex flex-col items-center gap-1 ${activeOrder.status === 'Assigned' ? 'text-brand-burgundy font-black' : ''}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${activeOrder.status === 'Assigned' ? 'bg-brand-burgundy animate-pulse' : 'bg-zinc-200'}`} />
                      ASSIGNED
                    </span>
                    <span className="h-px bg-zinc-200 flex-grow mx-0.5" />
                    <span className={`flex flex-col items-center gap-1 ${activeOrder.status === 'Accepted' ? 'text-brand-burgundy font-black' : ''}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${activeOrder.status === 'Accepted' ? 'bg-brand-burgundy' : 'bg-zinc-200'}`} />
                      ACCEPTED
                    </span>
                    <span className="h-px bg-zinc-200 flex-grow mx-0.5" />
                    <span className={`flex flex-col items-center gap-1 ${activeOrder.status === 'Picked Up' ? 'text-brand-burgundy font-black' : ''}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${activeOrder.status === 'Picked Up' ? 'bg-brand-burgundy animate-pulse' : 'bg-zinc-200'}`} />
                      PICKED UP
                    </span>
                    <span className="h-px bg-zinc-200 flex-grow mx-0.5" />
                    <span className={`flex flex-col items-center gap-1 ${activeOrder.status === 'Out for Delivery' ? 'text-brand-burgundy font-black' : ''}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${activeOrder.status === 'Out for Delivery' ? 'bg-brand-burgundy animate-pulse' : 'bg-zinc-200'}`} />
                      TRANSIT
                    </span>
                    <span className="h-px bg-zinc-200 flex-grow mx-0.5" />
                    <span className={`flex flex-col items-center gap-1 ${activeOrder.status === 'Delivered' ? 'text-emerald-700 font-black' : ''}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${activeOrder.status === 'Delivered' ? 'bg-emerald-600' : 'bg-zinc-200'}`} />
                      DELIVERED
                    </span>
                  </div>

                  {/* Address Summary */}
                  <div className="bg-zinc-50 border rounded-xl p-3 text-[11px] font-medium space-y-2 text-zinc-650">
                    <div>
                      <p className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400">PICKUP LOCATION</p>
                      <p className="font-bold text-zinc-800">FATAFAT Store — {activeOrder.deliveryLocationName || 'Nawabganj, Unnao'}</p>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400">DELIVERY DROP</p>
                      <p className="font-bold text-zinc-900">{activeOrder.address.name}</p>
                      <p className="text-[10px] text-zinc-500 leading-normal">{activeOrder.address.house}, {activeOrder.address.street}, {activeOrder.address.city}</p>
                    </div>
                  </div>
                </div>

                {/* NEW ASSIGNED ORDER SCREEN */}
                {activeOrder.status === 'Assigned' && (
                  <div className="bg-white border border-zinc-200/40 p-5 rounded-2xl shadow-sm text-center py-6 space-y-4">
                    <div className="h-12 w-12 bg-brand-burgundy/5 text-brand-burgundy rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Truck className="h-6 w-6 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-serif font-black text-sm uppercase tracking-wider text-brand-burgundy">NEW DELIVERY ASSIGNED</h4>
                      <p className="text-[10px] text-zinc-500 font-medium font-sans">Accept order to begin checklist and hub pickup.</p>
                    </div>

                    <div className="border p-3.5 rounded-xl bg-zinc-50 text-[11px] text-left font-medium space-y-2 text-zinc-700">
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-zinc-400">Order ID</span>
                        <span className="font-black text-zinc-800">#{activeOrder.id}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-zinc-400">Pickup</span>
                        <span className="font-bold text-zinc-900">FATAFAT Store — {activeOrder.deliveryLocationName}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-zinc-400">Delivery Drop</span>
                        <span className="font-bold text-zinc-900 truncate max-w-[150px]">{activeOrder.address.house}, {activeOrder.address.street}, {activeOrder.address.city}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1.5">
                        <span className="text-zinc-400">Items Count</span>
                        <span className="font-bold text-zinc-900">{activeOrder.items.reduce((acc, i) => acc + i.quantity, 0)} items</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Earnings Payout</span>
                        <span className="font-black text-emerald-700 font-sans">₹125.00</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => showToast(`Order Details: ${activeOrder.items.map(i => `${i.name} x${i.quantity}`).join(', ')}`, 'info')}
                        className="flex-1 py-3 bg-zinc-150/40 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                      >
                        View Order
                      </button>
                      <button
                        onClick={() => {
                          updateOrderStatus(activeOrder.id, 'Accepted');
                          showToast('Delivery ticket accepted! Proceeding to pickup.', 'success');
                        }}
                        className="flex-1 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider text-[10px]"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. PICKUP CHECKLIST SCREEN (if status is Accepted/Preparing/Confirmed/Packed) */}
                {(activeOrder.status === 'Accepted' || activeOrder.status === 'Pending' || activeOrder.status === 'Confirmed' || activeOrder.status === 'Preparing' || activeOrder.status === 'Packed') && (
                  <div className="bg-white border border-zinc-200/40 p-4 rounded-2xl shadow-sm space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-serif font-black uppercase tracking-wider text-zinc-800">1. Hub Pickup Checklist</h4>
                      <p className="text-[9px] text-zinc-500 font-medium">Verify each item physically at the counter before heading out.</p>
                    </div>

                    <div className="divide-y space-y-3">
                      {activeOrder.items.map((item) => (
                        <div key={item.productId} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-[11px] font-medium text-zinc-700">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-zinc-50 border rounded-lg overflow-hidden shrink-0">
                              <SafeImage src={item.image} alt={item.name} />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-800 leading-tight">{item.name}</p>
                              <p className="text-[9px] text-zinc-400 font-sans">QTY: <span className="font-extrabold text-zinc-650">x{item.quantity}</span></p>
                            </div>
                          </div>
                          
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checklistItems[item.productId] || false}
                              onChange={() => toggleChecklistItem(item.productId)}
                              className="h-4 w-4 text-brand-burgundy rounded focus:ring-brand-burgundy"
                            />
                            <span className="text-[10px] font-bold text-zinc-600">VERIFIED</span>
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                           type="checkbox"
                           checked={checklistHubVerified}
                           onChange={(e) => setChecklistHubVerified(e.target.checked)}
                           className="h-4 w-4 mt-0.5 text-brand-burgundy rounded focus:ring-brand-burgundy"
                        />
                        <div>
                          <span className="text-[10px] font-bold text-zinc-800 block">Verify order box seal</span>
                          <span className="text-[8px] text-zinc-400 leading-normal block">Confirm items are properly packed in thermal delivery bags.</span>
                        </div>
                      </label>
                    </div>

                    <button
                      disabled={!isChecklistComplete || isConfirmingPickup}
                      onClick={handleConfirmPickup}
                      className={`w-full py-3.5 rounded-xl font-serif font-bold text-[10px] uppercase tracking-wider shadow transition-all flex items-center justify-center gap-1.5 ${
                        isChecklistComplete && !isConfirmingPickup
                          ? 'bg-brand-burgundy text-white hover:bg-brand-burgundy-dark hover:scale-101' 
                          : 'bg-zinc-150/40 text-zinc-400 border cursor-not-allowed'
                      }`}
                    >
                      {isConfirmingPickup ? (
                        <>
                          <RotateCw className="h-4 w-4 animate-spin" /> Confirming Pickup...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Confirm & Verify Pickup
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* PICKED UP / READY TO START TRANSIT SCREEN */}
                {activeOrder.status === 'Picked Up' && (
                  <div className="bg-white border border-zinc-200/40 p-5 rounded-2xl shadow-sm text-center py-6 space-y-4">
                    <div className="h-12 w-12 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
                      <Navigation className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-serif font-black text-sm uppercase tracking-wider text-brand-burgundy">2. Dispatch Verification Complete</h4>
                      <p className="text-[10px] text-zinc-500 font-medium">Verify items are locked in courier box. Click below to start transit.</p>
                    </div>

                    <button
                      onClick={handleStartTransit}
                      className="w-full py-3.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-serif font-bold text-[10px] uppercase tracking-wider shadow transition-all flex items-center justify-center gap-1.5 hover:scale-101"
                    >
                      <Truck className="h-4 w-4" /> Start Transit / Out for Delivery
                    </button>
                  </div>
                )}

                {/* 2. TRANSIT / OUT FOR DELIVERY SCREEN */}
                {activeOrder.status === 'Out for Delivery' && (
                  <div className="space-y-4">
                    <div className="bg-white border border-zinc-200/40 p-4 rounded-2xl shadow-sm text-center py-6 space-y-3">
                      <div className="h-12 w-12 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Navigation className="h-6 w-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-serif font-black text-sm uppercase tracking-wider text-brand-burgundy">2. Out For Delivery</h4>
                        <p className="text-[10px] text-zinc-500 font-medium">Transit coordinates locked. Deliver to sector destination.</p>
                      </div>

                      {/* Mock Navigation Map */}
                      <div className="border border-zinc-200/40 rounded-xl bg-zinc-50 p-4 font-bold text-center text-zinc-500 text-[10px] space-y-2">
                        <p className="text-zinc-800 font-bold uppercase tracking-wider">Estimated Transit Route</p>
                        <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden w-48 mx-auto">
                          <div className="h-full bg-brand-burgundy rounded-full animate-pulse w-3/4" />
                        </div>
                        <p className="text-[8px] text-zinc-450 uppercase">Waypoint sector 45 • 8 min away</p>
                      </div>

                      {/* Communications */}
                      <div className="flex gap-2 justify-center pt-2">
                        <button
                          onClick={() => showToast(`Dialing client: ${activeOrder.address.mobile}`, 'info')}
                          className="px-5 py-2.5 bg-white border hover:bg-zinc-50 rounded-xl font-bold flex items-center gap-1.5 text-zinc-700 text-[10px]"
                        >
                          <Phone className="h-4 w-4 text-emerald-600" /> CALL CLIENT
                        </button>
                        <button
                          onClick={() => showToast('Opening system messenger...', 'info')}
                          className="px-5 py-2.5 bg-white border hover:bg-zinc-50 rounded-xl font-bold flex items-center gap-1.5 text-zinc-700 text-[10px]"
                        >
                          <MessageSquare className="h-4 w-4 text-brand-burgundy" /> SEND TEXT
                        </button>
                      </div>

                      {!arrivedNotify ? (
                        <button
                          onClick={handleArrived}
                          className="w-full py-3.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow text-[10px]"
                        >
                          📍 I HAVE ARRIVED
                        </button>
                      ) : (
                        <div className="space-y-4 pt-4 border-t text-left">
                          <span className="text-[9px] bg-green-50 text-green-700 border border-green-100 font-bold uppercase px-2.5 py-1 rounded block text-center animate-pulse">
                            🟢 CLIENT NOTIFIED OF ARRIVAL
                          </span>

                          {/* OTP inputs */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-450 block">Enter 6-Digit Delivery OTP</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                maxLength={6}
                                placeholder="e.g. 482731"
                                value={otpCode}
                                onChange={(e) => {
                                  setOtpCode(e.target.value);
                                  setOtpError('');
                                }}
                                className="p-3 border rounded-xl font-mono text-center tracking-[0.2em] text-xs font-black w-36 bg-white focus:outline-none focus:border-brand-burgundy text-zinc-800"
                              />
                              <span className="text-[9px] text-zinc-400 font-medium font-sans">Ask customer for the OTP on their tracking page</span>
                            </div>
                            {otpError && <p className="text-[9px] text-red-650 font-sans font-bold">{otpError}</p>}
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={handleCompleteDelivery}
                              className="flex-grow py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow text-[10px] text-center"
                            >
                              ✓ MARK AS DELIVERED
                            </button>
                            <button
                              onClick={() => {
                                setShowFailForm(true);
                                setFailedReason('');
                              }}
                              className="py-3.5 px-4 bg-zinc-150 border hover:bg-zinc-250 text-zinc-650 font-bold rounded-xl text-[10px] text-center"
                            >
                              REPORT CLAIM
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Return Claim ticket form */}
                    {showFailForm && (
                      <div className="bg-white border border-zinc-200/40 p-4 rounded-2xl shadow-sm space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                          <h4 className="font-extrabold text-[10px] text-zinc-800 uppercase tracking-wider">Report Delivery Issue</h4>
                          <button onClick={() => setShowFailForm(false)} className="text-zinc-400 hover:text-zinc-700">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-3 text-[11px] font-medium text-zinc-700">
                          <div className="space-y-1">
                            <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">Issue Reason</span>
                            <select
                              value={failedReason}
                              onChange={(e) => setFailedReason(e.target.value)}
                              className="w-full p-2.5 border rounded-xl focus:outline-none bg-white font-medium"
                            >
                              <option value="">-- Choose Reason --</option>
                              <option value="Customer Unavailable">Customer Unavailable</option>
                              <option value="Wrong Address / Coordinates">Wrong Address / Coordinates</option>
                              <option value="Customer Refused Order">Customer Refused Order</option>
                              <option value="Item Wilting or Damaged">Item Wilting or Damaged</option>
                              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">Comments</span>
                            <textarea
                              rows={3}
                              placeholder="Describe transit issue..."
                              value={failedComment}
                              onChange={(e) => setFailedComment(e.target.value)}
                              className="w-full p-2.5 border rounded-xl focus:outline-none font-medium bg-white"
                            />
                          </div>

                          <button
                            onClick={handleFailDelivery}
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px]"
                          >
                            Submit Claim Ticket
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            ) : (
              // Empty active delivery state
              <div className="bg-white border border-zinc-200/40 p-8 rounded-3xl shadow-sm text-center space-y-4">
                <div className="h-16 w-16 bg-[#FFF0EE] rounded-full flex items-center justify-center mx-auto text-brand-burgundy shadow-sm">
                  <CheckCircle2 className="h-8 w-8 text-brand-burgundy" />
                </div>
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h3 className="font-serif font-black text-sm uppercase tracking-wider text-zinc-900">You&apos;re all caught up! 🎉</h3>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                    No active deliveries assigned to your rider profile. Stay online to capture new courier tickets from your authorized zone.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ================= TAB 3: ISSUES (INVENTORY MANAGEMENT) ================= */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            
            {/* Adjustment Form Modal overlay */}
            {selectedInvProduct ? (
              <form onSubmit={submitQuantityReport} className="bg-white border border-zinc-200/40 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-extrabold text-[10px] text-zinc-800 uppercase tracking-wider">Update Available Physical Stock</h4>
                  <button type="button" onClick={() => setSelectedInvProduct(null)} className="text-zinc-450 hover:text-zinc-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-3 items-center">
                  <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 border bg-zinc-50">
                    <SafeImage src={selectedInvProduct.image} alt={selectedInvProduct.name} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-zinc-800 truncate leading-snug">{selectedInvProduct.name}</h5>
                    <p className="text-[9px] text-zinc-400">SKU: FT-{selectedInvProduct.id.slice(0, 6).toUpperCase()}</p>
                  </div>
                </div>

                <div className="space-y-3 text-[11px] font-medium text-zinc-700">
                  <div className="space-y-1">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">Physical Quantity count</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={physicalCount}
                      onChange={(e) => setPhysicalCount(Number(e.target.value))}
                      className="w-full p-2.5 border rounded-xl focus:outline-none bg-white text-zinc-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">Reason for Update</span>
                    <select
                      value={updateReason}
                      onChange={(e) => setUpdateReason(e.target.value)}
                      className="w-full p-2.5 border rounded-xl focus:outline-none bg-white font-medium text-zinc-800"
                    >
                      <option value="Physical count">Physical count adjustment</option>
                      <option value="Damaged Quantity">Damaged Quantity at counter</option>
                      <option value="Missing Item">Missing from counter basket</option>
                      <option value="Out of Stock">Temporary Hub unavailability</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider text-[10px]"
                  >
                    SUBMIT INVENTORY ADJUSTMENT
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                
                {/* Search products bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search product / SKU to report issues..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    className="w-full p-3 pl-9 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:border-brand-burgundy font-medium text-zinc-800"
                  />
                  <Compass className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
                </div>

                {/* Products list for stock reports */}
                <div className="bg-white border border-zinc-200/40 rounded-2xl shadow-sm divide-y text-[11px] font-medium text-zinc-700">
                  <div className="p-3 bg-zinc-50/75 border-b font-extrabold text-zinc-700 text-[10px]">
                    HUB INVENTORY STOCK CONTROLS
                  </div>
                  {filteredProducts.slice(0, 5).map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50/20">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border bg-zinc-50">
                          <SafeImage src={p.image} alt={p.name} />
                        </div>
                        <div>
                          <h5 className="font-bold text-zinc-800 leading-snug">{p.name}</h5>
                          <p className="text-[9px] text-zinc-400">SKU: FT-{p.id.slice(0,6).toUpperCase()}</p>
                          <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${p.inStock ? 'text-green-700' : 'text-red-600'}`}>
                            {p.inStock ? '🟢 Available' : '🔴 Out of Stock'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvProduct(p);
                            setPhysicalCount(p.inStock ? 8 : 0);
                            setUpdateReason('Physical count');
                          }}
                          className="px-2.5 py-1.5 border rounded-lg hover:bg-zinc-50 text-[9px] font-extrabold uppercase tracking-wider"
                        >
                          Adjust Count
                        </button>
                        {p.inStock ? (
                          <button
                            type="button"
                            onClick={() => handleReportIssue(p.id, p.name, 'Product out of stock', 0, 1)}
                            className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 font-sans"
                          >
                            Report Out
                          </button>
                        ) : (
                          <span className="text-[8px] bg-red-50 text-red-650 px-2 py-1.5 rounded-lg font-extrabold uppercase tracking-wider">
                            Reported Out
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* My reports logs */}
                <div className="bg-white border border-zinc-200/40 rounded-2xl shadow-sm p-4 space-y-3">
                  <h4 className="text-xs font-serif font-black uppercase tracking-wider text-zinc-800">My Reports History</h4>
                  <div className="divide-y space-y-2 text-[10px] font-medium text-zinc-650">
                    {reportsLog.map((r, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex justify-between items-center">
                        <div className="text-left">
                          <p className="font-bold text-zinc-800">{r.product.name}</p>
                          <p className="text-[8px] text-zinc-400">{r.issue} • {r.date}</p>
                        </div>
                        <span className="font-mono text-zinc-700">QTY: {r.reportedStock} (Applied)</span>
                      </div>
                    ))}
                    {reportsLog.length === 0 && (
                      <div className="text-center py-6 text-zinc-400 font-bold">
                        No inventory adjustments filed yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ================= TAB 4: HISTORY ================= */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-white border border-zinc-200/40 p-4 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-xs font-serif font-black uppercase tracking-wider text-zinc-800">Delivery History Logs</h3>
              <p className="text-[9px] text-zinc-550 font-medium leading-normal font-sans">
                History of shift assignments under {user?.name || 'Rahul'} (ID: {user?.deliveryPartnerId || 'DP-001'}).
              </p>
            </div>

            <div className="bg-white border border-zinc-200/40 rounded-2xl shadow-sm divide-y text-[11px] font-medium text-zinc-700">
              {completedOrders.map((o) => (
                <div key={o.id} className="p-3 flex justify-between items-center">
                  <div className="text-left space-y-0.5">
                    <h5 className="font-bold text-zinc-900">Order #{o.id}</h5>
                    <p className="text-[9px] text-zinc-400 font-sans">{o.address.city} • Payout: ₹125</p>
                  </div>
                  
                  <span className="text-[8px] bg-green-50 text-green-700 font-black border border-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    DELIVERED
                  </span>
                </div>
              ))}
              {completedOrders.length === 0 && (
                <div className="text-center py-8 text-zinc-400 font-bold">
                  No completed delivery records.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 5: PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Rider profile details */}
            <div className="bg-white border border-zinc-200/40 p-6 rounded-3xl shadow-sm text-center space-y-4">
              <div className="h-16 w-16 bg-brand-burgundy text-white flex items-center justify-center rounded-full font-serif font-black text-xl mx-auto shadow-md">
                {user?.name?.[0] || 'R'}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">{user?.name || 'Rahul'}</h3>
                <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold mt-0.5">{user?.deliveryPartnerId || 'DP-001'} • active delivery partner</p>
              </div>

              <div className="border-t pt-4 text-left space-y-2.5 text-[11px] font-medium text-zinc-700 font-sans">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-zinc-450">Mobile Contact</span>
                  <span className="font-bold">{user?.phone || '9999999999'}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-zinc-450">Registered Email</span>
                  <span className="font-bold">{user?.email || 'rider@fatafat.com'}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-zinc-450">Operating Zone</span>
                  <span className="font-bold">{user?.locationName || 'Nawabganj, Unnao'}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-zinc-450">Rider Hub</span>
                  <span className="font-bold">FATAFAT Hub — {user?.locationId === 'nawabganj-unnao' ? 'Nawabganj' : 'Chandigarh University'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-450">Courier Vehicle</span>
                  <span className="font-bold">{user?.deliveryPartnerId === 'DP-001' ? 'Honda Activa (UP-35-ED-2810)' : 'Hero Splendor (UP-16-AX-1209)'}</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  localStorage.removeItem('fatafat_user');
                  showToast('Logged out successfully.', 'info');
                  router.push('/');
                }}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold uppercase tracking-wider text-[10px]"
              >
                Sign Out Partner Session
              </button>
            </div>
          </div>
        )}

      </main>

      {/* 3. MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 inset-x-0 z-45 bg-white border-t border-zinc-200/60 h-16 flex items-center justify-around px-4 select-none shadow-lg">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-brand-burgundy font-black scale-103' : 'text-zinc-400 hover:text-zinc-700'}`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[8px] uppercase tracking-wider font-bold">Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('deliveries')}
          className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'deliveries' ? 'text-brand-burgundy font-black scale-103' : 'text-zinc-400 hover:text-zinc-700'}`}
        >
          <Truck className="h-5 w-5" />
          <span className="text-[8px] uppercase tracking-wider font-bold">Deliveries</span>
          {activeOrder && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand-burgundy animate-ping" />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('issues')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'issues' ? 'text-brand-burgundy font-black scale-103' : 'text-zinc-400 hover:text-zinc-700'}`}
        >
          <AlertTriangle className="h-5 w-5" />
          <span className="text-[8px] uppercase tracking-wider font-bold">Issues</span>
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-brand-burgundy font-black scale-103' : 'text-zinc-400 hover:text-zinc-700'}`}
        >
          <History className="h-5 w-5" />
          <span className="text-[8px] uppercase tracking-wider font-bold">History</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-brand-burgundy font-black scale-103' : 'text-zinc-400 hover:text-zinc-700'}`}
        >
          <User className="h-5 w-5" />
          <span className="text-[8px] uppercase tracking-wider font-bold">Profile</span>
        </button>
      </nav>

    </div>
  );
}
