'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Search, RefreshCw, ShoppingBag, Mail, Phone, 
  Calendar, ShieldCheck, UserCheck, ArrowUpRight, Copy, Check
} from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface CustomerRecord {
  userId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string | null;
  lastLoginAt: string | null;
  ordersCount: number;
  totalSpent: number;
  wellnessAccessStatus: string;
  addressesCount: number;
}

export default function AdminCustomersPage() {
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSeqRef = useRef(0);

  const fetchCustomers = async (showLoadingState = false) => {
    if (showLoadingState) setIsRefreshing(true);
    const thisSeq = ++fetchSeqRef.current;

    try {
      const res = await fetch('/api/admin/customers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (thisSeq >= fetchSeqRef.current && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
      } else if (showLoadingState) {
        showToast('Failed to fetch customers.', 'error');
      }
    } catch (err) {
      if (showLoadingState) {
        showToast('Error loading customer registry.', 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch and real-time live sync polling
  useEffect(() => {
    void fetchCustomers(true);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        void fetchCustomers(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered customer list by search query
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.userId.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  // Aggregate Metrics
  const totalCustomers = customers.length;
  const customersWithOrders = customers.filter(c => c.ordersCount > 0).length;
  const totalOrders = customers.reduce((acc, c) => acc + c.ordersCount, 0);
  const totalGMV = customers.reduce((acc, c) => acc + c.totalSpent, 0);

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-serif font-black text-zinc-900">Customers & User Registry</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-burgundy/10 text-brand-burgundy text-[10px] font-bold">
              {totalCustomers} {totalCustomers === 1 ? 'Customer' : 'Customers'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Real-time database records of registered accounts, purchase histories, and contact information.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl bg-white text-xs focus:outline-none focus:border-brand-burgundy/40 shadow-sm"
            />
          </div>

          <button
            onClick={() => void fetchCustomers(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 shadow-sm transition-colors"
            title="Refresh customer registry"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand-burgundy' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Accounts</span>
          <p className="text-xl font-serif font-black text-zinc-900">{totalCustomers}</p>
          <span className="text-[10px] text-green-600 font-medium">● Real-time DB Sync</span>
        </div>

        <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Buyers</span>
          <p className="text-xl font-serif font-black text-zinc-900">{customersWithOrders}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Placed ≥ 1 order</span>
        </div>

        <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Orders</span>
          <p className="text-xl font-serif font-black text-brand-burgundy">{totalOrders}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Customer orders</span>
        </div>

        <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Customer Spend</span>
          <p className="text-xl font-serif font-black text-zinc-900">₹{totalGMV.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Total revenue</span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-burgundy" />
          <p className="text-xs font-medium">Loading customer database...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCustomers.length === 0 && (
        <div className="bg-white border border-dashed border-zinc-300 rounded-3xl p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-burgundy/5 text-brand-burgundy flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <h4 className="font-serif font-bold text-base text-zinc-800">
            {searchQuery ? `No customers match "${searchQuery}"` : 'No Registered Customers Found'}
          </h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery 
              ? 'Try searching with a different name, email, or phone number.' 
              : 'As customers register on the website or log in via OTP/Google, their persistent profiles will appear here automatically.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-brand-burgundy underline hover:opacity-80"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Customer Registry Table */}
      {!isLoading && filteredCustomers.length > 0 && (
        <div className="bg-white border border-zinc-200/70 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/75 text-zinc-400 uppercase tracking-widest text-[9px] font-bold">
                  <th className="py-3.5 px-4">Customer Name & ID</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filteredCustomers.map((cust) => {
                  const initial = cust.name ? cust.name.charAt(0).toUpperCase() : 'C';
                  const formattedDate = cust.createdAt 
                    ? new Date(cust.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'N/A';

                  return (
                    <tr key={cust.userId} className="hover:bg-zinc-50/60 transition-colors">
                      
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-brand-burgundy/10 text-brand-burgundy font-serif font-black flex items-center justify-center shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-900 truncate">{cust.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="font-mono text-[9px] text-zinc-400 truncate max-w-[120px]">
                                {cust.userId}
                              </span>
                              <button
                                onClick={() => handleCopy(cust.userId, `id-${cust.userId}`)}
                                className="text-zinc-300 hover:text-zinc-600 transition-colors"
                                title="Copy User ID"
                              >
                                {copiedId === `id-${cust.userId}` ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        {cust.email ? (
                          <div className="flex items-center gap-1.5 text-zinc-600">
                            <Mail className="h-3 w-3 text-zinc-400 shrink-0" />
                            <a href={`mailto:${cust.email}`} className="truncate hover:text-brand-burgundy hover:underline">
                              {cust.email}
                            </a>
                          </div>
                        ) : (
                          <span className="text-zinc-300 italic">No email</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4">
                        {cust.phone ? (
                          <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
                            <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
                            <span>{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-300 italic">No phone</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Total Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
                          cust.ordersCount > 0 
                            ? 'bg-brand-burgundy/10 text-brand-burgundy' 
                            : 'bg-zinc-100 text-zinc-400'
                        }`}>
                          <ShoppingBag className="h-3 w-3" />
                          {cust.ordersCount}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-serif font-black text-zinc-900">
                          ₹{cust.totalSpent.toLocaleString('en-IN')}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center text-[10px] text-zinc-400 font-medium">
            <span>Showing {filteredCustomers.length} of {totalCustomers} registered accounts</span>
            <span>Live Sync Active (5s)</span>
          </div>
        </div>
      )}

    </div>
  );
}
