'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import { useProducts } from '../context/ProductContext';
import { Product } from '../data/mockData';
import { ShieldCheck, Sparkles, Image as ImageIcon, Eye, Trash2, Plus, ArrowLeft, RefreshCw, Upload, UploadCloud } from 'lucide-react';

interface ProductFormProps {
  initialProduct?: Product;
}

const CATEGORIES = [
  { id: 'cakes', name: 'Cakes' },
  { id: 'bakery', name: 'Bakery' },
  { id: 'pastries', name: 'Pastries' },
  { id: 'flowers', name: 'Flowers' },
  { id: 'gifts', name: 'Gifts & Hampers' },
  { id: 'chocolates', name: 'Chocolates' },
  { id: 'celebrations', name: 'Celebrations' },
  { id: 'wellness', name: 'Wellness (18+)' }
];

const TAX_RATES = ['5% GST', '12% GST', '18% GST', '28% GST', 'Exempt'];
type ProductStatus = 'Active' | 'Draft' | 'Hidden' | 'Out of Stock';

type ImageHistoryItem = {
  id: string;
  imageUrl: string;
  uploadedBy?: string;
  uploadedByRole?: string;
  uploadedAt?: string;
  createdAt?: string;
};

export default function ProductForm({ initialProduct }: ProductFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { refreshProducts } = useProducts();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form states
  const [name, setName] = useState(initialProduct?.name || '');
  const [slug, setSlug] = useState(initialProduct?.id || '');
  const [sku, setSku] = useState(initialProduct?.wellnessSku || '');
  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState(initialProduct?.wellnessBrand || 'FATAFAT');
  const [category, setCategory] = useState<Product['category'] | 'wellness'>(initialProduct?.category || 'cakes');
  const [subCategory, setSubCategory] = useState(initialProduct?.subCategory || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [shortDescription, setShortDescription] = useState('');

  // Pricing
  const [mrp, setMrp] = useState(initialProduct?.originalPrice?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(initialProduct?.price?.toString() || '');
  const [costPrice, setCostPrice] = useState('');
  const [tax, setTax] = useState('18% GST');

  // Image manager
  const [primaryImage, setPrimaryImage] = useState(initialProduct?.image || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(initialProduct?.gallery || []);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [adminUploadingPhoto, setAdminUploadingPhoto] = useState(false);
  const [restoringImage, setRestoringImage] = useState(false);

  // Inventory
  const [stockQuantity, setStockQuantity] = useState(initialProduct?.inStock ? '25' : '0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [status, setStatus] = useState<ProductStatus>(initialProduct?.inStock ? 'Active' : 'Out of Stock');

  // Multi-Store levels
  const [storeAStock, setStoreAStock] = useState('10');
  const [storeBStock, setStoreBStock] = useState('8');
  const [storeCStock, setStoreCStock] = useState('7');

  // Variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variantsList, setVariantsList] = useState<{ id: string; name: string; price: string; stock: string }[]>([]);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [newVariantStock, setNewVariantStock] = useState('');

  // Wellness fields
  const [wellnessVerified, setWellnessVerified] = useState<boolean>(initialProduct?.wellnessVerified ?? true);
  const [wellnessType, setWellnessType] = useState<string>(initialProduct?.wellnessType || 'Condoms');
  const [wellnessMaterial, setWellnessMaterial] = useState(initialProduct?.wellnessMaterial || 'Natural Rubber Latex');
  const [wellnessTexture, setWellnessTexture] = useState(initialProduct?.wellnessTexture || 'Smooth');
  const [wellnessFlavor, setWellnessFlavor] = useState(initialProduct?.wellnessFlavor || '');
  const [wellnessPackSize, setWellnessPackSize] = useState(initialProduct?.wellnessPackSize || '10');
  const [manufacturer, setManufacturer] = useState(initialProduct?.wellnessDetails?.manufacturer || 'Reckitt Benckiser');

  // Delivery
  const [deliveryTime, setDeliveryTime] = useState(initialProduct?.deliveryTime || 'Within 12 hours');

  // SEO
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');

  // Calculate discount automatically
  const priceVal = parseFloat(sellingPrice) || 0;
  const mrpVal = parseFloat(mrp) || priceVal;
  const discountPct = mrpVal > priceVal ? Math.round(((mrpVal - priceVal) / mrpVal) * 100) : 0;

  // Fetch image history on mount if editing existing product
  const fetchImageHistory = async () => {
    if (!initialProduct?.id) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/products/${initialProduct.id}/image-history`);
      if (res.ok) {
        const data = await res.json();
        setImageHistory(data.history || []);
      }
    } catch (e) {
      console.warn('Could not load image history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!initialProduct?.id) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchImageHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialProduct?.id]);

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !initialProduct?.id) return;

    const file = files[0];
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image exceeds 8 MB maximum size.', 'error');
      return;
    }

    setAdminUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('productId', initialProduct.id);
      formData.append('file', file);

      const res = await fetch('/api/products/upload-photo', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPrimaryImage(data.imageUrl);
        showToast('Real product photo updated successfully!', 'success');
        await refreshProducts();
        await fetchImageHistory();
      } else {
        showToast(data.error || 'Failed to upload photo.', 'error');
      }
    } catch (err) {
      showToast('Error uploading photo.', 'error');
    } finally {
      setAdminUploadingPhoto(false);
    }
  };

  const handleRestoreImage = async (historyId: string, targetImageUrl: string) => {
    if (!initialProduct?.id) return;
    setRestoringImage(true);
    try {
      const res = await fetch(`/api/products/${initialProduct.id}/restore-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId, targetImageUrl })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPrimaryImage(data.imageUrl);
        showToast('Product image rolled back successfully!', 'success');
        await refreshProducts();
        await fetchImageHistory();
      } else {
        showToast(data.error || 'Failed to restore image.', 'error');
      }
    } catch (err) {
      showToast('Error restoring image.', 'error');
    } finally {
      setRestoringImage(false);
    }
  };

  // Auto slug generation
  useEffect(() => {
    if (!initialProduct && name) {
      const timer = window.setTimeout(() => {
        setSlug(name.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [name, initialProduct]);

  const handleAddGalleryImage = () => {
    if (newGalleryUrl.trim()) {
      setGalleryImages([...galleryImages, newGalleryUrl.trim()]);
      setNewGalleryUrl('');
      showToast('Image added to gallery list.', 'success');
    }
  };

  const handleRemoveGalleryImage = (idx: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== idx));
  };

  const handleAddVariant = () => {
    if (newVariantName.trim() && newVariantPrice.trim()) {
      setVariantsList([
        ...variantsList,
        {
          id: `var-${Date.now()}`,
          name: newVariantName.trim(),
          price: newVariantPrice.trim(),
          stock: newVariantStock.trim() || '10'
        }
      ]);
      setNewVariantName('');
      setNewVariantPrice('');
      setNewVariantStock('');
    }
  };

  const handleRemoveVariant = (id: string) => {
    setVariantsList(variantsList.filter(v => v.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent, submitStatus?: string) => {
    e.preventDefault();
    if (!name || !sellingPrice || !category || !primaryImage) {
      showToast('Please complete all mandatory fields.', 'error');
      return;
    }

    setLoading(true);

    const payload = {
      name,
      price: Number(sellingPrice),
      originalPrice: Number(mrp || sellingPrice),
      category,
      subCategory: subCategory || undefined,
      description,
      image: primaryImage,
      inStock: status !== 'Draft' && status !== 'Out of Stock' && Number(stockQuantity) > 0,
      deliveryTime,
      variants: hasVariants ? variantsList.map(v => v.name) : undefined,
      wellnessBrand: brand,
      wellnessType: category === 'wellness' ? wellnessType : undefined,
      wellnessMaterial: category === 'wellness' ? wellnessMaterial : undefined,
      wellnessPackSize: category === 'wellness' ? wellnessPackSize : undefined,
      wellnessTexture: category === 'wellness' ? wellnessTexture : undefined,
      wellnessFlavor: category === 'wellness' && wellnessFlavor ? wellnessFlavor : undefined,
      wellnessVerified: category === 'wellness' ? wellnessVerified : true,
      storageInstructions: category === 'wellness' ? 'Store in a cool dry place.' : undefined,
      gallery: galleryImages.length > 0 ? galleryImages : [primaryImage]
    };

    try {
      const url = initialProduct ? `/api/products/${initialProduct.id}` : '/api/products';
      const method = initialProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(initialProduct ? 'Product specifications updated successfully!' : 'New product registered successfully!', 'success');
        await refreshProducts();
        router.push('/admin/products');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save product details.', 'error');
      }
    } catch (error) {
      console.error('Error saving product form:', error);
      showToast('Network error, please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Top controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/admin/products')}
          className="p-1.5 hover:bg-zinc-150 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h3 className="text-lg font-serif font-extrabold text-zinc-800">
            {initialProduct ? `Edit Product: ${initialProduct.name}` : 'Create a New Store Product'}
          </h3>
          <p className="text-xs text-zinc-500">Configure catalog properties, variants, inventory slots and compliance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main form (Col 8) */}
        <form onSubmit={(e) => handleSubmit(e)} className="lg:col-span-8 space-y-6">
          
          {/* Section 1: Basic Info */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 space-y-4 shadow-sm">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2">1. Basic Product Information</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Belgian Truffle Cake"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">URL Slug</label>
                <input
                  type="text"
                  placeholder="belgian-truffle-cake"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-zinc-200 cursor-not-allowed focus:outline-none"
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Brand Sourcing</label>
                <input
                  type="text"
                  placeholder="e.g. FATAFAT / Durex"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Product['category'] | 'wellness')}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Sub-Category</label>
                <input
                  type="text"
                  placeholder="e.g. Chocolate Cakes"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Barcode / UPC / EAN</label>
                <input
                  type="text"
                  placeholder="e.g. 8901030752107"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">SKU Number</label>
                <input
                  type="text"
                  placeholder="Auto-generated on save"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-zinc-150 focus:outline-none"
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Delivery Time Frame</label>
                <input
                  type="text"
                  placeholder="e.g. 30-45 mins"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Description *</label>
              <textarea
                required
                rows={3}
                placeholder="Write catalog product details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 space-y-4 shadow-sm">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2">2. Pricing Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">MRP Value (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 899"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 799"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Cost Price (Admin Only)</label>
                <input
                  type="password"
                  placeholder="🔒 Authorized Only"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Tax Allocation</label>
                <select
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                >
                  {TAX_RATES.map(rate => (
                    <option key={rate} value={rate}>{rate}</option>
                  ))}
                </select>
              </div>
            </div>

            {discountPct > 0 && (
              <div className="p-3.5 bg-emerald-55/5 border border-emerald-500/25 rounded-2xl text-emerald-700 flex items-center justify-between font-bold">
                <span>Calculated Discount:</span>
                <span>{discountPct}% OFF Selling Price</span>
              </div>
            )}
          </div>

          {/* Section 3: Image Manager */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy">3. Product Image Manager</h4>
              {initialProduct?.id && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-burgundy hover:bg-[#541424] text-white text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-sm select-none">
                  {adminUploadingPhoto ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>{adminUploadingPhoto ? 'Uploading...' : 'Upload Real Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAdminPhotoUpload}
                    disabled={adminUploadingPhoto}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px] block">Primary Storefront Image *</label>
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  required
                  placeholder="https://images.unsplash.com/photo-..."
                  value={primaryImage}
                  onChange={(e) => setPrimaryImage(e.target.value)}
                  className="flex-grow p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none font-mono"
                />
                {primaryImage && (
                  <div className="h-14 w-14 rounded-xl overflow-hidden border bg-zinc-50 shrink-0 relative group">
                    <img src={primaryImage} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Product Image History & Rollback Panel */}
            {initialProduct?.id && imageHistory.length > 0 && (
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-brand-burgundy" />
                    <span>Real Photo History & Rollback Control ({imageHistory.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={fetchImageHistory}
                    disabled={loadingHistory}
                    className="text-[9px] font-bold text-brand-burgundy hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingHistory ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-zinc-200/40">
                  {imageHistory.map((item, idx) => (
                    <div key={item.id || idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border bg-white shrink-0">
                          <img src={item.imageUrl} alt="Historical shot" className="h-full w-full object-cover" />
                        </div>
                        <div className="text-[10px] text-zinc-600">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900">
                              {item.uploadedByRole === 'delivery_partner' ? '🛵 Rider Photo' : '👤 Admin Photo'}
                            </span>
                            {item.imageUrl === primaryImage && (
                              <span className="bg-green-100 text-green-700 text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                                Active Live
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] text-zinc-400">
                            By {item.uploadedBy ?? 'System'} • {item.uploadedAt || item.createdAt ? new Date(item.uploadedAt ?? item.createdAt ?? '').toLocaleString() : 'Unknown time'}
                          </p>
                        </div>
                      </div>

                      {item.imageUrl !== primaryImage && (
                        <button
                          type="button"
                          onClick={() => handleRestoreImage(item.id, item.imageUrl)}
                          disabled={restoringImage}
                          className="px-2.5 py-1 bg-white hover:bg-zinc-100 border text-brand-burgundy rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all shadow-2xs"
                        >
                          Restore This Photo
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px] block">Product Gallery List</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste additional gallery slide image link..."
                  value={newGalleryUrl}
                  onChange={(e) => setNewGalleryUrl(e.target.value)}
                  className="flex-grow p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddGalleryImage}
                  className="px-4 bg-zinc-800 text-white hover:bg-zinc-950 font-bold uppercase tracking-wider rounded-xl"
                >
                  Add
                </button>
              </div>

              {galleryImages.length > 0 && (
                <div className="grid grid-cols-4 gap-4 pt-2">
                  {galleryImages.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-zinc-200/50 bg-zinc-50">
                      <img src={url} alt="Gallery slide" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Inventory & Multi-Store */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 space-y-4 shadow-sm">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2">4. Inventory & Multi-Store Levels</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Global Stock Quantity</label>
                <input
                  type="number"
                  placeholder="e.g. 25"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Low Stock Threshold</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Publish Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="w-full p-3.5 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none"
                >
                  <option value="Active">Active / Visible</option>
                  <option value="Draft">Draft (Internal Only)</option>
                  <option value="Hidden">Hidden (Not search accessible)</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="p-4 border rounded-2xl bg-zinc-50/50 space-y-3">
              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Allocations Across Warehouses</span>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Store A Stock</label>
                  <input
                    type="number"
                    value={storeAStock}
                    onChange={(e) => setStoreAStock(e.target.value)}
                    className="w-full p-2 bg-white border rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Store B Stock</label>
                  <input
                    type="number"
                    value={storeBStock}
                    onChange={(e) => setStoreBStock(e.target.value)}
                    className="w-full p-2 bg-white border rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Store C Stock</label>
                  <input
                    type="number"
                    value={storeCStock}
                    onChange={(e) => setStoreCStock(e.target.value)}
                    className="w-full p-2 bg-white border rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Variants */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 space-y-4 shadow-sm text-left">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy">5. Product Variants</h4>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="accent-brand-burgundy h-4 w-4"
                />
                <label htmlFor="hasVariants" className="font-bold text-zinc-700 cursor-pointer">This product has variants</label>
              </div>
            </div>

            {hasVariants && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Variant name (e.g. 1 KG)"
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={newVariantPrice}
                    onChange={(e) => setNewVariantPrice(e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={newVariantStock}
                    onChange={(e) => setNewVariantStock(e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="py-2 bg-zinc-800 text-white font-bold rounded-lg uppercase tracking-wider"
                  >
                    Add Line
                  </button>
                </div>

                {variantsList.length > 0 && (
                  <div className="border rounded-xl divide-y">
                    {variantsList.map(v => (
                      <div key={v.id} className="p-3 flex justify-between items-center text-xs">
                        <span><strong>{v.name}</strong> - Price: ₹{v.price} (Stock: {v.stock})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(v.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 6: Wellness 18+ Attributes */}
          {category === 'wellness' && (
            <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 space-y-4 shadow-sm text-left">
              <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-700" /> 6. Wellness & Intimate Compliance Controls
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Wellness Sourcing Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Wellness Product Type</label>
                  <select
                    value={wellnessType}
                    onChange={(e) => setWellnessType(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    <option value="Condoms">Condoms</option>
                    <option value="Lubricants">Lubricants</option>
                    <option value="Intimate Care">Intimate Care</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Material</label>
                  <input
                    type="text"
                    value={wellnessMaterial}
                    onChange={(e) => setWellnessMaterial(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Texture</label>
                  <input
                    type="text"
                    value={wellnessTexture}
                    onChange={(e) => setWellnessTexture(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Flavor</label>
                  <input
                    type="text"
                    value={wellnessFlavor}
                    onChange={(e) => setWellnessFlavor(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500">Pack Size</label>
                  <input
                    type="text"
                    value={wellnessPackSize}
                    onChange={(e) => setWellnessPackSize(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-700">Verified Sourcing Status</span>
                  <select
                    value={wellnessVerified ? 'yes' : 'no'}
                    onChange={(e) => setWellnessVerified(e.target.value === 'yes')}
                    className="p-2 border rounded-xl"
                  >
                    <option value="yes">YES (Verified SKU)</option>
                    <option value="no">NO (Incomplete Audit)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-700">Discreet Inner Packaging forced</span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[9px] rounded-full">ACTIVE</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: SEO */}
          <div className="bg-white border border-zinc-200/20 rounded-3xl p-6 space-y-4 shadow-sm">
            <h4 className="font-serif font-extrabold text-sm text-brand-burgundy border-b pb-2">7. Product SEO Setup</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">SEO Meta Title</label>
                <input
                  type="text"
                  placeholder="Premium Chocolate Cake - Spontaneous Gifting"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-500">Meta Description</label>
                <textarea
                  rows={2}
                  placeholder="Enter detailed browser summary..."
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Save Controls */}
          <div className="flex gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="px-6 py-3 border border-zinc-300 hover:bg-zinc-50 font-bold uppercase rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-6 py-3 bg-zinc-800 text-white hover:bg-zinc-950 font-bold uppercase rounded-xl transition-all flex items-center gap-1"
            >
              <Eye className="h-4 w-4" /> {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-brand-burgundy/15"
            >
              {loading ? 'Saving catalog...' : (initialProduct ? 'Apply updates' : 'Publish Product')}
            </button>
          </div>

        </form>

        {/* Floating preview (Col 4) */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-[#FAF9F6] border border-zinc-200/20 rounded-3xl p-6 shadow-sm space-y-4 text-center">
            <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest block">Live Card Preview</span>
            
            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm aspect-[3/4] flex flex-col justify-between p-4 max-w-[240px] mx-auto">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-50 border border-zinc-200/20">
                <img
                  src={primaryImage || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80'}
                  alt="Card Preview"
                  className="w-full h-full object-cover"
                />
                {discountPct > 0 && (
                  <span className="absolute top-2 left-2 bg-brand-burgundy text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">
                    {discountPct}% OFF
                  </span>
                )}
              </div>

              <div className="text-left space-y-1.5 pt-3">
                <span className="text-[8px] text-brand-burgundy uppercase font-extrabold tracking-widest">{category}</span>
                <h4 className="font-serif font-bold text-xs truncate text-zinc-800">{name || 'Belgian Truffle Cake'}</h4>
                
                <div className="flex justify-between items-center">
                  <div className="space-x-1">
                    <span className="font-extrabold text-zinc-900">₹{sellingPrice || '799'}</span>
                    {mrp && Number(mrp) > priceVal && (
                      <span className="line-through text-zinc-400 text-[10px]">₹{mrp}</span>
                    )}
                  </div>
                  <span className="text-[8px] font-extrabold uppercase text-brand-burgundy border border-brand-burgundy/10 px-2 py-0.5 rounded-full select-none">
                    + Add
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
