'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCTS as fallbackProducts, Product } from '../../../data/mockData';
import { 
  Check, X, Edit2, Trash2, Plus, Calendar, ShieldCheck, FileText, Eye, 
  Users, AlertTriangle, Settings, RefreshCw, ShoppingBag, Ban, Lock, ShieldAlert
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { useProducts } from '../../../context/ProductContext';
import { useOrders } from '../../../context/OrderContext';
import SafeImage from '../../../components/SafeImage';

export default function AdminWellnessPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { products: dbProducts, refreshProducts } = useProducts();
  const { orders } = useOrders();
  const PRODUCTS = dbProducts.length > 0 ? dbProducts : fallbackProducts;

  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'approved' | 'rejected' | 'suspended' | 'orders' | 'settings' | 'logs' | 'catalog'>('overview');
  
  // Simulated admin role check
  const [adminRole, setAdminRole] = useState('ADMIN');
  const [adminEmail, setAdminEmail] = useState('admin@fatafat.com');

  // Users database list (fetched from server)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Settings states
  const [ageCheckEnabled, setAgeCheckEnabled] = useState(true);
  const [verifProvider, setVerifProvider] = useState('Aadhaar e-KYC Verification');

  // View modal request state
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Catalog Form Modal States (retaining CMS functions)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Durex',
    type: 'Condoms' as 'Condoms' | 'Lubricants' | 'Intimate Care',
    material: 'Natural Rubber Latex',
    packSize: '10',
    texture: 'Smooth',
    flavor: '',
    price: 300,
    mrp: 350,
    inStock: true,
    deliveryTime: '15-20 mins',
    description: '',
    storage: '',
    manufacturer: '',
    image: '',
    verified: true,
    verificationSource: 'Direct Brand Distributor',
    verificationDate: new Date().toISOString().split('T')[0],
    imageLicense: 'Commercial Licensed'
  });

  // Load context user role and server tables on mount
  useEffect(() => {
    // 1. Get logged in admin session
    const stored = localStorage.getItem('fatafat_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAdminEmail(parsed.email || 'admin@fatafat.com');
        if (parsed.email === 'superadmin@fatafat.com') {
          setAdminRole('SUPER_ADMIN');
        } else if (parsed.email === 'manager@fatafat.com') {
          setAdminRole('INVENTORY_MANAGER');
        } else {
          setAdminRole('ADMIN');
        }
      } catch (e) {}
    }

    // Load initial settings
    const savedAgeCheck = localStorage.getItem('fatafat_wellness_age_check');
    if (savedAgeCheck !== null) {
      setAgeCheckEnabled(savedAgeCheck === 'true');
    }
    const savedProvider = localStorage.getItem('fatafat_wellness_provider');
    if (savedProvider) {
      setVerifProvider(savedProvider);
    }

    fetchServerTables();
  }, []);

  const fetchServerTables = async () => {
    setLoadingUsers(true);
    try {
      const resUsers = await fetch('/api/users/list');
      if (resUsers.ok) {
        const data = await resUsers.json();
        setUsersList(data);
      }
      const resLogs = await fetch('/api/activity');
      if (resLogs.ok) {
        const data = await resLogs.json();
        // Filter only Wellness-related audit logs
        const wellnessLogs = data.filter((l: any) => l.action && l.action.toLowerCase().includes('wellness'));
        setAuditLogs(wellnessLogs.reverse());
      }
    } catch (err) {
      console.error('Failed to load server tables:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Check role authorization permission
  const checkPermission = (action: string) => {
    if (adminRole === 'INVENTORY_MANAGER') {
      showToast('Permission Denied: Inventory Manager cannot perform Wellness user operations.', 'error');
      return false;
    }
    if (action === 'suspend' && adminRole !== 'SUPER_ADMIN') {
      showToast('Permission Denied: Only Super Admin can suspend accounts.', 'error');
      return false;
    }
    return true;
  };

  // Action: Approve Request
  const handleApprove = async (email: string, reqId: string) => {
    if (!checkPermission('approve')) return;
    try {
      const res = await fetch('/api/users/update-wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          wellnessAccessStatus: 'APPROVED',
          approvedBy: adminEmail,
          requestId: reqId,
          reason: 'Verified ID document proof'
        })
      });
      if (res.ok) {
        showToast(`Request APPROVED for customer: ${email}`, 'success');
        setSelectedRequest(null);
        fetchServerTables();
      }
    } catch (e) {
      showToast('Operation failed.', 'error');
    }
  };

  // Action: Reject Request
  const handleReject = async (email: string, reqId: string) => {
    if (!checkPermission('reject')) return;
    try {
      const res = await fetch('/api/users/update-wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          wellnessAccessStatus: 'REJECTED',
          approvedBy: adminEmail,
          requestId: reqId,
          reason: 'Invalid age documentation provided'
        })
      });
      if (res.ok) {
        showToast(`Request REJECTED for customer: ${email}`, 'info');
        setSelectedRequest(null);
        fetchServerTables();
      }
    } catch (e) {
      showToast('Operation failed.', 'error');
    }
  };

  // Action: Suspend Approved User
  const handleSuspend = async (email: string, reqId: string) => {
    if (!checkPermission('suspend')) return;
    try {
      const res = await fetch('/api/users/update-wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          wellnessAccessStatus: 'SUSPENDED',
          approvedBy: adminEmail,
          requestId: reqId,
          reason: 'Regulatory compliance suspension'
        })
      });
      if (res.ok) {
        showToast(`Access SUSPENDED for user: ${email}`, 'info');
        setSelectedRequest(null);
        fetchServerTables();
      }
    } catch (e) {
      showToast('Operation failed.', 'error');
    }
  };

  // Action: Restore Suspended User
  const handleRestore = async (email: string, reqId: string) => {
    if (!checkPermission('approve')) return;
    try {
      const res = await fetch('/api/users/update-wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          wellnessAccessStatus: 'APPROVED',
          approvedBy: adminEmail,
          requestId: reqId,
          reason: 'Access restored by Admin review'
        })
      });
      if (res.ok) {
        showToast(`Access RESTORED for user: ${email}`, 'success');
        fetchServerTables();
      }
    } catch (e) {
      showToast('Operation failed.', 'error');
    }
  };

  // Action: Revoke Approved User Access
  const handleRevoke = async (email: string, reqId: string) => {
    if (!checkPermission('reject')) return;
    try {
      const res = await fetch('/api/users/update-wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          wellnessAccessStatus: 'REVOKED',
          approvedBy: adminEmail,
          requestId: reqId,
          reason: 'Access revoked by administration audit'
        })
      });
      if (res.ok) {
        showToast(`Access REVOKED for user: ${email}`, 'info');
        setSelectedRequest(null);
        fetchServerTables();
      }
    } catch (e) {
      showToast('Operation failed.', 'error');
    }
  };

  // Action: Save Access Settings
  const handleSaveSettings = () => {
    localStorage.setItem('fatafat_wellness_age_check', String(ageCheckEnabled));
    localStorage.setItem('fatafat_wellness_provider', verifProvider);
    showToast('Age gate security settings updated.', 'success');
  };

  // Categorize user lists based on status
  const pendingRequests = usersList.filter(u => u.wellnessAccessStatus === 'PENDING_REVIEW' || u.wellnessAccessStatus === 'PENDING');
  const approvedUsers = usersList.filter(u => u.wellnessAccessStatus === 'APPROVED' || u.wellnessAccessStatus === 'ACTIVE' || u.wellnessAccessStatus === 'TERMS_REQUIRED');
  const rejectedRequests = usersList.filter(u => u.wellnessAccessStatus === 'REJECTED');
  const suspendedUsers = usersList.filter(u => u.wellnessAccessStatus === 'SUSPENDED' || u.wellnessAccessStatus === 'REVOKED');

  // Filter Wellness Orders
  const wellnessOrders = orders.filter(o => 
    o.items.some(item => {
      const matched = PRODUCTS.find(p => p.id === item.productId);
      return matched?.category === 'wellness';
    })
  );

  const wellnessProducts = PRODUCTS.filter(p => p.category === 'wellness');

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* 1. TOP TITLE */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-serif font-black text-zinc-900 leading-none">Wellness 18+ Controls</h2>
          <p className="text-zinc-550 mt-1 font-medium">Verify age-check requests, track compliance audits, and manage restricted catalog.</p>
        </div>
        <button
          onClick={fetchServerTables}
          className="p-2 border bg-white hover:bg-zinc-50 rounded-xl text-zinc-650 flex items-center gap-1 font-bold text-[10px] shadow-sm"
        >
          <RefreshCw className="h-4 w-4" /> REFRESH LISTS
        </button>
      </div>

      {/* 2. TAB CONTROLLERS */}
      <div className="flex flex-wrap gap-1 bg-zinc-50 border p-1 rounded-xl text-[10px] font-bold text-zinc-550 w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'requests', label: `Pending Requests (${pendingRequests.length})` },
          { key: 'approved', label: `Approved (${approvedUsers.length})` },
          { key: 'rejected', label: `Rejected (${rejectedRequests.length})` },
          { key: 'suspended', label: `Suspended (${suspendedUsers.length})` },
          { key: 'orders', label: `Wellness Orders (${wellnessOrders.length})` },
          { key: 'settings', label: 'Settings Gate' },
          { key: 'logs', label: 'Audit Trail' },
          { key: 'catalog', label: 'Catalog CMS' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider text-[9px] ${
              activeTab === tab.key 
                ? 'bg-[#6B1D2F] text-white font-black shadow-sm' 
                : 'hover:bg-zinc-150/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= TABS CONTENT ================= */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">PENDING REQUESTS</span>
              <span className="text-lg font-black text-zinc-800">{pendingRequests.length}</span>
            </div>
            <div className="bg-white border p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">APPROVED USERS</span>
              <span className="text-lg font-black text-emerald-700">{approvedUsers.length}</span>
            </div>
            <div className="bg-white border p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">SUSPENDED USERS</span>
              <span className="text-lg font-black text-red-600">{suspendedUsers.length}</span>
            </div>
            <div className="bg-white border p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">WELLNESS ITEMS</span>
              <span className="text-lg font-black text-zinc-850">{wellnessProducts.length}</span>
            </div>
          </div>

          {/* Quick instructions alert */}
          <div className="p-4 bg-zinc-50 border rounded-2xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-brand-burgundy shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-[10px] text-zinc-800 uppercase tracking-wider">RESTRICTED OPERATIONS PROTOCOL</h4>
              <p className="text-[9px] text-zinc-500 leading-relaxed mt-0.5 font-medium">
                Under the Drugs & Cosmetics Act and guidelines, all wellness products (condoms, personal lubricants, washes) require strict verification. Delivery partners do not have access to approval metrics or requests.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCESS REQUESTS */}
      {activeTab === 'requests' && (
        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-zinc-50 border-b font-extrabold text-[10px] uppercase text-zinc-700">
            PENDING USER ACCESS TICKETS
          </div>
          {pendingRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[8px] font-extrabold tracking-wider uppercase text-zinc-400 border-b">
                    <th className="p-3">Request ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Request Date</th>
                    <th className="p-3">Verification ID Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px] font-medium text-zinc-700">
                  {pendingRequests.map((r) => (
                    <tr key={r.userId} className="hover:bg-zinc-50/40">
                      <td className="p-3 font-extrabold">#{r.wellnessRequestId || 'TKT-PENDING'}</td>
                      <td className="p-3 font-bold text-zinc-900">{r.name || 'Client User'}</td>
                      <td className="p-3">{r.email}</td>
                      <td className="p-3">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString() : 'Today'}</td>
                      <td className="p-3 text-emerald-700 font-bold">✓ DOCUMENT REGISTERED</td>
                      <td className="p-3 text-center flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedRequest(r)}
                          className="px-2.5 py-1 border rounded-lg hover:bg-zinc-50 text-[10px] font-bold"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleApprove(r.email, r.wellnessRequestId)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(r.email, r.wellnessRequestId)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-450 font-bold">
              No pending access tickets.
            </div>
          )}
        </section>
      )}

      {/* TAB 3: APPROVED USERS */}
      {activeTab === 'approved' && (
        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-zinc-50 border-b font-extrabold text-[10px] uppercase text-zinc-700">
            APPROVED PORTAL USERS
          </div>
          {approvedUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[8px] font-extrabold tracking-wider uppercase text-zinc-400 border-b">
                    <th className="p-3">Customer ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Approved By</th>
                    <th className="p-3">Approved Date</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px] font-medium text-zinc-700">
                  {approvedUsers.map((u) => (
                    <tr key={u.userId} className="hover:bg-zinc-50/40">
                      <td className="p-3 font-extrabold">#{u.userId}</td>
                      <td className="p-3 font-bold text-zinc-900">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3 font-bold">{u.wellnessApprovedBy || 'System Admin'}</td>
                      <td className="p-3">{u.wellnessApprovedAt ? new Date(u.wellnessApprovedAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="p-3 text-center flex gap-1.5 justify-center">
                        <button
                          onClick={() => handleSuspend(u.email, u.wellnessRequestId)}
                          className="px-2.5 py-1 bg-red-550/10 text-red-650 hover:bg-red-50 rounded-lg text-[9px] font-bold"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => handleRevoke(u.email, u.wellnessRequestId)}
                          className="px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 rounded-lg text-[9px] font-bold"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-450 font-bold">
              No approved client access lists.
            </div>
          )}
        </section>
      )}

      {/* TAB 4: REJECTED REQUESTS */}
      {activeTab === 'rejected' && (
        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-zinc-50 border-b font-extrabold text-[10px] uppercase text-zinc-700">
            REJECTED REVIEWS
          </div>
          {rejectedRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[8px] font-extrabold tracking-wider uppercase text-zinc-400 border-b">
                    <th className="p-3">Customer ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Verification ID Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px] font-medium text-zinc-700">
                  {rejectedRequests.map((u) => (
                    <tr key={u.userId} className="hover:bg-zinc-50/40">
                      <td className="p-3 font-extrabold">#{u.userId}</td>
                      <td className="p-3 font-bold text-zinc-900">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3 text-red-700 font-bold">❌ INSUFFICIENT DOCUMENTATION</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleApprove(u.email, u.wellnessRequestId)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          Re-approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-450 font-bold">
              No rejected reviews.
            </div>
          )}
        </section>
      )}

      {/* TAB 5: SUSPENDED USERS */}
      {activeTab === 'suspended' && (
        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-zinc-50 border-b font-extrabold text-[10px] uppercase text-zinc-700">
            SUSPENDED OPERATIONS PROFILES
          </div>
          {suspendedUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[8px] font-extrabold tracking-wider uppercase text-zinc-400 border-b">
                    <th className="p-3">Customer ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Access Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px] font-medium text-zinc-700">
                  {suspendedUsers.map((u) => (
                    <tr key={u.userId} className="hover:bg-zinc-50/40">
                      <td className="p-3 font-extrabold">#{u.userId}</td>
                      <td className="p-3 font-bold text-zinc-900">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3 text-red-600 font-extrabold">🚫 SUSPENDED</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRestore(u.email, u.wellnessRequestId)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          Restore Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-450 font-bold">
              No suspended profiles.
            </div>
          )}
        </section>
      )}

      {/* TAB 6: WELLNESS ORDERS */}
      {activeTab === 'orders' && (
        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-zinc-50 border-b font-extrabold text-[10px] uppercase text-zinc-700">
            WELLNESS DISPATCH HISTORY
          </div>
          {wellnessOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[8px] font-extrabold tracking-wider uppercase text-zinc-400 border-b">
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Customer Email</th>
                    <th className="p-3">Restricted Items</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px] font-medium text-zinc-700">
                  {wellnessOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-50/40">
                      <td className="p-3 font-extrabold">#{o.id}</td>
                      <td className="p-3 font-bold text-zinc-800">{o.customerId}</td>
                      <td className="p-3 truncate max-w-[200px]">
                        {o.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                      </td>
                      <td className="p-3 font-bold text-zinc-900">₹{o.total}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[8px] bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-widest">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-450 font-bold">
              No wellness dispatch activities.
            </div>
          )}
        </section>
      )}

      {/* TAB 7: AGE GATE SETTINGS */}
      {activeTab === 'settings' && (
        <section className="bg-white border p-5 rounded-2xl shadow-sm space-y-4 max-w-md">
          <h3 className="text-xs font-serif font-black uppercase tracking-wider text-zinc-800">Age Verification Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-zinc-700">Age verification check:</span>
              <input
                type="checkbox"
                checked={ageCheckEnabled}
                onChange={(e) => setAgeCheckEnabled(e.target.checked)}
                className="h-4 w-4 text-brand-burgundy rounded focus:ring-brand-burgundy"
              />
            </label>

            {ageCheckEnabled && (
              <div className="space-y-1.5">
                <label className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block">Verification Provider</label>
                <select
                  value={verifProvider}
                  onChange={(e) => setVerifProvider(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white focus:outline-none focus:border-brand-burgundy font-medium"
                >
                  <option value="Aadhaar e-KYC Verification">Aadhaar e-KYC Verification Provider</option>
                  <option value="PAN Card Database check">PAN Card Database check</option>
                  <option value="Passport Database check">Passport Database check</option>
                </select>
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              className="w-full py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider text-[10px]"
            >
              Save Configuration Settings
            </button>
          </div>
        </section>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-zinc-50 border-b font-extrabold text-[10px] uppercase text-zinc-700">
            COMPLIANCE AUDIT EVENTS
          </div>
          {auditLogs.length > 0 ? (
            <div className="divide-y text-[11px] font-medium text-zinc-750 p-4 space-y-3">
              {auditLogs.map((l) => (
                <div key={l.id} className="pt-3 first:pt-0 flex justify-between items-start gap-4 text-left">
                  <div>
                    <h5 className="font-bold text-zinc-900">{l.action}</h5>
                    <p className="text-[9px] text-zinc-400">Customer ID: #{l.userId} • Email: {l.userEmail}</p>
                    {l.reason && <p className="text-[9px] text-zinc-500 italic mt-0.5">Reason: {l.reason}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-zinc-800">Admin: {l.adminId}</p>
                    <p className="text-[8px] text-zinc-400">{new Date(l.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-450 font-bold">
              No audit logs available.
            </div>
          )}
        </section>
      )}

      {/* TAB 9: CATALOG CMS */}
      {activeTab === 'catalog' && (
        <section className="space-y-4">
          <div className="flex justify-between items-center bg-zinc-50 border p-4 rounded-xl">
            <span className="font-bold text-zinc-700">RESTRICTED CATALOG ENTRIES</span>
            <button
              onClick={() => {
                setEditingId(null);
                setIsFormOpen(true);
              }}
              className="px-3 py-1.5 bg-[#6B1D2F] hover:bg-brand-burgundy-dark text-white rounded-lg text-[9px] font-bold"
            >
              Add Restricted Product
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wellnessProducts.map((p) => (
              <div key={p.id} className="bg-white border rounded-xl p-3 flex gap-3 shadow-sm">
                <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 border bg-zinc-50">
                  <SafeImage src={p.image} alt={p.name} />
                </div>
                <div className="min-w-0 flex-grow">
                  <h5 className="font-bold text-zinc-850 truncate leading-snug">{p.name}</h5>
                  <p className="text-[9px] text-zinc-400">{p.wellnessBrand} • ₹{p.price}</p>
                  <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${p.inStock ? 'text-green-700' : 'text-red-600'}`}>
                    {p.inStock ? '🟢 Available' : '🔴 Out of Stock'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= VIEW DETAIL DIALOG POPUP ================= */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 text-left border relative">
            <button 
              onClick={() => setSelectedRequest(null)} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-zinc-150 border flex items-center justify-center text-zinc-650 font-serif font-black text-base">
                {selectedRequest.name ? selectedRequest.name.charAt(0) : 'U'}
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">{selectedRequest.name || 'Client User'}</h4>
                <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold">Account ID: #{selectedRequest.userId}</p>
              </div>
            </div>

            <div className="border-t border-b py-3 space-y-2 text-[11px] font-medium text-zinc-750">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-450">Email Address</span>
                <span className="font-bold">{selectedRequest.email}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-450">Google Verified</span>
                <span className="font-bold text-emerald-700">✓ YES</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-450">Date of Birth</span>
                <span className="font-bold">{selectedRequest.dob || 'Not Provided'}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-450">Calculated Age</span>
                <span className="font-bold text-brand-burgundy font-extrabold">{selectedRequest.dob ? (() => {
                  const dobDate = new Date(selectedRequest.dob);
                  const today = new Date();
                  let age = today.getFullYear() - dobDate.getFullYear();
                  const m = today.getMonth() - dobDate.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
                    age--;
                  }
                  return `${age} Years Old`;
                })() : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-zinc-450">Account Created</span>
                <span className="font-bold">{selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-zinc-450">Request Date</span>
                <span className="font-bold">{selectedRequest.lastLoginAt ? new Date(selectedRequest.lastLoginAt).toLocaleDateString() : 'Today'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-450">System Status</span>
                <span className="font-extrabold text-amber-700 uppercase">{selectedRequest.wellnessAccessStatus}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => handleReject(selectedRequest.email, selectedRequest.wellnessRequestId)}
                className="px-4 py-2 border rounded-xl hover:bg-zinc-50 font-bold uppercase tracking-wider text-[10px]"
              >
                Reject Request
              </button>
              <button
                onClick={() => handleApprove(selectedRequest.email, selectedRequest.wellnessRequestId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase tracking-wider text-[10px]"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
