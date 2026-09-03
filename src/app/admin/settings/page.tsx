'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../components/Toast';
import { 
  Save, 
  RefreshCw, 
  LayoutTemplate, 
  SlidersHorizontal, 
  Image, 
  Eye, 
  EyeOff,
  Database,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Users,
  ShoppingBag,
  CreditCard,
  Bike,
  ShieldCheck,
  X,
  AlertOctagon
} from 'lucide-react';

interface EntityCounts {
  customers: number;
  orders: number;
  payments: number;
  partners: number;
  sessions: number;
  issues: number;
  products: number;
  categories: number;
  brands: number;
  admins: number;
}

interface ResetActionConfig {
  id: 'CUSTOMERS' | 'ORDERS' | 'PAYMENTS' | 'DELIVERY_PARTNERS' | 'SESSIONS_TEST_DATA' | 'CLEAR_TRANSACTIONAL' | 'FULL_RESET';
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  buttonColor: string;
  icon: React.ReactNode;
  requiresTypeConfirm: boolean;
  affectedCountKey: keyof EntityCounts | 'transactional' | 'all';
  affectedLabel: string;
  dangerLevel: 'high' | 'critical' | 'moderate';
}

const RESET_ACTIONS: ResetActionConfig[] = [
  {
    id: 'CUSTOMERS',
    title: 'Delete Customer Accounts',
    description: 'Permanently remove all registered customer profiles, addresses, and customer sessions. Admin and Delivery Partner accounts remain strictly untouched.',
    badge: 'Customer Data',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    buttonColor: 'bg-red-600 hover:bg-red-700 text-white',
    icon: <Users className="h-5 w-5 text-red-600" />,
    requiresTypeConfirm: true,
    affectedCountKey: 'customers',
    affectedLabel: 'Customer Profiles',
    dangerLevel: 'high'
  },
  {
    id: 'ORDERS',
    title: 'Delete All Orders',
    description: 'Purge all customer orders, item records, tracking timelines, and delivery histories from the database.',
    badge: 'Order Records',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    buttonColor: 'bg-red-600 hover:bg-red-700 text-white',
    icon: <ShoppingBag className="h-5 w-5 text-red-600" />,
    requiresTypeConfirm: true,
    affectedCountKey: 'orders',
    affectedLabel: 'Customer Orders',
    dangerLevel: 'high'
  },
  {
    id: 'PAYMENTS',
    title: 'Delete Payment / Transaction Records',
    description: 'Purge all UPI transaction records, UTR references, uploaded screenshot proofs, and reset order payment states to NOT_STARTED.',
    badge: 'Financial Records',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    buttonColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: <CreditCard className="h-5 w-5 text-amber-600" />,
    requiresTypeConfirm: true,
    affectedCountKey: 'payments',
    affectedLabel: 'Payment Records',
    dangerLevel: 'high'
  },
  {
    id: 'DELIVERY_PARTNERS',
    title: 'Delete Delivery Partner Accounts',
    description: 'Remove all registered delivery partner accounts, login credentials, partner sessions, and unassign active delivery tasks.',
    badge: 'Rider Accounts',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    buttonColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: <Bike className="h-5 w-5 text-purple-600" />,
    requiresTypeConfirm: true,
    affectedCountKey: 'partners',
    affectedLabel: 'Delivery Partners',
    dangerLevel: 'high'
  },
  {
    id: 'SESSIONS_TEST_DATA',
    title: 'Delete Sessions & Temporary Test Data',
    description: 'Clean up inactive customer sessions, temporary carts, inventory issue logs, delivery upload photos, and wellness access logs. Preserves active admin session.',
    badge: 'Maintenance',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: <Database className="h-5 w-5 text-blue-600" />,
    requiresTypeConfirm: false,
    affectedCountKey: 'sessions',
    affectedLabel: 'Sessions & Temp Logs',
    dangerLevel: 'moderate'
  },
  {
    id: 'CLEAR_TRANSACTIONAL',
    title: 'Clear All Transactional Data',
    description: 'Atomically wipes all Orders, Payments, Inventory Issues, Delivery Tasks, and Customer Accounts while preserving Product Catalog, Categories, Brands, Settings, and Admin Accounts.',
    badge: 'Bulk Transaction Clear',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    buttonColor: 'bg-rose-600 hover:bg-rose-700 text-white',
    icon: <AlertOctagon className="h-5 w-5 text-rose-600" />,
    requiresTypeConfirm: true,
    affectedCountKey: 'transactional',
    affectedLabel: 'Orders + Payments + Customers',
    dangerLevel: 'critical'
  },
  {
    id: 'FULL_RESET',
    title: 'Full System Reset (Preserve Catalog & Admin)',
    description: 'Complete database reset removing all test orders, payments, and non-admin data. Products, Categories, Brands, System CMS Settings, Payment UPI Config, and Super Admin accounts are 100% PRESERVED.',
    badge: 'Super Admin Full Reset',
    badgeColor: 'bg-red-100 text-red-900 border-red-300 font-black',
    buttonColor: 'bg-brand-burgundy hover:bg-black text-white',
    icon: <ShieldAlert className="h-5 w-5 text-brand-burgundy" />,
    requiresTypeConfirm: true,
    affectedCountKey: 'all',
    affectedLabel: 'All Non-Admin Transactional Data',
    dangerLevel: 'critical'
  }
];

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'cms' | 'data-management'>('cms');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Homepage Config state
  const [heroImage, setHeroImage] = useState('');
  const [heroHeading, setHeroHeading] = useState('');
  const [heroSubheading, setHeroSubheading] = useState('');
  const [heroCtaText, setHeroCtaText] = useState('');
  const [heroCtaLink, setHeroCtaLink] = useState('');

  // Visibility Toggles
  const [visibilities, setVisibilities] = useState<any>({
    hero: true,
    categories: true,
    moments: true,
    velmoraEdit: true,
    cakeEdit: true,
    flowerEdit: true,
    giftEdit: true,
    combos: true,
    personalisation: true,
    brandStory: true,
    testimonials: true
  });

  // Wellness Config state
  const [wellnessPublished, setWellnessPublished] = useState(false);

  // Payment Config state
  const [paymentUpiId, setPaymentUpiId] = useState('8081988627@pthdfc');
  const [savingPaymentConfig, setSavingPaymentConfig] = useState(false);

  // Data Management State
  const [entityCounts, setEntityCounts] = useState<EntityCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ResetActionConfig | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isExecutingReset, setIsExecutingReset] = useState(false);
  const [lastResetResult, setLastResetResult] = useState<any | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/homepage');
      if (res.ok) {
        const data = await res.json();
        setHeroImage(data.heroImage || '');
        setHeroHeading(data.heroHeading || '');
        setHeroSubheading(data.heroSubheading || '');
        setHeroCtaText(data.heroCtaText || '');
        setHeroCtaLink(data.heroCtaLink || '');
        if (data.sectionsVisibility) {
          setVisibilities(data.sectionsVisibility);
        }
      }
      
      // Load Wellness Settings
      const wRes = await fetch('/api/admin/wellness-settings');
      if (wRes.ok) {
        const wData = await wRes.json();
        setWellnessPublished(wData.published ?? false);
      }

      const pRes = await fetch('/api/admin/payment-settings');
      if (pRes.ok) {
        const pData = await pRes.json();
        setPaymentUpiId(pData.upiId || '8081988627@pthdfc');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch homepage settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityCounts = useCallback(async () => {
    try {
      setLoadingCounts(true);
      const res = await fetch('/api/admin/clean-reset', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.counts) {
          setEntityCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load entity counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchEntityCounts();
  }, [fetchEntityCounts]);

  const handleToggle = (key: string) => {
    setVisibilities((prev: any) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveWellnessSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/wellness-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: wellnessPublished })
      });
      if (res.ok) {
        showToast('Wellness portal settings updated successfully!', 'success');
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentConfig = async () => {
    try {
      setSavingPaymentConfig(true);
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiId: paymentUpiId.trim() || '8081988627@pthdfc' })
      });

      if (res.ok) {
        showToast('UPI configuration updated successfully.', 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Failed to save payment configuration.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving payment configuration.', 'error');
    } finally {
      setSavingPaymentConfig(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        heroImage,
        heroHeading,
        heroSubheading,
        heroCtaText,
        heroCtaLink,
        sectionsVisibility: visibilities
      };

      const res = await fetch('/api/homepage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Storefront homepage settings updated successfully!', 'success');
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Open Confirmation Modal
  const handleOpenActionModal = (action: ResetActionConfig) => {
    setSelectedAction(action);
    setConfirmInput('');
    setAdminPasswordInput('');
  };

  // Execute Selected Database Reset Action
  const handleExecuteReset = async () => {
    if (!selectedAction) return;

    if (selectedAction.requiresTypeConfirm && confirmInput.trim().toUpperCase() !== 'DELETE' && confirmInput.trim().toUpperCase() !== 'RESET') {
      showToast('Please type "DELETE" exactly to confirm.', 'error');
      return;
    }

    if (!adminPasswordInput.trim()) {
      showToast('Please enter your Super Admin password to authorize.', 'error');
      return;
    }

    try {
      setIsExecutingReset(true);

      const res = await fetch('/api/admin/clean-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction.id,
          confirmationText: confirmInput.trim(),
          password: adminPasswordInput
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        showToast(data.error || 'Database reset action failed.', 'error');
        return;
      }

      // 1. Invalidate stale frontend storage caches
      if (typeof window !== 'undefined') {
        try {
          if (selectedAction.id === 'ORDERS' || selectedAction.id === 'CLEAR_TRANSACTIONAL' || selectedAction.id === 'FULL_RESET') {
            localStorage.removeItem('fatafat_orders');
          }
          if (selectedAction.id === 'CUSTOMERS' || selectedAction.id === 'CLEAR_TRANSACTIONAL' || selectedAction.id === 'FULL_RESET') {
            localStorage.removeItem('fatafat_cart');
            localStorage.removeItem('fatafat_auth');
          }
          window.dispatchEvent(new Event('storage'));
        } catch (storageErr) {
          console.warn('Storage cleanup warning:', storageErr);
        }
      }

      // 2. Set result and refresh counts
      setLastResetResult(data);
      if (data.updatedCounts) {
        setEntityCounts(data.updatedCounts);
      } else {
        void fetchEntityCounts();
      }

      showToast(`Success: ${data.message || 'Reset completed cleanly.'}`, 'success');
      setSelectedAction(null);
      setConfirmInput('');
      setAdminPasswordInput('');
    } catch (err) {
      console.error('Reset execution error:', err);
      showToast('Network error during reset operation.', 'error');
    } finally {
      setIsExecutingReset(false);
    }
  };

  const getEntityCountDisplay = (key: keyof EntityCounts | 'transactional' | 'all') => {
    if (!entityCounts) return '...';
    if (key === 'transactional') {
      return (entityCounts.orders || 0) + (entityCounts.payments || 0) + (entityCounts.customers || 0);
    }
    if (key === 'all') {
      return (entityCounts.orders || 0) + (entityCounts.payments || 0) + (entityCounts.customers || 0) + (entityCounts.sessions || 0);
    }
    return entityCounts[key] ?? 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 text-brand-burgundy animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-left pb-16">
      
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="text-xl font-serif font-black text-zinc-900 flex items-center gap-2">
            Settings & System Management
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Manage storefront configuration, receiving UPI parameters, and secure database operations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveTab('cms')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'cms'
                ? 'bg-white text-brand-burgundy shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Platform CMS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data-management')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'data-management'
                ? 'bg-brand-burgundy text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Database className="h-3.5 w-3.5" /> Database & Data Management
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PLATFORM CMS & STOREFRONT CONFIGURATION                           */}
      {/* ========================================================================= */}
      {activeTab === 'cms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          
          {/* Left Column (8 Cols): Banner content details */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Wellness customizer card */}
            <div className="bg-white border border-zinc-200/20 p-6 rounded-3xl space-y-4 shadow-sm">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1.5">
                <SlidersHorizontal className="h-4.5 w-4.5" /> Wellness Portal Configuration
              </h4>
              <div className="flex items-center justify-between py-2">
                <div className="max-w-md">
                  <span className="font-bold text-zinc-800 text-[11px] block">Global Storefront Publication State</span>
                  <span className="text-[10px] text-zinc-400 font-medium leading-normal block mt-0.5">When unpublished, the Wellness section, checkout, search indexes, and routes are hidden from customers.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWellnessPublished(!wellnessPublished)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all select-none shrink-0 ${
                    wellnessPublished 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/30' 
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/30'
                  }`}
                >
                  {wellnessPublished ? (
                    <>
                      <Eye className="h-4 w-4" /> Published (Live)
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" /> Unpublished (Hidden)
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveWellnessSettings}
                disabled={saving}
                className="py-2.5 px-4 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all select-none"
              >
                Update Wellness Settings
              </button>
            </div>

            <div className="bg-white border border-zinc-200/20 p-6 rounded-3xl space-y-4 shadow-sm">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2">Payment Configuration</h4>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Receiving UPI ID</label>
                <input
                  type="text"
                  value={paymentUpiId}
                  onChange={(e) => setPaymentUpiId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-zinc-50/5 focus:bg-white focus:outline-none"
                  placeholder="8081988627@pthdfc"
                />
              </div>
              <p className="text-[10px] text-zinc-500">Used for customer UPI QR creation. This is the only payment credential shown to customers.</p>
              <button
                type="button"
                onClick={handleSavePaymentConfig}
                disabled={savingPaymentConfig}
                className="py-2.5 px-4 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all"
              >
                {savingPaymentConfig ? 'Saving...' : 'Save Payment Settings'}
              </button>
            </div>

            {/* Hero Customizer */}
            <form onSubmit={handleSave} className="bg-white border border-zinc-200/20 p-6 rounded-3xl space-y-4 shadow-sm">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1.5">
                <Image className="h-4.5 w-4.5" /> Hero Banner Settings
              </h4>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Hero Background Image URL</label>
                <input
                  type="text"
                  required
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 border rounded-xl bg-zinc-55/5 font-mono text-[10px] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Main Header Title Caption</label>
                <input
                  type="text"
                  required
                  value={heroHeading}
                  onChange={(e) => setHeroHeading(e.target.value)}
                  placeholder="e.g. Make Every Moment Beautifully Memorable."
                  className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none font-serif text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Subheading Description Text</label>
                <textarea
                  rows={3}
                  required
                  value={heroSubheading}
                  onChange={(e) => setHeroSubheading(e.target.value)}
                  placeholder="Details of fast delivery and luxury curation..."
                  className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">CTA Button Text</label>
                  <input
                    type="text"
                    required
                    value={heroCtaText}
                    onChange={(e) => setHeroCtaText(e.target.value)}
                    placeholder="e.g. EXPLORE COLLECTION"
                    className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">CTA Button Target URL</label>
                  <input
                    type="text"
                    required
                    value={heroCtaLink}
                    onChange={(e) => setHeroCtaLink(e.target.value)}
                    placeholder="e.g. /cakes"
                    className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none font-mono text-[10px]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-bold uppercase tracking-wider rounded-xl shadow transition-all select-none text-[10px]"
                >
                  Save Hero Banner
                </button>
              </div>
            </form>

          </div>

          {/* Right Column (4 Cols): Toggle switches & Save trigger */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            
            {/* Section Visibility Controls */}
            <div className="bg-white border border-zinc-200/20 p-6 rounded-3xl space-y-4 shadow-sm">
              <h4 className="font-serif font-extrabold text-sm text-zinc-800 border-b pb-2 flex items-center gap-1.5">
                <LayoutTemplate className="h-4.5 w-4.5" /> Homepage Layout Sections
              </h4>

              <div className="space-y-3 pt-2">
                {Object.keys(visibilities).map((sectionKey) => {
                  const isVisible = visibilities[sectionKey];
                  let sectionLabel = sectionKey
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase());
                  if (sectionLabel === 'Velmora Edit') {
                    sectionLabel = 'FATAFAT Edit';
                  }

                  return (
                    <div key={sectionKey} className="flex justify-between items-center py-1">
                      <span className="font-bold text-zinc-650">{sectionLabel}</span>
                      <button
                        type="button"
                        onClick={() => handleToggle(sectionKey)}
                        className={`px-3 py-1 rounded-xl text-[9px] font-extrabold uppercase flex items-center gap-1 transition-all ${
                          isVisible 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                            : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-150'
                        }`}
                      >
                        {isVisible ? (
                          <>
                            <Eye className="h-3.5 w-3.5" /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" /> Hidden
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold uppercase tracking-wider rounded-xl shadow flex items-center justify-center gap-1.5 transition-all"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Storefront Layout
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATA MANAGEMENT & GRANULAR DATABASE RESET MODULE                   */}
      {/* ========================================================================= */}
      {activeTab === 'data-management' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Live System Entity Counter Bar */}
          <div className="bg-white border border-zinc-200/30 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h4 className="font-serif font-black text-base text-zinc-900 flex items-center gap-2">
                  <Database className="h-5 w-5 text-brand-burgundy" /> Live System Entity Metrics
                </h4>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Realtime record counts across active PostgreSQL tables and database state.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchEntityCounts}
                disabled={loadingCounts}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingCounts ? 'animate-spin text-brand-burgundy' : ''}`} />
                Refresh Counts
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
              <div className="bg-zinc-50/80 border border-zinc-200/50 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-blue-600" /> Customers
                </span>
                <p className="text-xl font-black text-zinc-900">{entityCounts ? entityCounts.customers : '...'}</p>
                <span className="text-[9px] text-zinc-400 font-medium block">Registered Profiles</span>
              </div>

              <div className="bg-zinc-50/80 border border-zinc-200/50 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" /> Orders
                </span>
                <p className="text-xl font-black text-zinc-900">{entityCounts ? entityCounts.orders : '...'}</p>
                <span className="text-[9px] text-zinc-400 font-medium block">Total Order Records</span>
              </div>

              <div className="bg-zinc-50/80 border border-zinc-200/50 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-amber-600" /> Payments
                </span>
                <p className="text-xl font-black text-zinc-900">{entityCounts ? entityCounts.payments : '...'}</p>
                <span className="text-[9px] text-zinc-400 font-medium block">UPI / Transaction Proofs</span>
              </div>

              <div className="bg-zinc-50/80 border border-zinc-200/50 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                  <Bike className="h-3.5 w-3.5 text-purple-600" /> Delivery Partners
                </span>
                <p className="text-xl font-black text-zinc-900">{entityCounts ? entityCounts.partners : '...'}</p>
                <span className="text-[9px] text-zinc-400 font-medium block">Active Rider Accounts</span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-2xl p-3.5 space-y-1 col-span-2 sm:col-span-4 lg:col-span-1">
                <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> Preserved Catalog
                </span>
                <p className="text-base font-black text-emerald-950">
                  {entityCounts ? `${entityCounts.products} Products, ${entityCounts.categories} Categories` : '...'}
                </p>
                <span className="text-[9px] text-emerald-700 font-medium block">Protected from Reset</span>
              </div>
            </div>
          </div>

          {/* Last Execution Result Banner */}
          {lastResetResult && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-5 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> Last Reset Action Succeeded: {lastResetResult.action}
                </h5>
                <button
                  type="button"
                  onClick={() => setLastResetResult(null)}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-emerald-800 font-medium">{lastResetResult.message}</p>
              {lastResetResult.affected && (
                <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                  {Object.entries(lastResetResult.affected).map(([k, v]) => (
                    <span key={k} className="px-2.5 py-1 bg-white border border-emerald-200 rounded-lg text-emerald-900 font-bold">
                      {k}: {String(v)} removed
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security & Preservation Notice */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 flex items-start gap-3.5 text-left">
            <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold text-amber-900 text-xs uppercase tracking-wider">Super Admin Security & Data Preservation Guarantee</h5>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                All destructive actions execute inside an <strong>atomic server-side PostgreSQL transaction</strong> with mandatory Super Admin password re-authentication.
                Super Admin credentials, product catalog, categories, brand relationships, payment configurations, and core storefront layouts are <strong>permanently protected</strong> and will never be removed during reset operations.
              </p>
            </div>
          </div>

          {/* Granular Control Actions Grid */}
          <div className="space-y-4">
            <h4 className="font-serif font-black text-base text-zinc-900 flex items-center gap-2">
              <Trash2 className="h-4.5 w-4.5 text-red-600" /> Granular Database Deletion Controls
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RESET_ACTIONS.map((action) => {
                const affectedCount = getEntityCountDisplay(action.affectedCountKey);

                return (
                  <div 
                    key={action.id}
                    className="bg-white border border-zinc-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all text-left"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${action.badgeColor}`}>
                          {action.badge}
                        </span>
                        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                          {action.icon}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h5 className="font-serif font-black text-sm text-zinc-900">{action.title}</h5>
                        <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">{action.description}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
                      <div className="text-[10px]">
                        <span className="text-zinc-400 font-bold block">Live Affected Records:</span>
                        <span className="font-black text-zinc-800 text-xs">{affectedCount} {action.affectedLabel}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(action)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all select-none shadow-sm ${action.buttonColor}`}
                      >
                        Execute
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION & PASSWORD RE-AUTHENTICATION MODAL                           */}
      {/* ========================================================================= */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-5 text-left animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-serif font-black text-base text-zinc-900">Authorize Destructive Action</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">{selectedAction.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Impact Details Callout */}
            <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 space-y-2">
              <span className="font-bold text-red-900 text-xs block">
                Warning: This action cannot be undone.
              </span>
              <p className="text-[11px] text-red-800 leading-relaxed font-medium">
                {selectedAction.description}
              </p>
              <div className="pt-2 border-t border-red-200/50 flex items-center justify-between text-[11px]">
                <span className="font-bold text-red-900">Current Target Count:</span>
                <span className="font-black text-red-950 bg-white px-2.5 py-0.5 rounded-md border border-red-200">
                  {getEntityCountDisplay(selectedAction.affectedCountKey)} records
                </span>
              </div>
            </div>

            {/* Preserved Safety Notice */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center gap-2 text-[10px] text-zinc-600 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Preserved: Super Admin accounts, Product Catalog, Categories, CMS & Payment Settings.</span>
            </div>

            {/* Verification Inputs */}
            <div className="space-y-3.5 pt-1">
              {selectedAction.requiresTypeConfirm && (
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 text-[10px] uppercase tracking-wider block">
                    Type <span className="text-red-600 font-black">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="DELETE"
                    className="w-full p-2.5 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none font-mono text-xs font-bold uppercase tracking-wider text-red-600"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 text-[10px] uppercase tracking-wider block flex items-center gap-1">
                  <Lock className="h-3 w-3 text-zinc-500" /> Super Admin Password (Re-Authentication):
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter your super admin password"
                  className="w-full p-2.5 border rounded-xl bg-zinc-50 focus:bg-white focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                disabled={isExecutingReset}
                className="px-4 py-2.5 border border-zinc-200 rounded-xl font-bold text-xs text-zinc-600 hover:bg-zinc-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isExecutingReset || (selectedAction.requiresTypeConfirm && confirmInput.trim().toUpperCase() !== 'DELETE' && confirmInput.trim().toUpperCase() !== 'RESET') || !adminPasswordInput.trim()}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {isExecutingReset ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Purging Database...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Confirm & Execute
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
