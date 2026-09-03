'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Tag, Trash2, X, Check, Search, Users, UserCheck, 
  Calendar, AlertCircle, RefreshCw, Power, Edit3, ShieldAlert,
  Sliders, Info, Clock, CheckCircle2, UserPlus, Sparkles
} from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface CustomerTarget {
  userId: string;
  name: string;
  email: string;
  phone: string;
}

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minSpend?: number;
  maxDiscount?: number;
  startDate?: string | null;
  expiryDate?: string | null;
  isActive: boolean;
  usageLimit?: number | null;
  usageCount: number;
  perCustomerLimit?: number | null;
  targetAudience: 'ALL' | 'SELECTED';
  selectedCustomerIds?: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export default function AdminCouponsPage() {
  const { showToast } = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<CustomerTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [usageLimit, setUsageLimit] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'SELECTED'>('ALL');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Customer search filter inside modal
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Delete modal state
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Coupons and Customers
  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      } else {
        showToast('Failed to load coupons.', 'error');
      }
    } catch {
      showToast('Error loading coupons.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  useEffect(() => {
    void fetchCoupons();
    void fetchCustomers();
  }, []);

  const resetForm = () => {
    setEditingCouponId(null);
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinSpend('');
    setMaxDiscount('');
    setStartDate('');
    setExpiryDate('');
    setIsActive(true);
    setUsageLimit('');
    setPerCustomerLimit('');
    setTargetAudience('ALL');
    setSelectedCustomerIds([]);
    setCustomerSearchQuery('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Coupon) => {
    setEditingCouponId(c.id);
    setCode(c.code);
    setDiscountType(c.discountType === 'flat' ? 'flat' : 'percentage');
    setDiscountValue(String(c.discountValue || ''));
    setMinSpend(c.minSpend ? String(c.minSpend) : '');
    setMaxDiscount(c.maxDiscount ? String(c.maxDiscount) : '');
    setStartDate(c.startDate ? c.startDate.slice(0, 16) : '');
    setExpiryDate(c.expiryDate ? c.expiryDate.slice(0, 16) : '');
    setIsActive(c.isActive);
    setUsageLimit(c.usageLimit ? String(c.usageLimit) : '');
    setPerCustomerLimit(c.perCustomerLimit ? String(c.perCustomerLimit) : '');
    setTargetAudience(c.targetAudience === 'SELECTED' ? 'SELECTED' : 'ALL');
    setSelectedCustomerIds(Array.isArray(c.selectedCustomerIds) ? c.selectedCustomerIds : []);
    setCustomerSearchQuery('');
    setIsModalOpen(true);
  };

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllFilteredCustomers = () => {
    const ids = filteredCustomers.map(c => c.userId);
    const newSet = new Set([...selectedCustomerIds, ...ids]);
    setSelectedCustomerIds(Array.from(newSet));
  };

  const clearSelectedCustomers = () => {
    setSelectedCustomerIds([]);
  };

  const filteredCustomers = useMemo(() => {
    const query = customerSearchQuery.toLowerCase().trim();
    if (!query) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.userId.toLowerCase().includes(query)
    );
  }, [customers, customerSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.toUpperCase().trim();
    const numDiscount = Number(discountValue);

    if (!cleanCode) {
      showToast('Please enter a coupon code.', 'error');
      return;
    }

    if (isNaN(numDiscount) || numDiscount <= 0) {
      showToast('Please enter a valid positive discount value.', 'error');
      return;
    }

    if (discountType === 'percentage' && numDiscount > 100) {
      showToast('Percentage discount cannot exceed 100%.', 'error');
      return;
    }

    if (targetAudience === 'SELECTED' && selectedCustomerIds.length === 0) {
      showToast('Please select at least 1 customer for targeted coupon.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: editingCouponId || undefined,
        code: cleanCode,
        discountType,
        discountValue: numDiscount,
        minSpend: minSpend ? Number(minSpend) : 0,
        maxDiscount: maxDiscount && discountType === 'percentage' ? Number(maxDiscount) : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        isActive,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : null,
        targetAudience,
        selectedCustomerIds: targetAudience === 'SELECTED' ? selectedCustomerIds : []
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(editingCouponId ? `Coupon "${cleanCode}" updated!` : `Coupon "${cleanCode}" created!`, 'success');
        setIsModalOpen(false);
        resetForm();
        await fetchCoupons();
      } else {
        showToast(data.error || 'Failed to save coupon.', 'error');
      }
    } catch {
      showToast('Server error while saving coupon.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Coupon ${coupon.code} marked ${!coupon.isActive ? 'Active' : 'Inactive'}.`, 'success');
        setCoupons(coupons.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
      } else {
        showToast(data.error || 'Failed to update status.', 'error');
      }
    } catch {
      showToast('Error toggling coupon status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmCoupon) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${deleteConfirmCoupon.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Coupon ${deleteConfirmCoupon.code} deleted successfully.`, 'info');
        setCoupons(coupons.filter(c => c.id !== deleteConfirmCoupon.id));
        setDeleteConfirmCoupon(null);
      } else {
        showToast(data.error || 'Failed to delete coupon.', 'error');
      }
    } catch {
      showToast('Error deleting coupon.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-serif font-black text-zinc-900">Promo Coupons & Targeting</h3>
            <span className="px-2 py-0.5 rounded-full bg-brand-burgundy/10 text-brand-burgundy text-[10px] font-bold">
              {coupons.length} {coupons.length === 1 ? 'Coupon' : 'Coupons'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Create, manage, and target discount promo codes to all or specific customer accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchCoupons()}
            disabled={isLoading}
            className="p-2.5 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 transition-colors"
            title="Refresh coupons"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Coupon
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-burgundy" />
          <p className="text-xs font-medium">Loading promo coupons...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && coupons.length === 0 && (
        <div className="bg-white border border-dashed border-zinc-300 rounded-3xl p-12 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-burgundy/5 text-brand-burgundy flex items-center justify-center">
            <Tag className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-base text-zinc-800">No Active Coupons Configured</h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Create your first promotional coupon to offer percentage or flat discounts targeted to all users or specific VIP customer accounts.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow"
          >
            <Plus className="h-4 w-4" /> Create First Coupon
          </button>
        </div>
      )}

      {/* Coupon Grid */}
      {!isLoading && coupons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((c) => {
            const isTargeted = c.targetAudience === 'SELECTED';
            const targetedCount = Array.isArray(c.selectedCustomerIds) ? c.selectedCustomerIds.length : 0;
            const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
            const isScheduled = c.startDate && new Date(c.startDate) > new Date();

            return (
              <div 
                key={c.id} 
                className={`bg-white border rounded-3xl p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                  !c.isActive 
                    ? 'border-zinc-200 opacity-60 bg-zinc-50/50' 
                    : isExpired 
                      ? 'border-amber-200 bg-amber-50/20' 
                      : 'border-zinc-200/80 hover:border-brand-burgundy/30'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="p-2 bg-brand-burgundy/5 text-brand-burgundy rounded-xl">
                        <Tag className="h-4.5 w-4.5" />
                      </span>
                      {isTargeted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {targetedCount} Selected {targetedCount === 1 ? 'User' : 'Users'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <UserCheck className="h-3 w-3" /> All Customers
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => void handleToggleActive(c)}
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${
                        c.isActive
                          ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 border border-zinc-200'
                      }`}
                      title="Click to toggle status"
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Coupon Code Header */}
                  <div>
                    <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest block">COUPON CODE</span>
                    <h4 className="font-mono font-black text-lg text-zinc-900 tracking-wider uppercase mt-0.5">{c.code}</h4>
                  </div>

                  {/* Benefit Card */}
                  <div className="p-3 bg-zinc-50 rounded-2xl space-y-1.5 border border-zinc-100 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Benefit:</span>
                      <strong className="text-brand-burgundy font-bold">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} Flat OFF`}
                        {c.discountType === 'percentage' && c.maxDiscount ? ` (Max ₹${c.maxDiscount})` : ''}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Min Spend:</span>
                      <span className="font-medium text-zinc-700">{c.minSpend ? `₹${c.minSpend}` : 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Uses:</span>
                      <span className="font-medium text-zinc-700">
                        {c.usageCount} {c.usageLimit ? `/ ${c.usageLimit} max` : 'total'}
                      </span>
                    </div>
                    {c.perCustomerLimit && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Per User:</span>
                        <span className="font-medium text-zinc-700">{c.perCustomerLimit} max</span>
                      </div>
                    )}
                  </div>

                  {/* Validity Info */}
                  <div className="text-[10px] text-zinc-400 space-y-0.5 pt-1">
                    {c.expiryDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Expires: {new Date(c.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {isExpired && <span className="text-red-500 font-bold ml-1">(Expired)</span>}
                      </div>
                    )}
                    {c.startDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>Starts: {new Date(c.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {isScheduled && <span className="text-amber-500 font-bold ml-1">(Scheduled)</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 mt-2">
                  <span className="text-[9px] text-zinc-400">
                    Created {new Date(c.createdAt).toLocaleDateString('en-IN')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="p-1.5 text-zinc-500 hover:text-brand-burgundy hover:bg-zinc-100 rounded-lg transition-colors"
                      title="Edit coupon"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmCoupon(c)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete coupon"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 my-8">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-burgundy/10 text-brand-burgundy rounded-xl">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-extrabold text-zinc-900">
                    {editingCouponId ? 'Edit Promo Coupon' : 'Create New Promo Coupon'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">Configure discount value, thresholds, and target audiences</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Row 1: Code & Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVE20 or VIP100"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    className="w-full p-3 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none uppercase font-mono font-bold tracking-wider text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Status</label>
                  <select
                    value={isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
                    className="w-full p-3 border rounded-xl bg-zinc-50 focus:outline-none font-semibold text-xs h-[46px]"
                  >
                    <option value="ACTIVE">🟢 Active</option>
                    <option value="INACTIVE">⚪ Inactive</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Discount Type, Value, Max Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full p-3 border rounded-xl bg-zinc-50 focus:outline-none text-xs"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">
                    Discount Value * ({discountType === 'percentage' ? '%' : '₹'})
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={discountType === 'percentage' ? 100 : 99999}
                    placeholder={discountType === 'percentage' ? 'e.g. 15' : 'e.g. 150'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">
                    Max Discount (₹) {discountType !== 'percentage' && '(N/A)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={discountType !== 'percentage'}
                    placeholder="e.g. 200 (Optional)"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Row 3: Minimum Spend, Total Usage Limit, Per Customer Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Min Cart Spend (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 499 (0 for none)"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Total Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500 (Optional)"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Per User Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1 (Optional)"
                    value={perCustomerLimit}
                    onChange={(e) => setPerCustomerLimit(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Start Date and Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Start Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none text-[11px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Expiry Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none text-[11px]"
                  />
                </div>
              </div>

              {/* Row 5: Audience Targeting Selection */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-700 uppercase tracking-widest text-[9px] flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-brand-burgundy" /> Target Customer Audience *
                  </label>
                  <span className="text-[10px] text-zinc-400">Who can use this voucher?</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetAudience('ALL')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                      targetAudience === 'ALL'
                        ? 'border-brand-burgundy bg-brand-burgundy/5 text-brand-burgundy ring-2 ring-brand-burgundy/20'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                    }`}
                  >
                    <UserCheck className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">All Customers</p>
                      <p className="text-[10px] opacity-75">Valid for any registered customer at checkout</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('SELECTED')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                      targetAudience === 'SELECTED'
                        ? 'border-purple-600 bg-purple-50 text-purple-800 ring-2 ring-purple-600/20'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                    }`}
                  >
                    <UserPlus className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">Selected Customers</p>
                      <p className="text-[10px] opacity-75">Target 1 or specific multiple accounts</p>
                    </div>
                  </button>
                </div>

                {/* Selected Customers Picker */}
                {targetAudience === 'SELECTED' && (
                  <div className="space-y-3 p-4 bg-purple-50/40 border border-purple-100 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-900">
                          Selected Customers ({selectedCustomerIds.length})
                        </span>
                        {selectedCustomerIds.length > 0 && (
                          <button
                            type="button"
                            onClick={clearSelectedCustomers}
                            className="text-[10px] text-purple-700 underline hover:text-purple-900"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search customer name, email, phone..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-purple-200 rounded-xl bg-white text-[11px] focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Customer Selection Multi-Select List */}
                    <div className="max-h-48 overflow-y-auto border border-purple-100 rounded-xl bg-white divide-y divide-purple-50">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-zinc-400 text-[11px]">
                          No registered customers found matching "{customerSearchQuery}".
                        </div>
                      ) : (
                        filteredCustomers.map((cust) => {
                          const isSelected = selectedCustomerIds.includes(cust.userId) || 
                                             (cust.email && selectedCustomerIds.includes(cust.email)) ||
                                             (cust.phone && selectedCustomerIds.includes(cust.phone));

                          return (
                            <div
                              key={cust.userId}
                              onClick={() => toggleCustomerSelection(cust.userId)}
                              className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-purple-50/50 transition-colors ${
                                isSelected ? 'bg-purple-50/80 font-semibold' : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-zinc-300'
                                }`}>
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <div className="truncate">
                                  <p className="text-[11px] text-zinc-800 truncate">
                                    <strong>{cust.name}</strong> 
                                    {cust.phone ? ` • ${cust.phone}` : ''}
                                  </p>
                                  <p className="text-[9px] text-zinc-400 truncate">
                                    {cust.email || cust.userId}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                                {cust.userId.slice(0, 10)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {filteredCustomers.length > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-purple-700 pt-1">
                        <span>Showing {filteredCustomers.length} registered customers</span>
                        <button
                          type="button"
                          onClick={selectAllFilteredCustomers}
                          className="font-bold underline hover:text-purple-900"
                        >
                          Select all shown
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-50 font-bold text-zinc-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold uppercase tracking-wider rounded-xl shadow flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {editingCouponId ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCoupon && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-2xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-serif font-extrabold text-base text-zinc-900">Delete Promo Coupon?</h4>
                <p className="text-xs text-zinc-500">This action will immediately disable the coupon.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border rounded-2xl text-xs space-y-1">
              <p className="text-zinc-600">Coupon Code: <strong className="text-zinc-900 font-mono">{deleteConfirmCoupon.code}</strong></p>
              <p className="text-zinc-600">Discount: <strong className="text-brand-burgundy">{deleteConfirmCoupon.discountType === 'percentage' ? `${deleteConfirmCoupon.discountValue}%` : `₹${deleteConfirmCoupon.discountValue}`}</strong></p>
              <p className="text-zinc-600">Audience: <strong>{deleteConfirmCoupon.targetAudience === 'SELECTED' ? 'Selected Customers' : 'All Customers'}</strong></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCoupon(null)}
                className="px-4 py-2 border rounded-xl hover:bg-zinc-50 font-bold text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
