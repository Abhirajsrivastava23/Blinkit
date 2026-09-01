'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '../../../components/Toast';
import { Save, RefreshCw, LayoutTemplate, SlidersHorizontal, Image, Eye, EyeOff } from 'lucide-react';

export default function AdminSettingsPage() {
  const { showToast } = useToast();
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

  useEffect(() => {
    fetchConfig();
  }, []);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 text-brand-burgundy animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-xl font-serif font-black text-zinc-900">Homepage CMS Settings</h3>
          <p className="text-xs text-zinc-500 font-medium">Configure active storefront photography, banner text coordinates, and section visibilities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
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

    </div>
  );
}
