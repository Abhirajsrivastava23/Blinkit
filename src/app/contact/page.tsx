'use client';

import React, { useState } from 'react';
import { Phone, Mail, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useToast } from '../../components/Toast';

export default function ContactPage() {
  const { showToast } = useToast();

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Your message has been sent successfully!', 'success');
      setForm({ name: '', email: '', subject: '', message: '' });
    }, 700);
  };

  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] text-[#1C1A17] font-sans">
        
        {/* Breadcrumbs strip */}
        <div className="border-b border-zinc-200/20 py-4 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 space-y-12">
          
          {/* Header */}
          <div className="text-center py-6 space-y-3 max-w-xl mx-auto">
            <span className="text-[9px] text-brand-burgundy font-extrabold uppercase tracking-[0.3em] block">
              SUPPORT CONCIERGE
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-zinc-900 leading-tight">
              We&apos;re Here When You Need Us.
            </h1>
            <p className="text-xs text-zinc-550 max-w-sm mx-auto leading-relaxed font-medium">
              Have questions regarding delivery runners, bulk celebration orders, or custom decorations? Connect with our team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Info Panels */}
            <div className="md:col-span-5 space-y-4">
              
              <div className="p-6 bg-white border border-zinc-200/20 rounded-2xl flex gap-4 text-xs text-left">
                <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl shrink-0 h-fit">
                  <Phone className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Support Phone</h4>
                  <p className="text-zinc-650 font-extrabold text-sm">+91 1800-FATAFAT</p>
                  <p className="text-[9px] text-zinc-400 font-bold">Toll-free customer hotline</p>
                </div>
              </div>

              <div className="p-6 bg-white border border-zinc-200/20 rounded-2xl flex gap-4 text-xs text-left">
                <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl shrink-0 h-fit">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Email Concierge</h4>
                  <p className="text-zinc-650 font-extrabold text-sm">concierge@fatafat.com</p>
                  <p className="text-[9px] text-zinc-400 font-bold">Response within 2 hours</p>
                </div>
              </div>

              <div className="p-6 bg-white border border-zinc-200/20 rounded-2xl flex gap-4 text-xs text-left">
                <div className="p-3 bg-brand-burgundy/5 text-brand-burgundy rounded-xl shrink-0 h-fit">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-800 uppercase tracking-wider text-[10px]">Support Hours</h4>
                  <p className="text-zinc-650 font-extrabold text-sm">06:00 AM - 12:00 Midnight</p>
                  <p className="text-[9px] text-zinc-400 font-bold">7 days a week, including national holidays</p>
                </div>
              </div>

            </div>

            {/* Right Column: Contact form */}
            <div className="md:col-span-7 bg-white border border-zinc-200/20 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-serif font-extrabold text-zinc-850 border-b border-zinc-200/10 pb-3 text-left">Concierge Message Form</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4 text-xs text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-550 uppercase tracking-widest text-[9px]">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elena Vance"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-550 uppercase tracking-widest text-[9px]">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. elena@gmail.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-550 uppercase tracking-widest text-[9px]">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Custom designer birthday surprise details"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-550 uppercase tracking-widest text-[9px]">Message Content *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write details of your celebration query..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full p-3.5 border border-zinc-200 rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="h-4.5 w-4.5" /> {loading ? 'Sending Message...' : 'Submit Message'}
                </button>
              </form>

            </div>

          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
