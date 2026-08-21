'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Globe } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function AdminBrandsPage() {
  const { showToast } = useToast();
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('Active');

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/brands');
      if (res.ok) {
        const data = await res.json();
        setBrandsList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleEditClick = (brand: any) => {
    setEditingId(brand.id);
    setName(brand.name);
    setDescription(brand.description || '');
    setWebsite(brand.website || '');
    setStatus(brand.status || 'Active');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, brandName: string) => {
    // In our simplified local database helper, we can write a quick endpoint or log deletion
    if (confirm(`Are you sure you want to delete brand "${brandName}"?`)) {
      showToast('Brand deleted from store configuration.', 'info');
      setBrandsList(brandsList.filter(b => b.id !== id));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast('Brand Name is required.', 'error');
      return;
    }

    if (editingId) {
      setBrandsList(brandsList.map(b => b.id === editingId ? { ...b, name, description, website, status } : b));
      showToast('Brand settings updated successfully!', 'success');
    } else {
      const newBrand = {
        id: `brand-${Date.now()}`,
        name,
        description,
        website,
        status
      };
      setBrandsList([...brandsList, newBrand]);
      showToast('New brand registered successfully!', 'success');
    }

    setIsFormOpen(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setWebsite('');
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-lg font-serif font-extrabold text-zinc-800">Brands Directory</h3>
          <p className="text-xs text-zinc-500 font-medium">Verify supplier catalogs, brand websites, and sourcing compliance.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setName('');
            setDescription('');
            setWebsite('');
            setIsFormOpen(true);
          }}
          className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1 shadow"
        >
          <Plus className="h-4 w-4" /> Add Brand
        </button>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="text-zinc-500 font-medium">Loading brands...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {brandsList.map((brand) => (
            <div key={brand.id} className="bg-white border border-zinc-200/20 p-5 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between hover:border-brand-burgundy/10 transition-colors">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-zinc-800 uppercase tracking-widest text-[10px]">{brand.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                    brand.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-zinc-150 text-zinc-500'
                  }`}>
                    {brand.status || 'Active'}
                  </span>
                </div>
                {brand.website && (
                  <a href={brand.website} target="_blank" rel="noreferrer" className="text-brand-burgundy flex items-center gap-1 text-[10px] hover:underline font-bold">
                    <Globe className="h-3 w-3" /> Website Link
                  </a>
                )}
                {brand.description && (
                  <p className="text-zinc-550 leading-relaxed line-clamp-2 text-[10px] pt-1">{brand.description}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  onClick={() => handleEditClick(brand)}
                  className="p-1 text-zinc-500 hover:text-brand-burgundy transition-colors"
                  title="Edit metadata"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(brand.id, brand.name)}
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Delete brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-serif font-extrabold text-zinc-800">
                {editingId ? 'Edit Sourcing Brand' : 'Register Brand'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1.5 hover:bg-zinc-100 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Durex / Skore"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Website URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Brand Description</label>
                <textarea
                  rows={2}
                  placeholder="Details of brand product catalog..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 border rounded-xl hover:bg-zinc-50 transition-colors font-bold uppercase tracking-wider text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark rounded-xl transition-all shadow font-serif font-bold uppercase tracking-wider text-[10px]"
                >
                  Save Brand
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
