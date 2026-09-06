'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, Search, Filter, RefreshCw, MessageSquare, 
  CheckCircle2, Clock, AlertCircle, X, ExternalLink, Send, 
  User, Mail, Phone, ShoppingBag, FileText, ChevronRight,
  ShieldCheck, CornerDownRight, Check, Eye, ChevronDown, 
  Sparkles, Loader2, ArrowRight
} from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface LinkedOrder {
  id: string;
  total: number;
  status: string;
  paymentStatus?: string;
  address?: {
    name?: string;
    city?: string;
    addressLine1?: string;
  };
  items?: Array<{ name: string; quantity: number }>;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId?: string;
  name: string;
  email: string;
  phone: string;
  orderId?: string;
  category: string;
  message: string;
  attachmentUrl?: string;
  status: 'New' | 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  adminReply?: string;
  adminReplyAt?: string;
  adminRepliedBy?: string;
  createdAt: string;
  updatedAt: string;
  order?: LinkedOrder | null;
}

const CANNED_RESPONSES = [
  {
    title: 'Delivery Runner Check',
    text: 'We are actively coordinating with our delivery runner on the ground. Your order is on priority and you will receive a live status update shortly.'
  },
  {
    title: 'Refund Approved',
    text: 'Your refund request has been verified and processed by our accounts team. The amount will reflect in your original payment method within 2 to 4 business days.'
  },
  {
    title: 'Custom Cake Confirmation',
    text: 'Thank you for your customisation query! Our master chef has reviewed your request and confirmed that your personalised cake details are scheduled for preparation.'
  },
  {
    title: 'Issue Resolved',
    text: 'We have resolved the issue with your order/account. Thank you for choosing FATAFAT. Please let us know if you need any additional assistance.'
  }
];

export default function AdminSupportPage() {
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active selected ticket for drawer
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'New' | 'Open' | 'In Progress' | 'Resolved' | 'Closed'>('In Progress');
  const [savingReply, setSavingReply] = useState(false);

  // Fetch tickets from PostgreSQL live API
  const fetchTickets = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const queryParams = new URLSearchParams();
      if (activeStatus !== 'All') queryParams.set('status', activeStatus);
      if (selectedCategory !== 'All') queryParams.set('category', selectedCategory);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/support?${queryParams.toString()}`);
      const data = await res.json();

      if (res.ok && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        if (data.stats) {
          setStats(data.stats);
        }

        // If drawer is open, keep selected ticket updated
        if (selectedTicket) {
          const updatedSelected = data.tickets.find((t: SupportTicket) => t.id === selectedTicket.id);
          if (updatedSelected) {
            setSelectedTicket(updatedSelected);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to load support tickets.');
      }
    } catch (err: any) {
      console.error('Error fetching admin tickets:', err);
      if (!isSilent) showToast(err.message || 'Failed to retrieve support tickets.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStatus, selectedCategory, searchQuery, showToast, selectedTicket]);

  // Initial load
  useEffect(() => {
    fetchTickets();
  }, [activeStatus, selectedCategory]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Open drawer with ticket details
  const openTicketDrawer = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setTicketStatus(ticket.status);
  };

  // Submit admin reply & status update
  const handleSaveReply = async () => {
    if (!selectedTicket) return;

    setSavingReply(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminReply: replyText.trim(),
          status: ticketStatus
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update ticket.');
      }

      showToast(`Ticket ${selectedTicket.ticketNumber} updated successfully!`, 'success');

      // Update in local state immediately
      if (data.ticket) {
        setSelectedTicket(data.ticket);
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? { ...t, ...data.ticket } : t));
      }

      // Re-fetch metrics silently
      fetchTickets(true);
    } catch (err: any) {
      console.error('Reply save error:', err);
      showToast(err.message || 'Failed to save reply.', 'error');
    } finally {
      setSavingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100/80 text-blue-800 border border-blue-300 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
            New
          </span>
        );
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-cyan-100/80 text-cyan-800 border border-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100/80 text-amber-900 border border-amber-300">
            <Clock className="h-3 w-3 text-amber-700" />
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100/80 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
            Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-zinc-100 text-zinc-700 border border-zinc-300">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-zinc-100 text-zinc-800">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const statusTabs = [
    { label: 'All Requests', value: 'All', count: stats.total },
    { label: 'New / Unread', value: 'New', count: stats.new },
    { label: 'Open', value: 'Open', count: stats.open },
    { label: 'In Progress', value: 'In Progress', count: stats.inProgress },
    { label: 'Resolved', value: 'Resolved', count: stats.resolved },
    { label: 'Closed', value: 'Closed', count: stats.closed }
  ];

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. Page Header & Live Summary Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-black text-zinc-900">
              Support Tickets & Concierge Ops
            </h1>
            <span className="px-2 py-0.5 bg-brand-burgundy/10 text-brand-burgundy text-[10px] font-extrabold rounded-full">
              PostgreSQL Live
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            Manage customer support inquiries, delivery questions, refunds, and send official replies.
          </p>
        </div>

        <button
          onClick={() => fetchTickets(false)}
          disabled={loading || refreshing}
          className="px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl font-bold text-xs shadow-2xs flex items-center gap-2 transition-all shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin text-brand-burgundy' : ''}`} />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">Total Tickets</span>
          <p className="text-2xl font-serif font-black text-zinc-900">{stats.total}</p>
        </div>

        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">New / Unread</span>
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <p className="text-2xl font-serif font-black text-blue-900">{stats.new}</p>
        </div>

        <div className="p-4 bg-cyan-50/60 border border-cyan-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700 block">Open</span>
          <p className="text-2xl font-serif font-black text-cyan-900">{stats.open}</p>
        </div>

        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block">In Progress</span>
          <p className="text-2xl font-serif font-black text-amber-900">{stats.inProgress}</p>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">Resolved</span>
          <p className="text-2xl font-serif font-black text-emerald-900">{stats.resolved}</p>
        </div>

        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">Closed</span>
          <p className="text-2xl font-serif font-black text-zinc-700">{stats.closed}</p>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-4">
        
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 pb-3">
          {statusTabs.map((tab) => {
            const isActive = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveStatus(tab.value)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-brand-burgundy text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search by ticket # (FT-SUP-XXXX), customer name, email, phone, order ID, message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-64 shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 focus:outline-none focus:border-brand-burgundy"
            >
              <option value="All">All Categories</option>
              <option value="Order Status & Live Tracking">Order Status & Tracking</option>
              <option value="Delivery Runner / Delay Issue">Delivery Issue</option>
              <option value="Damaged or Wrong Product Received">Damaged / Wrong Item</option>
              <option value="Cancellation & Refund Request">Cancellation & Refund</option>
              <option value="Payment & Transaction Issue">Payment & Razorpay</option>
              <option value="Cake Personalisation & Custom Design">Cake Personalisation</option>
              <option value="Product Freshness & Quality Query">Product Quality</option>
              <option value="General Concierge Assistance">General Assistance</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

      </div>

      {/* 4. Support Tickets Table / Feed */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-2xs overflow-hidden">
        
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 text-brand-burgundy animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 font-medium">Fetching support tickets from PostgreSQL...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-20 px-4 text-center space-y-3">
            <div className="h-12 w-12 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h3 className="font-serif font-bold text-zinc-800 text-base">No Matching Support Tickets</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery || activeStatus !== 'All' 
                ? 'Try adjusting your search filters or status selection.' 
                : 'Customer inquiries and support requests will appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-extrabold uppercase tracking-wider text-[9px]">
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Category & Order</th>
                  <th className="py-3.5 px-4">Message Snippet</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Admin Reply</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tickets.map((ticket) => {
                  const hasReply = !!(ticket.adminReply && ticket.adminReply.trim().length > 0);
                  const isNew = ticket.status === 'New';

                  return (
                    <tr 
                      key={ticket.id}
                      className={`hover:bg-zinc-50/80 transition-colors cursor-pointer ${
                        isNew ? 'bg-blue-50/20' : ''
                      }`}
                      onClick={() => openTicketDrawer(ticket)}
                    >
                      {/* Ticket Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isNew && <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />}
                          <span className="font-mono font-black text-brand-burgundy bg-brand-burgundy/5 px-2 py-0.5 rounded border border-brand-burgundy/15">
                            {ticket.ticketNumber}
                          </span>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          <p className="font-bold text-zinc-900 truncate">{ticket.name}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{ticket.email}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{ticket.phone}</p>
                        </div>
                      </td>

                      {/* Category & Order ID */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-xs">
                          <span className="inline-block font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded text-[10px]">
                            {ticket.category}
                          </span>
                          {ticket.orderId && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-brand-burgundy">
                              <ShoppingBag className="h-3 w-3 shrink-0" />
                              <span>Order #{ticket.orderId}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Message Snippet & Attachment icon */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-sm">
                          <p className="text-zinc-700 line-clamp-2 leading-relaxed">
                            {ticket.message}
                          </p>
                          {ticket.attachmentUrl && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                              <FileText className="h-3 w-3" /> Has Attachment
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(ticket.status)}
                      </td>

                      {/* Admin Reply State */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasReply ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="h-3 w-3 text-emerald-600" /> Replied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="h-3 w-3 text-amber-600" /> Pending Reply
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-zinc-500">
                        {formatDate(ticket.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTicketDrawer(ticket);
                          }}
                          className="px-3 py-1.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-lg font-bold text-[11px] transition-all shadow-2xs"
                        >
                          View & Reply
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 5. Interactive Ticket Details & Reply Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity">
          
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden text-left border-l border-zinc-200">
            
            {/* Drawer Header */}
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-brand-burgundy text-base bg-brand-burgundy/10 px-2.5 py-1 rounded-lg border border-brand-burgundy/20">
                  {selectedTicket.ticketNumber}
                </span>
                {getStatusBadge(selectedTicket.status)}
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 hover:bg-zinc-200/80 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Customer Info Card */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-3">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                  Customer Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Full Name</span>
                    <p className="font-bold text-zinc-900">{selectedTicket.name}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Customer ID</span>
                    <p className="font-mono text-zinc-600 text-[11px]">{selectedTicket.customerId || 'Guest Customer'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Email Address</span>
                    <a href={`mailto:${selectedTicket.email}`} className="font-medium text-brand-burgundy hover:underline">
                      {selectedTicket.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Contact Phone</span>
                    <a href={`tel:${selectedTicket.phone}`} className="font-medium text-brand-burgundy hover:underline">
                      {selectedTicket.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Linked Order Card (If attached) */}
              {selectedTicket.orderId && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5" /> Linked Order Details
                    </span>
                    <Link
                      href={`/admin/orders`}
                      className="text-[10px] font-bold text-amber-900 hover:underline flex items-center gap-1"
                    >
                      View Orders Console <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                    <span className="font-mono font-bold text-zinc-800">Order ID: #{selectedTicket.orderId}</span>
                    {selectedTicket.order && (
                      <>
                        <span className="text-zinc-500">•</span>
                        <span className="font-bold text-emerald-700">₹{selectedTicket.order.total}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-white border border-amber-300 text-amber-800">
                          {selectedTicket.order.status}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Original Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Category: <span className="text-zinc-800 font-bold">{selectedTicket.category}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {formatDate(selectedTicket.createdAt)}
                  </span>
                </div>

                <div className="p-4 bg-[#FAF9F6] border border-zinc-200 rounded-2xl text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Attached Photo / PDF */}
              {selectedTicket.attachmentUrl && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                    Customer Attachment
                  </span>
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {selectedTicket.attachmentUrl.startsWith('data:image') || selectedTicket.attachmentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
                        <img
                          src={selectedTicket.attachmentUrl}
                          alt="Ticket attachment"
                          className="h-16 w-16 object-cover rounded-xl border border-zinc-200 shrink-0"
                        />
                      ) : (
                        <FileText className="h-10 w-10 text-brand-burgundy shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-zinc-900 truncate">Customer Uploaded Media</p>
                        <p className="text-[10px] text-zinc-500">Securely stored on FATAFAT Cloud</p>
                      </div>
                    </div>

                    <a
                      href={selectedTicket.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-white border border-zinc-200 hover:border-brand-burgundy rounded-xl text-xs font-bold text-zinc-700 hover:text-brand-burgundy transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Full File
                    </a>
                  </div>
                </div>
              )}

              {/* Admin Reply History if present */}
              {selectedTicket.adminReply && (
                <div className="space-y-2 border-t border-zinc-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <CornerDownRight className="h-3.5 w-3.5" /> Current Official Reply
                    </span>
                    {selectedTicket.adminReplyAt && (
                      <span className="text-[10px] text-zinc-400">
                        {formatDate(selectedTicket.adminReplyAt)}
                      </span>
                    )}
                  </div>
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-zinc-900 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.adminReply}
                  </div>
                  {selectedTicket.adminRepliedBy && (
                    <p className="text-[9px] text-zinc-400 text-right">
                      Replied by: {selectedTicket.adminRepliedBy}
                    </p>
                  )}
                </div>
              )}

              {/* Admin Compose Reply & Status Controller */}
              <div className="space-y-4 border-t border-zinc-200 pt-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-black text-sm text-zinc-900 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-brand-burgundy" /> Compose Admin Reply & Update Status
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-medium">Saves directly to PostgreSQL</span>
                </div>

                {/* Status Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                    Change Ticket Status:
                  </label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:bg-white focus:outline-none focus:border-brand-burgundy"
                  >
                    <option value="New">New / In Queue</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Quick Canned Response Chips */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-brand-burgundy" /> Insert Quick Response:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CANNED_RESPONSES.map((res) => (
                      <button
                        key={res.title}
                        type="button"
                        onClick={() => setReplyText(res.text)}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-brand-burgundy/10 hover:text-brand-burgundy rounded-lg text-[10px] font-bold text-zinc-600 transition-colors"
                      >
                        {res.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reply Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                    Admin Reply Content:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Write a clear, reassuring response to the customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 border border-zinc-200 rounded-xl text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                  />
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-xl font-bold text-xs transition-colors"
              >
                Close Drawer
              </button>

              <button
                type="button"
                disabled={savingReply}
                onClick={handleSaveReply}
                className="px-6 py-2.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {savingReply ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving to PostgreSQL...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Save Reply & Update Status</span>
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
