'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Search, SlidersHorizontal, ArrowUpRight, CheckCircle2, 
  Clock, AlertCircle, RefreshCw, Eye, PenTool, Gift, Camera, 
  DollarSign, Send, Copy, ExternalLink, X, Check, Phone, Mail,
  ShoppingBag, User, FileText, ChevronRight, ShieldCheck, ArrowRight
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import SafeImage from '../../../components/SafeImage';

export interface CustomRequestItem {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  mobile: string;
  requestType: 'EXISTING_PRODUCT' | 'UNLISTED_PRODUCT';
  productId?: string;
  productName?: string;
  requestedDetails?: string;
  quantity: number;
  variant?: string;
  flavour?: string;
  personalisationType?: string;
  personalisationMessage?: string;
  uploadedImageUrl?: string;
  referenceImageUrl?: string;
  specialInstructions?: string;
  preferredDeliveryDate?: string;
  preferredDeliveryTime?: string;
  budget?: string | number;
  status: string;
  adminNotes?: string;
  quotedAmount?: number;
  paymentStatus: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  customOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCustomRequestsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<CustomRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Selected Request Modal State
  const [selectedReq, setSelectedReq] = useState<CustomRequestItem | null>(null);
  const [modalQuotedPrice, setModalQuotedPrice] = useState<string>('');
  const [modalAdminNotes, setModalAdminNotes] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<string>('Request Submitted');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isGeneratingPaymentLink, setIsGeneratingPaymentLink] = useState(false);
  const [paymentLinkData, setPaymentLinkData] = useState<{ url: string; msg: string } | null>(null);

  // Photo Zoom Modal
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  const fetchRequests = useCallback(async (showIndicator = false) => {
    if (showIndicator) setLoading(true);
    try {
      const res = await fetch(`/api/admin/custom-requests?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.customRequests || []);
      }
    } catch (err) {
      console.error('Error fetching custom requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(true);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchRequests(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  // Sync selected request with modal state
  useEffect(() => {
    if (selectedReq) {
      setModalQuotedPrice(selectedReq.quotedAmount ? String(selectedReq.quotedAmount) : '');
      setModalAdminNotes(selectedReq.adminNotes || '');
      setModalStatus(selectedReq.status || 'Request Submitted');
      setPaymentLinkData(selectedReq.paymentLinkUrl ? {
        url: selectedReq.paymentLinkUrl,
        msg: `Hi ${selectedReq.customerName}, your custom order #${selectedReq.customOrderId || selectedReq.id} for "${selectedReq.productName}" (Total: ₹${selectedReq.quotedAmount || 0}) is ready for payment: ${selectedReq.paymentLinkUrl}`
      } : null);
    }
  }, [selectedReq]);

  // Metrics
  const metrics = useMemo(() => {
    const total = requests.length;
    const underReview = requests.filter(r => r.status === 'Request Submitted' || r.status === 'Under Review').length;
    const quoteReady = requests.filter(r => r.status === 'Available / Quote Ready' || r.status === 'Payment Pending').length;
    const paid = requests.filter(r => r.paymentStatus === 'PAID' || r.status === 'Paid' || r.status === 'Confirmed' || r.status === 'Delivered').length;
    return { total, underReview, quoteReady, paid };
  }, [requests]);

  // Filtered list
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (typeFilter !== 'All' && r.requestType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = r.id.toLowerCase().includes(q);
        const nameMatch = r.customerName.toLowerCase().includes(q);
        const mobileMatch = r.mobile.toLowerCase().includes(q);
        const emailMatch = r.email.toLowerCase().includes(q);
        const prodMatch = (r.productName || '').toLowerCase().includes(q);
        const orderMatch = (r.customOrderId || '').toLowerCase().includes(q);
        return idMatch || nameMatch || mobileMatch || emailMatch || prodMatch || orderMatch;
      }
      return true;
    });
  }, [requests, statusFilter, typeFilter, searchQuery]);

  // Update Status & Quote Action
  const handleUpdate = async () => {
    if (!selectedReq) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/custom-requests/${encodeURIComponent(selectedReq.id)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: modalStatus,
          quotedAmount: modalQuotedPrice ? Number(modalQuotedPrice) : undefined,
          adminNotes: modalAdminNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Request #${selectedReq.id} updated!`, 'success');
        setSelectedReq(data.customRequest);
        await fetchRequests(false);
      } else {
        showToast(data.error || 'Failed to update request.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating request.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Create Custom Order Action
  const handleCreateOrder = async () => {
    if (!selectedReq) return;
    const price = Number(modalQuotedPrice || selectedReq.quotedAmount || 0);
    if (!price || price <= 0) {
      showToast('Please set a valid quoted price before creating a custom order.', 'error');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const res = await fetch(`/api/admin/custom-requests/${encodeURIComponent(selectedReq.id)}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          productName: selectedReq.productName
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Custom order #${data.order.id} created successfully!`, 'success');
        await fetchRequests(false);
        if (data.order?.id) {
          setSelectedReq({ ...selectedReq, customOrderId: data.order.id, status: 'Payment Pending' });
        }
      } else {
        showToast(data.error || 'Failed to create custom order.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating custom order.', 'error');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Generate Payment Link Action
  const handleGeneratePaymentLink = async () => {
    if (!selectedReq) return;
    const price = Number(modalQuotedPrice || selectedReq.quotedAmount || 0);
    if (!price || price <= 0) {
      showToast('Please set a valid price before generating a payment link.', 'error');
      return;
    }

    setIsGeneratingPaymentLink(true);
    try {
      const res = await fetch(`/api/admin/custom-requests/${encodeURIComponent(selectedReq.id)}/payment-link`, {
        method: 'POST'
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Payment link generated!', 'success');
        setPaymentLinkData({
          url: data.paymentLinkUrl,
          msg: data.shareMessage
        });
        await fetchRequests(false);
      } else {
        showToast(data.error || 'Failed to generate payment link.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating payment link.', 'error');
    } finally {
      setIsGeneratingPaymentLink(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, 'success');
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <h3 className="text-xl font-serif font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-burgundy" /> Custom & Personalisation Requests
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Review customer photo cake uploads, bespoke messages, and unlisted product sourcing requests in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRequests(true)}
            className="p-2 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-zinc-600 transition-colors"
            title="Refresh Requests"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Total Inquiries</span>
          <p className="text-xl font-black text-zinc-900">{metrics.total}</p>
          <span className="text-[9px] text-zinc-400">All customer requests</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-widest block">Under Review</span>
          <p className="text-xl font-black text-amber-800">{metrics.underReview}</p>
          <span className="text-[9px] text-zinc-400">Requires review / quote</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold text-blue-700 uppercase tracking-widest block">Quoted / Pending</span>
          <p className="text-xl font-black text-blue-800">{metrics.quoteReady}</p>
          <span className="text-[9px] text-zinc-400">Awaiting customer payment</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs space-y-1">
          <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-widest block">Paid / Confirmed</span>
          <p className="text-xl font-black text-emerald-800">{metrics.paid}</p>
          <span className="text-[9px] text-zinc-400">In production & dispatch</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-zinc-200/80 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 shadow-xs">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            placeholder="Search by Request ID, customer, phone, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy font-semibold text-zinc-700"
          >
            <option value="All">All Statuses ({requests.length})</option>
            <option value="Request Submitted">Request Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Available / Quote Ready">Available / Quote Ready</option>
            <option value="Payment Pending">Payment Pending</option>
            <option value="Paid">Paid</option>
            <option value="Not Available">Not Available</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Request Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full p-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy font-semibold text-zinc-700"
          >
            <option value="All">All Request Types</option>
            <option value="EXISTING_PRODUCT">Personalised Product</option>
            <option value="UNLISTED_PRODUCT">Unlisted Custom Request</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-zinc-200 rounded-3xl bg-white shadow-sm flex flex-col items-center justify-center space-y-3">
          <Sparkles className="h-10 w-10 text-zinc-300" />
          <h4 className="font-serif font-extrabold text-zinc-800 text-sm">No Custom Requests Found</h4>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            {searchQuery ? 'No requests match your search criteria.' : 'Customer personalisation and unlisted requests will appear here in real-time.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-bold uppercase tracking-wider text-zinc-500 select-none">
                  <th className="p-3.5 pl-4">Request ID & Date</th>
                  <th className="p-3.5">Customer Contact</th>
                  <th className="p-3.5">Product & Customisation</th>
                  <th className="p-3.5">Quoted Price & Payment</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredRequests.map((req) => {
                  const hasPhoto = !!(req.uploadedImageUrl || req.referenceImageUrl);
                  const isPaid = req.paymentStatus === 'PAID' || req.status === 'Paid';

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-amber-50/20 transition-all cursor-pointer group"
                      onClick={() => setSelectedReq(req)}
                    >
                      {/* Request ID & Date */}
                      <td className="p-3.5 pl-4 align-top">
                        <span className="font-mono font-bold text-brand-burgundy text-xs block group-hover:underline">
                          #{req.id}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Recent'}
                        </span>
                        <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          req.requestType === 'UNLISTED_PRODUCT'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {req.requestType === 'UNLISTED_PRODUCT' ? '🎁 Unlisted' : '✨ Personalised'}
                        </span>
                      </td>

                      {/* Customer Contact */}
                      <td className="p-3.5 align-top">
                        <p className="font-bold text-zinc-900 leading-snug">{req.customerName}</p>
                        <a 
                          href={`tel:${req.mobile}`} 
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-brand-burgundy hover:underline font-mono font-medium block"
                        >
                          {req.mobile}
                        </a>
                        {req.email && (
                          <span className="text-[10px] text-zinc-400 truncate max-w-[150px] block">
                            {req.email}
                          </span>
                        )}
                      </td>

                      {/* Product & Customisation */}
                      <td className="p-3.5 align-top max-w-[280px]">
                        <div className="space-y-1">
                          <p className="font-semibold text-zinc-900 text-xs line-clamp-1">{req.productName}</p>
                          <div className="flex flex-wrap gap-1 text-[9px]">
                            {req.variant && (
                              <span className="px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded font-bold">
                                {req.variant}
                              </span>
                            )}
                            {req.flavour && (
                              <span className="px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded font-bold">
                                {req.flavour}
                              </span>
                            )}
                            {req.quantity > 1 && (
                              <span className="px-1.5 py-0.2 bg-zinc-100 text-zinc-700 rounded font-black">
                                ×{req.quantity}
                              </span>
                            )}
                          </div>

                          {/* Customisation / Message note */}
                          {req.personalisationMessage && (
                            <p className="text-[10px] text-amber-900 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/40 italic font-medium line-clamp-2">
                              &ldquo;{req.personalisationMessage}&rdquo;
                            </p>
                          )}

                          {hasPhoto && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              <Camera className="h-3 w-3" /> Photo Attached
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quoted Price & Payment */}
                      <td className="p-3.5 align-top">
                        {req.quotedAmount ? (
                          <span className="font-black text-xs text-zinc-900 block">₹{req.quotedAmount}</span>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px] block">Not Set</span>
                        )}
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-1 ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isPaid ? '✓ PAID' : 'PENDING'}
                        </span>
                        {req.customOrderId && (
                          <span className="text-[9px] text-brand-burgundy font-mono block mt-1 font-bold">
                            Order #{req.customOrderId}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 align-top">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                          req.status === 'Paid' || req.status === 'Confirmed' || req.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'Available / Quote Ready' || req.status === 'Payment Pending'
                            ? 'bg-blue-100 text-blue-800'
                            : req.status === 'Not Available' || req.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 align-top text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReq(req);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-brand-burgundy hover:bg-brand-burgundy/10 rounded-lg transition-all inline-flex items-center gap-1 border border-brand-burgundy/20"
                        >
                          Review & Action <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REQUEST DETAIL & ACTION MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReq(null)}>
          <div 
            className="relative bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-black text-base text-zinc-900">
                    Request #{selectedReq.id}
                  </h3>
                  <span className="px-2 py-0.5 bg-brand-burgundy/10 text-brand-burgundy rounded text-[9px] font-bold">
                    {selectedReq.requestType === 'UNLISTED_PRODUCT' ? 'Unlisted Product' : 'Personalised Product'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                  Submitted on {new Date(selectedReq.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Customer & Product Two-Column Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Box */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block flex items-center gap-1">
                  <User className="h-3 w-3" /> Customer Information
                </span>
                <p className="font-bold text-zinc-900 text-xs">{selectedReq.customerName}</p>
                <div className="flex items-center gap-2 text-[10px]">
                  <Phone className="h-3 w-3 text-zinc-400" />
                  <a href={`tel:${selectedReq.mobile}`} className="font-bold text-brand-burgundy hover:underline">
                    {selectedReq.mobile}
                  </a>
                </div>
                {selectedReq.email && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <Mail className="h-3 w-3 text-zinc-400" />
                    <a href={`mailto:${selectedReq.email}`} className="text-zinc-600 hover:underline truncate">
                      {selectedReq.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Product / Request Summary */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" /> Item Specifications
                </span>
                <p className="font-bold text-zinc-900 text-xs">{selectedReq.productName}</p>
                <div className="text-[10px] text-zinc-600 space-y-0.5">
                  <p>Quantity: <strong>{selectedReq.quantity}</strong></p>
                  {selectedReq.variant && <p>Variant/Size: <strong>{selectedReq.variant}</strong></p>}
                  {selectedReq.flavour && <p>Flavour: <strong>{selectedReq.flavour}</strong></p>}
                  {selectedReq.preferredDeliveryDate && (
                    <p>Delivery: <strong>{selectedReq.preferredDeliveryDate} ({selectedReq.preferredDeliveryTime || 'Standard'})</strong></p>
                  )}
                  {selectedReq.budget && <p>Customer Budget: <strong>{selectedReq.budget}</strong></p>}
                </div>
              </div>
            </div>

            {/* Customisation & Message Box */}
            {selectedReq.personalisationMessage && (
              <div className="p-3.5 bg-amber-50/80 border border-brand-burgundy/20 rounded-2xl space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-brand-burgundy block flex items-center gap-1">
                  <PenTool className="h-3 w-3" /> Custom Inscription / Cake Message
                </span>
                <p className="font-serif font-bold text-zinc-900 text-xs italic">
                  &ldquo;{selectedReq.personalisationMessage}&rdquo;
                </p>
              </div>
            )}

            {/* Detailed Description / Special Instructions */}
            {(selectedReq.requestedDetails || selectedReq.specialInstructions) && (
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                  Customer Notes & Detailed Description
                </span>
                <p className="text-zinc-700 text-xs leading-relaxed font-medium">
                  {selectedReq.requestedDetails || selectedReq.specialInstructions}
                </p>
              </div>
            )}

            {/* Uploaded Photo / Reference Image Box */}
            {(selectedReq.uploadedImageUrl || selectedReq.referenceImageUrl) && (
              <div className="p-3.5 bg-white border border-purple-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setZoomPhotoUrl(selectedReq.uploadedImageUrl || selectedReq.referenceImageUrl || null)}
                    className="h-14 w-14 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0 cursor-pointer group relative"
                  >
                    <img 
                      src={selectedReq.uploadedImageUrl || selectedReq.referenceImageUrl} 
                      alt="Customer Upload" 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-900 block flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" /> Customer Uploaded Photo / Sketch
                    </span>
                    <span className="text-[9px] text-zinc-500">Click to inspect high-resolution image</span>
                  </div>
                </div>
                <button
                  onClick={() => setZoomPhotoUrl(selectedReq.uploadedImageUrl || selectedReq.referenceImageUrl || null)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[10px] rounded-lg border border-purple-200 transition-colors"
                >
                  View Full Image
                </button>
              </div>
            )}

            {/* Pricing & Admin Action Controls */}
            <div className="p-4 bg-zinc-50/80 border border-zinc-200/80 rounded-2xl space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-700 block">
                ⚙️ Admin Pricing & Status Controls
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Quoted Price Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                    Final Quoted Price (₹ Total) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 1299"
                    value={modalQuotedPrice}
                    onChange={(e) => setModalQuotedPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy font-bold text-zinc-900"
                  />
                </div>

                {/* Status Dropdown */}
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                    Request Status
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy font-bold text-zinc-700"
                  >
                    <option value="Request Submitted">Request Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Available / Quote Ready">Available / Quote Ready</option>
                    <option value="Payment Pending">Payment Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Not Available">Not Available</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                  Admin Internal Notes / Customer Feedback
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified with chef team. 100% Belgian dark chocolate available for evening delivery..."
                  value={modalAdminNotes}
                  onChange={(e) => setModalAdminNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-brand-burgundy"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-950 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUpdating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save Price & Notes
                </button>

                {!selectedReq.customOrderId && (
                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={isCreatingOrder}
                    className="px-4 py-2 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isCreatingOrder ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShoppingBag className="h-3.5 w-3.5" />}
                    Create Custom Order
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGeneratePaymentLink}
                  disabled={isGeneratingPaymentLink}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isGeneratingPaymentLink ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Generate Payment Link
                </button>
              </div>
            </div>

            {/* Generated Payment Link Share Box */}
            {paymentLinkData && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active Razorpay Payment Link
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={paymentLinkData.url}
                    className="w-full p-2 bg-white border border-emerald-200 rounded-xl text-xs font-mono select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(paymentLinkData.url, 'Payment Link')}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shrink-0"
                    title="Copy Link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={paymentLinkData.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-xl transition-colors shrink-0"
                    title="Open Link"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="p-2 bg-white/80 rounded-xl text-[10px] text-zinc-600 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-700">Pre-formatted Customer Message:</span>
                    <button
                      onClick={() => copyToClipboard(paymentLinkData.msg, 'Share Message')}
                      className="text-brand-burgundy font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      <Copy className="h-3 w-3" /> Copy Message
                    </button>
                  </div>
                  <p className="italic font-medium">{paymentLinkData.msg}</p>
                </div>
              </div>
            )}

            {/* View Linked Order Button if exists */}
            {selectedReq.customOrderId && (
              <div className="flex justify-between items-center p-3.5 bg-brand-burgundy/5 border border-brand-burgundy/20 rounded-2xl">
                <div>
                  <span className="text-[9px] font-bold text-brand-burgundy uppercase block">Linked PostgreSQL Order</span>
                  <span className="font-mono font-black text-xs text-zinc-900">Order #{selectedReq.customOrderId}</span>
                </div>
                <button
                  onClick={() => router.push(`/admin/orders/${selectedReq.customOrderId}`)}
                  className="px-3.5 py-1.5 bg-brand-burgundy text-white font-bold rounded-xl text-xs flex items-center gap-1"
                >
                  View Order Details <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* PHOTO ZOOM MODAL */}
      {zoomPhotoUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setZoomPhotoUrl(null)}>
          <div className="relative bg-white rounded-3xl p-4 max-w-lg max-h-[90vh] overflow-hidden shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-brand-burgundy" /> Customer Uploaded Reference Photo
              </h4>
              <button
                onClick={() => setZoomPhotoUrl(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden max-h-[60vh] bg-zinc-50 flex items-center justify-center border">
              <img src={zoomPhotoUrl} alt="Customer Upload" className="max-h-[60vh] w-auto object-contain" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <a
                href={zoomPhotoUrl}
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

    </div>
  );
}
