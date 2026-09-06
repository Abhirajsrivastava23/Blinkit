'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ToggleLeft, ToggleRight, Key, Trash2, Edit2, 
  MapPin, Phone, Mail, UserCheck, UserX, ShoppingBag, ClipboardList, 
  AlertTriangle, RefreshCw, Calendar
} from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface Partner {
  id: string;
  name: string;
  phone: string;
  email: string;
  locationId: string;
  locationName: string;
  status: 'Active' | 'Inactive';
  isOnline: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminDeliveryPartnersPage() {
  const { showToast } = useToast();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSeqRef = React.useRef(0);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formLocation, setFormLocation] = useState('nawabganj-unnao');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  const fetchDashboardData = async () => {
    const thisSeq = ++fetchSeqRef.current;
    try {
      // 1. Fetch partners
      const resP = await fetch('/api/admin/partners', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (resP.ok) {
        const dataP = await resP.json();
        if (Array.isArray(dataP) && thisSeq >= fetchSeqRef.current) {
          setPartners(dataP);
        }
      }

      // 2. Fetch issues
      const resI = await fetch('/api/admin/issues', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (resI.ok) {
        const dataI = await resI.json();
        if (Array.isArray(dataI) && thisSeq >= fetchSeqRef.current) {
          setIssues(dataI);
        }
      }

      // 3. Fetch orders
      const resO = await fetch('/api/orders', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (resO.ok) {
        const dataO = await resO.json();
        if (Array.isArray(dataO) && thisSeq >= fetchSeqRef.current) {
          setOrders(dataO);
        }
      }
    } catch (err) {
      console.error('Error loading operational logistics details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAdd = () => {
    let maxNum = 0;
    for (const p of partners) {
      const match = String(p.id || '').match(/DP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    setFormId(`DP-${String(maxNum + 1).padStart(3, '0')}`);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setFormLocation('nawabganj-unnao');
    setFormStatus('Active');
    setShowAddModal(true);
  };

  const handleOpenEdit = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormId(partner.id);
    setFormName(partner.name);
    setFormPhone(partner.phone || '');
    setFormEmail(partner.email);
    setFormLocation(partner.locationId || 'nawabganj-unnao');
    setFormStatus(partner.status || 'Active');
    setShowEditModal(true);
  };

  const handleOpenReset = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormPassword('');
    setShowResetModal(true);
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      showToast('Name, Email, and Password are required fields.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const locName = formLocation === 'nawabganj-unnao' 
        ? 'Nawabganj, Unnao' 
        : 'Chandigarh University, Uttar Pradesh';

      const payload = {
        id: formId.trim(),
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword.trim(),
        locationId: formLocation,
        locationName: locName,
        status: formStatus,
        isOnline: false,
        isEdit: false
      };

      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.success) {
        showToast('Delivery Partner account created successfully!', 'success');
        setShowAddModal(false);
        if (resData.partner) {
          setPartners(prev => [resData.partner, ...prev.filter(p => p.id.toLowerCase() !== resData.partner.id.toLowerCase())]);
        }
        await fetchDashboardData();
      } else {
        showToast(resData.error || 'Failed to create partner.', 'error');
      }
    } catch (err) {
      showToast('Server connection failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    if (!formName.trim() || !formEmail.trim()) {
      showToast('Name and Email are required.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const locName = formLocation === 'nawabganj-unnao' 
        ? 'Nawabganj, Unnao' 
        : 'Chandigarh University, Uttar Pradesh';

      const payload = {
        id: selectedPartner.id,
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim().toLowerCase(),
        locationId: formLocation,
        locationName: locName,
        status: formStatus,
        isEdit: true
      };

      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.success) {
        showToast('Delivery Partner details updated successfully.', 'success');
        setShowEditModal(false);
        if (resData.partner) {
          setPartners(prev => prev.map(p => p.id === selectedPartner.id ? resData.partner : p));
        }
        await fetchDashboardData();
      } else {
        showToast(resData.error || 'Failed to update partner details.', 'error');
      }
    } catch (err) {
      showToast('Server connection failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !formPassword.trim()) {
      showToast('Password is required.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPartner.id,
          name: selectedPartner.name,
          email: selectedPartner.email,
          password: formPassword.trim(),
          isEdit: true
        })
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.success) {
        showToast(`Password successfully updated for ${selectedPartner.name}.`, 'success');
        setShowResetModal(false);
      } else {
        showToast(resData.error || 'Password update failed.', 'error');
      }
    } catch (err) {
      showToast('Server connection failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (partner: Partner) => {
    const nextStatus = partner.status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: partner.id,
          name: partner.name,
          email: partner.email,
          status: nextStatus,
          isEdit: true
        })
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success) {
        setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: nextStatus } : p));
        showToast(`Partner status updated to ${nextStatus}.`, 'info');
        await fetchDashboardData();
      } else {
        showToast(resData.error || 'Failed to update partner status.', 'error');
        await fetchDashboardData();
      }
    } catch (e) {
      showToast('Connection error while updating status.', 'error');
      await fetchDashboardData();
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    const cleanId = String(partnerId || '').trim();
    if (!cleanId) return;
    if (!confirm(`Are you sure you want to delete delivery partner account (${cleanId})? This will permanently deactivate and delete the record from PostgreSQL.`)) return;

    try {
      const res = await fetch(`/api/admin/partners?id=${encodeURIComponent(cleanId)}`, {
        method: 'DELETE'
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        // Remove immediately from state upon DB success
        setPartners(prev => prev.filter(p => p.id.toLowerCase() !== cleanId.toLowerCase()));
        showToast(`Delivery partner ${cleanId} deleted successfully.`, 'success');
        await fetchDashboardData();
      } else {
        showToast(data.error || 'Failed to delete partner from database.', 'error');
      }
    } catch (err) {
      console.error('Error deleting delivery partner:', err);
      showToast('Server connection failed while deleting partner.', 'error');
    }
  };

  // Metrics calculations
  const totalCount = partners.length;
  const activeCount = partners.filter(p => p.status === 'Active').length;
  const inactiveCount = partners.filter(p => p.status === 'Inactive').length;
  const pendingAssignments = orders.filter(o => o.status === 'Waiting for Partner').length;
  const assignedOrders = orders.filter(o => o.assignedPartnerId && o.status !== 'Delivered' && o.status !== 'Cancelled').length;

  return (
    <div className="space-y-6 select-none font-sans text-xs text-brand-charcoal">
      
      {/* 1. OPERATIONS OVERVIEW METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-zinc-200/50 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 bg-brand-burgundy/5 text-brand-burgundy rounded-xl flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block leading-none">Total Partners</span>
            <span className="text-xl font-bold text-zinc-800 font-serif leading-snug">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/50 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block leading-none">Active</span>
            <span className="text-xl font-bold text-zinc-800 font-serif leading-snug">{activeCount}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/50 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 bg-zinc-50 text-zinc-400 rounded-xl flex items-center justify-center shrink-0">
            <UserX className="h-5 w-5" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block leading-none">Inactive</span>
            <span className="text-xl font-bold text-zinc-800 font-serif leading-snug">{inactiveCount}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/50 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block leading-none">Pending Alloc</span>
            <span className="text-xl font-bold text-zinc-800 font-serif leading-snug animate-pulse">{pendingAssignments}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/50 rounded-2xl p-4 shadow-sm flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="h-10 w-10 bg-red-50 text-red-650 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="text-left">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block leading-none">Rider Stock Reports</span>
            <span className="text-xl font-bold text-zinc-800 font-serif leading-snug">{issues.length}</span>
          </div>
        </div>
      </div>

      {/* 2. ACTIONS & TABLE LIST */}
      <div className="bg-white border border-zinc-200/50 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="text-left">
            <h2 className="text-lg font-serif font-black text-zinc-900 uppercase tracking-wide">OPERATIONAL DISPATCH COURIERS</h2>
            <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider mt-0.5">Manage delivery partner accounts, authorization zones, and credentials</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleOpenAdd();
            }}
            className="py-2.5 px-4 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider shadow flex items-center gap-1.5 hover:scale-101 transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add Delivery Partner
          </button>
        </div>

        {/* Partners table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold">
                <th className="p-3">Partner ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Location / Hub</th>
                <th className="p-3">Shift Status</th>
                <th className="p-3">Account Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 font-medium text-zinc-700 text-[11px]">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-zinc-50/20">
                  <td className="p-3 font-mono font-bold text-brand-burgundy uppercase">{p.id}</td>
                  <td className="p-3 font-bold text-zinc-900">{p.name}</td>
                  <td className="p-3 space-y-0.5">
                    <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-zinc-400" /> {p.email}</div>
                    {p.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-zinc-400" /> {p.phone}</div>}
                  </td>
                  <td className="p-3 font-sans">
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-zinc-400" /> {p.locationName}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      p.isOnline ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-zinc-50 text-zinc-400'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${p.isOnline ? 'bg-green-500' : 'bg-zinc-400'}`} />
                      {p.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleToggleStatus(p);
                      }}
                      className={`inline-flex items-center gap-1 hover:underline text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                        p.status === 'Active' ? 'text-green-700' : 'text-red-650'
                      }`}
                    >
                      {p.status === 'Active' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      {p.status}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleOpenEdit(p);
                        }}
                        title="Edit Details"
                        className="p-1.5 border hover:bg-zinc-50 rounded-lg text-zinc-600 hover:text-zinc-900 cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleOpenReset(p);
                        }}
                        title="Reset Security Password"
                        className="p-1.5 border hover:bg-zinc-50 rounded-lg text-zinc-650 hover:text-brand-burgundy cursor-pointer"
                      >
                        <Key className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeletePartner(p.id);
                        }}
                        title="Delete Profile"
                        className="p-1.5 border hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400 font-bold">
                    No delivery partners registered. Register one to initiate dispatch workflows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. INVENTORY ISSUE REPORTS */}
      <div className="bg-white border border-zinc-200/50 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="text-left">
          <h2 className="text-md font-serif font-black text-zinc-800 uppercase tracking-wide">RIDER INVENTORY DISCREPANCY REPORTS</h2>
          <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider mt-0.5">Physical counts and operational hub stock flags filed by active riders</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold">
                <th className="p-3">Date</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Order ID</th>
                <th className="p-3">Rider ID</th>
                <th className="p-3">Reported Count</th>
                <th className="p-3">Issue Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 font-medium text-zinc-700 text-[11px]">
              {issues.map(iss => (
                <tr key={iss.id} className="hover:bg-zinc-50/20">
                  <td className="p-3 text-zinc-400">{new Date(iss.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 font-bold text-zinc-800">{iss.productName} <span className="text-[9px] font-mono text-zinc-450 block uppercase font-medium">SKU: {iss.productId}</span></td>
                  <td className="p-3 font-mono font-bold text-zinc-900">{iss.orderId}</td>
                  <td className="p-3 font-mono font-bold text-brand-burgundy uppercase">{iss.partnerId}</td>
                  <td className="p-3 font-mono">{iss.availableQty !== null ? `Available: ${iss.availableQty}` : 'N/A'} (Req: {iss.requestedQty})</td>
                  <td className="p-3">
                    <span className="text-[8px] bg-red-50 text-red-650 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                      {iss.reason}
                    </span>
                  </td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400 font-bold">
                    No active stock discrepancies or counter issue reports filed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      
      {/* ADD PARTNER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-zinc-900 text-left border-b pb-2">ADD NEW DELIVERY COURIER</h3>
            <form onSubmit={handleCreatePartner} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Partner ID</label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium focus:outline-none focus:border-brand-burgundy bg-zinc-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Singh"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium focus:outline-none focus:border-brand-burgundy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. vikram.rider@fatafat.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium focus:outline-none focus:border-brand-burgundy"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium focus:outline-none focus:border-brand-burgundy"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Secure Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  required
                  placeholder="e.g. riderPass123"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium focus:outline-none focus:border-brand-burgundy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Authorization Hub</label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium bg-white focus:outline-none focus:border-brand-burgundy"
                  >
                    <option value="nawabganj-unnao">Nawabganj, Unnao</option>
                    <option value="chandigarh-university-up">Chandigarh University, UP</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-medium bg-white focus:outline-none focus:border-brand-burgundy"
                  >
                    <option value="Active">Active / On Duty</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 border rounded-xl hover:bg-zinc-50 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Partner...</span>
                    </>
                  ) : (
                    <span>Save Partner</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PARTNER DETAILS MODAL */}
      {showEditModal && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-zinc-900 text-left border-b pb-2">EDIT PARTNER: {selectedPartner.id}</h3>
            <form onSubmit={handleEditPartner} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Mobile Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Operating Location</label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium bg-white focus:outline-none"
                  >
                    <option value="nawabganj-unnao">Nawabganj, Unnao</option>
                    <option value="chandigarh-university-up">Chandigarh University, UP</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl font-medium bg-white focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowEditModal(false)}
                  className="py-2.5 px-4 border rounded-xl hover:bg-zinc-50 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Details</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-zinc-900 text-left border-b pb-2">RESET SECURITY PASSWORD</h3>
            <p className="text-[10px] text-zinc-500 font-medium leading-normal">Enter the new password for rider <strong>{selectedPartner.name} ({selectedPartner.id})</strong> below.</p>
            
            <form onSubmit={handleResetPassword} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="e.g. riderNew456"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium focus:outline-none focus:border-brand-burgundy"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowResetModal(false)}
                  className="py-2.5 px-4 border rounded-xl hover:bg-zinc-50 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
