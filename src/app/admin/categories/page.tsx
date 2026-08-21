'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategoriesList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto generate slug from name
  useEffect(() => {
    if (!editingId && name) {
      setSlug(name.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
    }
  }, [name, editingId]);

  const handleEditClick = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setStatus(cat.status || 'Active');
    setSeoTitle(cat.seoTitle || '');
    setSeoDescription(cat.seoDescription || '');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
      try {
        const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Category deleted successfully.', 'info');
          fetchCategories();
        } else {
          showToast('Failed to delete category.', 'error');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      showToast('Please fill out Category Name and Slug.', 'error');
      return;
    }

    const payload = {
      name, slug, description, status, seoTitle, seoDescription
    };

    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingId ? 'Category metadata updated!' : 'New category registered!', 'success');
        setIsFormOpen(false);
        setEditingId(null);
        setName('');
        setSlug('');
        setDescription('');
        setSeoTitle('');
        setSeoDescription('');
        fetchCategories();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save category.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving category.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-lg font-serif font-extrabold text-zinc-800">Categories Management</h3>
          <p className="text-xs text-zinc-500 font-medium">Add, configure, or edit SEO settings for e-commerce segments.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setName('');
            setSlug('');
            setDescription('');
            setSeoTitle('');
            setSeoDescription('');
            setIsFormOpen(true);
          }}
          className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1 shadow"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="text-zinc-500 font-medium">Loading segments...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categoriesList.map((cat) => (
            <div key={cat.id} className="bg-white border border-zinc-200/20 p-5 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between hover:border-brand-burgundy/10 transition-colors">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-zinc-800 uppercase tracking-widest text-[10px]">{cat.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                    cat.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-zinc-150 text-zinc-500'
                  }`}>
                    {cat.status || 'Active'}
                  </span>
                </div>
                <p className="text-zinc-450 text-[10px] truncate">Slug: /{cat.slug}</p>
                {cat.description && (
                  <p className="text-zinc-550 leading-relaxed line-clamp-2 text-[10px]">{cat.description}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  onClick={() => handleEditClick(cat)}
                  className="p-1 text-zinc-500 hover:text-brand-burgundy transition-colors"
                  title="Edit metadata"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Delete category"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Modal Category Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-xl shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-serif font-extrabold text-zinc-800">
                {editingId ? 'Edit Category Segment' : 'Register New Segment Category'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="p-1.5 hover:bg-zinc-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wedding Cakes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Slug ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="wedding-cakes"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-zinc-150 focus:outline-none"
                    disabled={!!editingId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief detail category text..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Display Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-zinc-55/5 focus:outline-none"
                  >
                    <option value="Active">Active / Visible</option>
                    <option value="Hidden">Hidden</option>
                  </select>
                </div>
              </div>

              {/* SEO Sub-section */}
              <div className="bg-zinc-50 border p-4 rounded-2xl space-y-3.5">
                <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">SEO Search Optimization</span>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">Meta Title</label>
                    <input
                      type="text"
                      placeholder="Wedding Cakes - Artisanal Fresh Designs"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      className="w-full p-2 bg-white border rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500">Meta Description</label>
                    <textarea
                      rows={2}
                      placeholder="Browse our designer cakes for large wedding celebrations..."
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      className="w-full p-2 bg-white border rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
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
                  Save Category
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
