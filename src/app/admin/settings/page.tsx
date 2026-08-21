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

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 Cols): Banner content details */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Hero Customizer */}
          <div className="bg-white border border-zinc-200/20 p-6 rounded-3xl space-y-4 shadow-sm">
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

          </div>

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

      </form>

    </div>
  );
}
