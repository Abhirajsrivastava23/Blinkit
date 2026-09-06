'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  LifeBuoy, MessageSquare, Clock, CheckCircle2, AlertCircle, 
  ExternalLink, ChevronRight, Plus, RefreshCw, Send, 
  FileText, ShieldCheck, CornerDownRight, Image as ImageIcon, Loader2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';

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
}

export default function CustomerSupportTicketsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/support/tickets');
      const data = await res.json();
      if (res.ok && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
      showToast('Could not load support tickets.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            New / Queued
          </span>
        );
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" />
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 text-zinc-600 border border-zinc-200">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 text-zinc-700">
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

  return (
    <div className="space-y-6 text-left">
      
      {/* Header with Title and Create New CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-black text-zinc-900">
              Support Tickets & Concierge
            </h1>
            <span className="bg-brand-burgundy/10 text-brand-burgundy text-[10px] px-2 py-0.5 rounded-full font-bold">
              {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            Track inquiries, delivery assistance, refund requests, and direct replies from our operations desk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="p-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-xl border border-zinc-200 transition-colors"
            title="Refresh tickets"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-brand-burgundy' : ''}`} />
          </button>

          <Link
            href="/contact"
            className="px-4 py-2.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Ticket</span>
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="h-8 w-8 text-brand-burgundy animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-medium">Loading your support tickets from database...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-4 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-[#FAF9F6] space-y-4">
          <div className="h-14 w-14 bg-brand-burgundy/10 text-brand-burgundy rounded-full flex items-center justify-center mx-auto">
            <LifeBuoy className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-serif font-bold text-zinc-800 text-base">No Support Tickets Yet</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium">
              Have questions about an active order, delivery status, or custom decoration? Submit a ticket and our team will assist you immediately.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <MessageSquare className="h-4 w-4" />
            Contact Support Concierge
          </Link>
        </div>
      ) : (
        /* Tickets Feed */
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const hasReply = !!(ticket.adminReply && ticket.adminReply.trim().length > 0);

            return (
              <div
                key={ticket.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Card Header: Ticket Number, Category, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-brand-burgundy text-sm bg-brand-burgundy/5 px-2.5 py-1 rounded-lg border border-brand-burgundy/15">
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-xs font-bold text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-lg">
                      {ticket.category}
                    </span>
                    {ticket.orderId && (
                      <span className="text-[11px] font-bold text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        Order #{ticket.orderId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {formatDate(ticket.createdAt)}
                    </span>
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>

                {/* Customer's Original Message */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-[9px]">
                    Your Message
                  </p>
                  <p className="text-xs text-zinc-800 leading-relaxed font-normal whitespace-pre-wrap bg-[#FAF9F6] p-3.5 rounded-xl border border-zinc-200/60">
                    {ticket.message}
                  </p>
                </div>

                {/* Attachment Thumbnail if Present */}
                {ticket.attachmentUrl && (
                  <div className="pt-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Attached File
                    </span>
                    <a
                      href={ticket.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 p-2 bg-zinc-50 border border-zinc-200 hover:border-brand-burgundy rounded-xl text-xs font-bold text-zinc-700 hover:text-brand-burgundy transition-all group"
                    >
                      {ticket.attachmentUrl.startsWith('data:image') || ticket.attachmentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
                        <img
                          src={ticket.attachmentUrl}
                          alt="Ticket Attachment"
                          className="h-10 w-10 object-cover rounded-lg border border-zinc-200"
                        />
                      ) : (
                        <FileText className="h-6 w-6 text-brand-burgundy" />
                      )}
                      <span className="text-[11px] group-hover:underline">View Attachment</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                    </a>
                  </div>
                )}

                {/* Official Operations Team Response */}
                {hasReply ? (
                  <div className="mt-4 p-4 md:p-5 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 border border-emerald-200/80 rounded-2xl space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs border-b border-emerald-200/50 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <CornerDownRight className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Official Support Response</span>
                        <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded uppercase">
                          VERIFIED
                        </span>
                      </div>
                      {ticket.adminReplyAt && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          {formatDate(ticket.adminReplyAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-900 leading-relaxed font-medium whitespace-pre-wrap pt-1">
                      {ticket.adminReply}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center gap-2 text-amber-800 text-xs">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0 animate-spin" />
                    <span className="text-[11px] font-medium">
                      Our concierge team is reviewing your ticket. You will receive an official reply here shortly.
                    </span>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
