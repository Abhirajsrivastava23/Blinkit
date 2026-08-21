'use client';

import React, { useState } from 'react';
import { Award, Compass, Heart, Send, Check } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useToast } from '../../components/Toast';

const OPEN_POSITIONS = [
  { id: 'pos-1', title: 'Senior Pastry Chef', team: 'Gourmet Kitchen', location: 'Bengaluru, IN', type: 'Full-Time' },
  { id: 'pos-2', title: 'React Native Developer', team: 'Technology', location: 'Bengaluru, IN', type: 'Full-Time' },
  { id: 'pos-3', title: 'Supply Chain Operations Manager', team: 'Logistics', location: 'Remote / Hybrid', type: 'Full-Time' }
];

export default function CareersPage() {
  const { showToast } = useToast();

  const [form, setForm] = useState({ name: '', email: '', position: 'pos-1', resume: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Application submitted successfully! Our HR team will reach out.', 'success');
      setForm({ name: '', email: '', position: 'pos-1', resume: '' });
    }, 800);
  };

  return (
    <>
      <Header />
      <main className="flex-grow bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <Breadcrumbs />

          {/* Hero */}
          <div className="text-center py-6 space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] text-brand-burgundy font-bold uppercase tracking-widest block">Join the Team</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-zinc-800">
              Work at FATAFAT.
            </h1>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Help us deliver moments of pure joy, sweetness, and legal wellness products. We are seeking passionate creators.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="space-y-6">
            <h3 className="text-base font-serif font-bold text-zinc-800 text-center">Benefits of joining FATAFAT</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border text-center space-y-2">
                <div className="p-2.5 bg-zinc-50 text-brand-burgundy rounded-full w-fit mx-auto">
                  <Heart className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-zinc-800">Health & Wellness</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Comprehensive health coverage and fitness membership allowances.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border text-center space-y-2">
                <div className="p-2.5 bg-zinc-50 text-brand-burgundy rounded-full w-fit mx-auto">
                  <Award className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-zinc-800">Competitive Pay</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Salary packages aligned with international market guidelines and ESOP tokens.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border text-center space-y-2">
                <div className="p-2.5 bg-zinc-50 text-brand-burgundy rounded-full w-fit mx-auto">
                  <Compass className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-zinc-800">Learning Funds</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Yearly budget allocations for books, certifications, and technical courses.
                </p>
              </div>
            </div>
          </div>

          {/* Open positions & application form columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Open Positions list */}
            <div className="md:col-span-6 space-y-4">
              <h3 className="text-base font-serif font-bold text-zinc-800 pb-2 border-b">Open Positions</h3>
              
              <div className="space-y-4">
                {OPEN_POSITIONS.map((pos) => (
                  <div key={pos.id} className="bg-white border rounded-2xl p-5 hover:border-brand-burgundy/10 transition-colors space-y-2 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-extrabold text-zinc-800">{pos.title}</h4>
                      <span className="text-[9px] bg-brand-cream-dark border font-bold uppercase px-2 py-0.5 rounded">
                        {pos.type}
                      </span>
                    </div>
                    <p className="text-zinc-500">Team: {pos.team} • Location: {pos.location}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Apply block */}
            <div className="md:col-span-6 bg-white border rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-base font-serif font-bold text-zinc-800 pb-2 border-b">Express Interest</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-white focus:outline-none focus:border-brand-burgundy/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-white focus:outline-none focus:border-brand-burgundy/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500">Target Role *</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-white focus:outline-none focus:border-brand-burgundy/40"
                  >
                    {OPEN_POSITIONS.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500">Resume / Cover Letter Link</label>
                  <input
                    type="text"
                    placeholder="Paste link to Google Drive/PDF"
                    value={form.resume}
                    onChange={(e) => setForm({ ...form, resume: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-white focus:outline-none focus:border-brand-burgundy/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
                >
                  <Send className="h-4 w-4" /> {loading ? 'Submitting Application...' : 'Submit Application'}
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
