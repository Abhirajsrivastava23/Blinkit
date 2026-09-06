'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Phone, Mail, Clock, MessageSquare, ArrowRight, CheckCircle2, 
  Upload, X, AlertCircle, Loader2, Sparkles, FileText, HelpCircle, ShieldCheck
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const CATEGORIES = [
  'Order Status & Live Tracking',
  'Delivery Runner / Delay Issue',
  'Damaged or Wrong Product Received',
  'Cancellation & Refund Request',
  'Payment & Transaction Issue',
  'Cake Personalisation & Custom Design',
  'Product Freshness & Quality Query',
  'Celebration Bulk Order Inquiry',
  'General Concierge Assistance',
  'Other'
];

export default function ContactPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    orderId: '',
    category: 'Order Status & Live Tracking',
    message: '',
    attachmentUrl: ''
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    category: string;
    createdAt: string;
  } | null>(null);

  // Auto-fill from authenticated user context
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || (user as any).phone || ''
      }));
    }
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10 MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.fileUrl) {
        throw new Error(data.error || 'Failed to upload attachment.');
      }

      setForm(prev => ({ ...prev, attachmentUrl: data.fileUrl }));
      showToast('Attachment uploaded successfully.', 'success');
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast(err.message || 'Failed to upload attachment.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.message.trim()) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit support request.');
      }

      setSubmittedTicket({
        ticketNumber: data.ticketNumber || data.ticket?.ticketNumber || 'FT-SUP-0001',
        category: form.category,
        createdAt: new Date().toISOString()
      });

      showToast(`Your support request has been submitted. Ticket: ${data.ticketNumber}`, 'success');

      // Reset form
      setForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: (user as any)?.phone || '',
        orderId: '',
        category: 'Order Status & Live Tracking',
        message: '',
        attachmentUrl: ''
      });
    } catch (err: any) {
      console.error('Submission error:', err);
      showToast(err.message || 'Failed to submit support ticket.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] text-[#1C1A17] font-sans">
        
        {/* Breadcrumbs strip */}
        <div className="border-b border-zinc-200/40 py-3 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
          
          {/* Header */}
          <div className="text-center py-2 space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-burgundy/10 border border-brand-burgundy/20 rounded-full text-brand-burgundy text-[10px] font-extrabold uppercase tracking-widest">
              <ShieldCheck className="h-3.5 w-3.5" />
              FATAFAT Support Concierge
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-zinc-900 leading-tight">
              We&apos;re Here When You Need Us.
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed font-medium">
              Submit a support request directly to our operations team. Every request is tracked with a unique ticket number and prioritized for fast resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* Left Column: Direct Contact & Info Panels */}
            <div className="md:col-span-4 space-y-4">
              
              <div className="p-5 bg-white border border-zinc-200/60 rounded-2xl shadow-sm flex gap-4 text-xs text-left hover:border-brand-burgundy/30 transition-all">
                <div className="p-3 bg-brand-burgundy/10 text-brand-burgundy rounded-xl shrink-0 h-fit">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Toll-Free Hotline</h4>
                  <p className="text-zinc-900 font-extrabold text-sm">+91 1800-FATAFAT</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Priority support for active orders</p>
                </div>
              </div>

              <div className="p-5 bg-white border border-zinc-200/60 rounded-2xl shadow-sm flex gap-4 text-xs text-left hover:border-brand-burgundy/30 transition-all">
                <div className="p-3 bg-brand-burgundy/10 text-brand-burgundy rounded-xl shrink-0 h-fit">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Support Email</h4>
                  <p className="text-zinc-900 font-extrabold text-sm">concierge@fatafat.com</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Average response time within 2 hours</p>
                </div>
              </div>

              <div className="p-5 bg-white border border-zinc-200/60 rounded-2xl shadow-sm flex gap-4 text-xs text-left hover:border-brand-burgundy/30 transition-all">
                <div className="p-3 bg-brand-burgundy/10 text-brand-burgundy rounded-xl shrink-0 h-fit">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Operational Hours</h4>
                  <p className="text-zinc-900 font-extrabold text-sm">06:00 AM – Midnight</p>
                  <p className="text-[10px] text-zinc-500 font-medium">7 days a week, including festival holidays</p>
                </div>
              </div>

              {/* My Account Quick Link if Logged in */}
              {user && (
                <div className="p-5 bg-gradient-to-br from-brand-burgundy/5 to-brand-burgundy/15 border border-brand-burgundy/20 rounded-2xl text-left space-y-2">
                  <h4 className="text-xs font-bold text-brand-burgundy flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4" /> Track Previous Tickets
                  </h4>
                  <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
                    You can view past tickets and official replies anytime in your customer account.
                  </p>
                  <Link
                    href="/account/support"
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-burgundy hover:underline pt-1"
                  >
                    Go to My Support Tickets <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

            </div>

            {/* Right Column: Support Form or Confirmation */}
            <div className="md:col-span-8">
              
              {submittedTicket ? (
                <div className="bg-white border border-emerald-200 rounded-3xl p-8 md:p-10 shadow-sm text-center space-y-6">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      TICKET SUBMITTED SUCCESSFULLY
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900">
                      We&apos;ve Received Your Request!
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
                      Your support request has been logged permanently in our PostgreSQL system and assigned to a live support executive.
                    </p>
                  </div>

                  {/* Highlighted Ticket Card */}
                  <div className="bg-[#FAF9F6] border-2 border-dashed border-brand-burgundy/30 rounded-2xl p-6 max-w-md mx-auto text-left space-y-3">
                    <div className="flex justify-between items-center border-b border-zinc-200/60 pb-2.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ticket Number</span>
                      <span className="font-mono font-black text-brand-burgundy text-lg sm:text-xl">
                        {submittedTicket.ticketNumber}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Issue Category:</span>
                      <span className="font-bold text-zinc-800">{submittedTicket.category}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Status:</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold text-[10px]">
                        New / In Queue
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    {user ? (
                      <Link
                        href="/account/support"
                        className="w-full sm:w-auto px-6 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-2"
                      >
                        <FileText className="h-4 w-4" /> View in My Account
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="w-full sm:w-auto px-6 py-3 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-2"
                      >
                        Login to Track Ticket
                      </Link>
                    )}

                    <button
                      onClick={() => setSubmittedTicket(null)}
                      className="w-full sm:w-auto px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-xs transition-all"
                    >
                      Submit Another Ticket
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-zinc-200/60 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm space-y-6 text-left">
                  
                  <div className="border-b border-zinc-200/60 pb-4">
                    <h3 className="text-xl font-serif font-black text-zinc-900">
                      Submit a Support Ticket
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">
                      Fill out the details below. Our team will review your ticket and reply promptly.
                    </p>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                    
                    {/* Row 1: Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">
                          Your Full Name <span className="text-brand-burgundy">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">
                          Email Address <span className="text-brand-burgundy">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. rahul@example.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Row 2: Phone & Order ID (Optional) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">
                          Phone Number <span className="text-brand-burgundy">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9876543210"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] flex items-center justify-between">
                          <span>Order ID (Optional)</span>
                          <span className="text-[9px] text-zinc-400 font-normal lowercase">if related to order</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. FT-123456 or 123456"
                          value={form.orderId}
                          onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                          className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Issue Category */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">
                        Issue Category <span className="text-brand-burgundy">*</span>
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all text-xs font-medium text-zinc-800"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Message Content */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">
                        Detailed Message / Description <span className="text-brand-burgundy">*</span>
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Please describe your query, issue, or feedback in detail so we can resolve it quickly..."
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all text-xs font-medium resize-y"
                      />
                    </div>

                    {/* Attachment / Photo Upload (Optional) */}
                    <div className="space-y-2">
                      <label className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] flex items-center justify-between">
                        <span>Attachment / Screenshot / Photo (Optional)</span>
                        <span className="text-[9px] text-zinc-400 font-normal">PNG, JPG, WebP, PDF (Max 10MB)</span>
                      </label>

                      {form.attachmentUrl ? (
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {/* If image, show thumbnail */}
                            {form.attachmentUrl.startsWith('data:image') || form.attachmentUrl.includes('product-images') || form.attachmentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
                              <img 
                                src={form.attachmentUrl} 
                                alt="Attachment preview" 
                                className="h-12 w-12 object-cover rounded-lg border border-zinc-200 shrink-0" 
                              />
                            ) : (
                              <FileText className="h-8 w-8 text-brand-burgundy shrink-0" />
                            )}
                            <div className="text-left overflow-hidden">
                              <p className="text-xs font-bold text-zinc-800 truncate">Attachment uploaded</p>
                              <a 
                                href={form.attachmentUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] text-brand-burgundy hover:underline font-semibold"
                              >
                                View uploaded file
                              </a>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, attachmentUrl: '' }))}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Remove attachment"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-200 hover:border-brand-burgundy rounded-2xl cursor-pointer bg-[#FAF9F6] hover:bg-white transition-all text-center group">
                          {uploading ? (
                            <div className="flex items-center gap-2 text-xs text-brand-burgundy font-bold">
                              <Loader2 className="h-4 w-4 animate-spin" /> Uploading file...
                            </div>
                          ) : (
                            <>
                              <Upload className="h-5 w-5 text-zinc-400 group-hover:text-brand-burgundy transition-colors mb-1" />
                              <span className="text-xs font-bold text-zinc-700 group-hover:text-brand-burgundy">
                                Click to upload photo or document
                              </span>
                              <span className="text-[10px] text-zinc-400 mt-0.5">
                                Add photos of damaged items, payment receipts, or cake reference images
                              </span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            disabled={uploading}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting || uploading}
                      className="w-full py-4 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Submitting Ticket to Database...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4.5 w-4.5" />
                          <span>Submit Support Request</span>
                        </>
                      )}
                    </button>

                  </form>

                </div>
              )}

            </div>

          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
