'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, Plus, Trash2, Edit3, Search, SlidersHorizontal, 
  Download, Upload, Copy, Eye, EyeOff, Check, X, FileText, AlertCircle 
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { useProducts } from '../../../context/ProductContext';
import { Product } from '../../../data/mockData';
import SafeImage from '../../../components/SafeImage';

export default function AdminProductsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { products, refreshProducts } = useProducts();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedStock, setSelectedStock] = useState('All');
  const [storeType, setStoreType] = useState('All'); // 'All', 'normal', 'wellness'

  // Modal views
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [importReport, setImportReport] = useState<{
    validRows: any[];
    invalidRows: any[];
    duplicateSkus: string[];
    missingFields: string[];
  } | null>(null);

  // Filter lists
  const categories = ['All', 'Birthday Cakes', 'Chocolate Cakes', 'Pastries', 'Beer Theme Cakes', 'Desserts', 'wellness'];
  const brands = ['All', 'FATAFAT', 'Durex', 'KamaSutra', 'Skore', 'Manforce', 'Clean & Dry'];
  const statuses = ['All', 'Active', 'Draft', 'Hidden', 'Out of Stock'];
  const stocks = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

  // Apply filters client-side from context products
  const filteredProducts = products.filter(p => {
    // 1. Store Type
    if (storeType === 'wellness' && p.category !== 'wellness') return false;
    if (storeType === 'normal' && p.category === 'wellness') return false;

    // 2. Category
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;

    // 3. Brand
    if (selectedBrand !== 'All') {
      const b = p.wellnessBrand || 'FATAFAT';
      if (b.toLowerCase() !== selectedBrand.toLowerCase()) return false;
    }

    // 4. Status
    if (selectedStatus !== 'All') {
      if (selectedStatus === 'Active' && (!p.inStock || !p.wellnessVerified)) return false;
      if (selectedStatus === 'Out of Stock' && p.inStock) return false;
      // Simulating draft/hidden properties
      if (selectedStatus === 'Draft' && p.rating !== 4.5) return false; 
    }

    // 5. Stock status
    if (selectedStock !== 'All') {
      if (selectedStock === 'Out of Stock' && p.inStock) return false;
      if (selectedStock === 'In Stock' && !p.inStock) return false;
      if (selectedStock === 'Low Stock' && (!p.inStock || p.reviewCount >= 100)) return false; // low stock simulated review count
    }

    // 6. Text Search Query (Name, SKU, Brand)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const skuVal = p.wellnessSku || '';
      const b = p.wellnessBrand || 'FATAFAT';
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        skuVal.toLowerCase().includes(q) ||
        b.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Ensure fresh products on mount
  useEffect(() => {
    void refreshProducts();
  }, []);

  // Action: Duplicate Product
  const handleDuplicateProduct = async (product: Product) => {
    const doublePrice = product.price;
    const doubleMrp = product.originalPrice;
    
    // Auto add -copy suffix
    const duplicatePayload = {
      name: `${product.name} (Copy)`,
      price: doublePrice,
      originalPrice: doubleMrp,
      category: product.category,
      subCategory: product.subCategory,
      description: product.description,
      image: product.image,
      inStock: product.inStock,
      deliveryTime: product.deliveryTime,
      variants: product.variants,
      wellnessBrand: product.wellnessBrand || 'FATAFAT',
      wellnessType: product.wellnessType,
      wellnessMaterial: product.wellnessMaterial,
      wellnessPackSize: product.wellnessPackSize,
      wellnessTexture: product.wellnessTexture,
      wellnessVerified: product.wellnessVerified,
      gallery: product.gallery
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatePayload)
      });

      if (res.ok) {
        showToast(`Duplicated ${product.name} successfully!`, 'success');
        await refreshProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to duplicate product.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error duplicating product.', 'error');
    }
  };

  // Action: Toggle visible / Hide
  const handleToggleHide = async (product: Product, newStatus: boolean) => {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock: newStatus })
      });

      if (res.ok) {
        showToast(`Product ${product.name} status updated!`, 'success');
        await refreshProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to update product status.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating product status.', 'error');
    }
  };

  // Action: Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete or archive ${name}?`)) {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          showToast('Product removed from store catalog.', 'info');
          await refreshProducts();
        } else {
          const data = await res.json().catch(() => ({}));
          showToast(data.error || 'Failed to delete product SKU.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error deleting product.', 'error');
      }
    }
  };

  // Action: Export Products as CSV file
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      showToast('No products available to export.', 'error');
      return;
    }

    const headers = ['Product Name', 'SKU', 'Brand', 'Category', 'MRP', 'Selling Price', 'Stock Status', 'Delivery Time'];
    const rows = filteredProducts.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.wellnessSku || `SKU-VM-${p.id.substring(0,5).toUpperCase()}`,
      p.wellnessBrand || 'FATAFAT',
      p.category,
      p.originalPrice,
      p.price,
      p.inStock ? 'In Stock' : 'Out of Stock',
      p.deliveryTime
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fatafat_products_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredProducts.length} products to CSV!`, 'success');
  };

  // Action: Validate CSV Import
  const handleValidateCSV = () => {
    if (!csvInput.trim()) {
      showToast('Please paste CSV string lines.', 'error');
      return;
    }

    const lines = csvInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      showToast('CSV must contain a header row and at least one data row.', 'error');
      return;
    }

    // Parse header and rows
    const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const dataRows = lines.slice(1);

    const validRows: any[] = [];
    const invalidRows: any[] = [];
    const duplicateSkus: string[] = [];
    const missingFields: string[] = [];

    dataRows.forEach((rowStr, idx) => {
      const cols = rowStr.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 4) {
        invalidRows.push({ row: idx + 2, data: rowStr, reason: 'Insufficient column count' });
        return;
      }

      // Map columns
      const name = cols[0];
      const skuVal = cols[1];
      const brand = cols[2];
      const category = cols[3];
      const price = parseFloat(cols[4] || '0');
      const stock = cols[5] || 'In Stock';

      if (!name || !skuVal || !category || isNaN(price)) {
        invalidRows.push({ row: idx + 2, data: rowStr, reason: 'Missing name, SKU, category, or valid price' });
        if (!name) missingFields.push(`Row ${idx + 2}: Product Name`);
        if (!skuVal) missingFields.push(`Row ${idx + 2}: SKU`);
        if (!category) missingFields.push(`Row ${idx + 2}: Category`);
        return;
      }

      // Check duplicate SKUs against database
      const isDuplicate = products.some(p => p.wellnessSku === skuVal);
      if (isDuplicate) {
        duplicateSkus.push(skuVal);
      }

      validRows.push({
        name,
        wellnessSku: skuVal,
        wellnessBrand: brand || 'FATAFAT',
        category,
        price,
        originalPrice: price,
        inStock: stock.toLowerCase() === 'in stock',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80',
        description: 'Imported bulk product.'
      });
    });

    setImportReport({
      validRows,
      invalidRows,
      duplicateSkus,
      missingFields
    });
  };

  // Action: Commit CSV Import
  const handleCommitImport = async () => {
    if (!importReport || importReport.validRows.length === 0) return;

    let successCount = 0;
    for (const row of importReport.validRows) {
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row)
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    showToast(`Successfully imported ${successCount} products!`, 'success');
    setShowImportModal(false);
    setCsvInput('');
    setImportReport(null);
    await refreshProducts();
  };

  return (
    <div className="space-y-6 text-xs text-left">
      
      {/* Header toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <h3 className="text-xl font-serif font-black text-zinc-900">Products</h3>
          <p className="text-xs text-zinc-500 font-medium">Manage e-commerce products, stock allocations and details.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Upload className="h-4 w-4" /> Import Products
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-4 w-4" /> Export Products
          </button>
          <button
            onClick={() => router.push('/admin/products/new')}
            className="px-4 py-2 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter toolbar grid */}
      <div className="bg-white border border-zinc-200/20 p-5 rounded-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 shadow-sm">
        
        {/* Search */}
        <div className="space-y-1 md:col-span-2">
          <label className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] block">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search products, SKU, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-brand-burgundy/40"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>

        {/* Store Type */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] block">Store Type</label>
          <select
            value={storeType}
            onChange={(e) => setStoreType(e.target.value)}
            className="w-full p-2 border rounded-xl bg-[#FAF9F6] focus:outline-none"
          >
            <option value="All">All Store Fronts</option>
            <option value="normal">Normal Store Catalog</option>
            <option value="wellness">Wellness 18+ Catalog</option>
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] block">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 border rounded-xl bg-[#FAF9F6] focus:outline-none uppercase text-[9px] font-bold"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] block">Brand</label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full p-2 border rounded-xl bg-[#FAF9F6] focus:outline-none"
          >
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-400 uppercase tracking-widest text-[9px] block">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full p-2 border rounded-xl bg-[#FAF9F6] focus:outline-none"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Main product catalog list table */}
      <div className="bg-white border border-zinc-200/20 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b text-[9px] font-bold uppercase tracking-wider text-zinc-400 select-none">
              <th className="p-3.5">Image</th>
              <th className="p-3.5">Product Name</th>
              <th className="p-3.5">SKU / ID</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Brand</th>
              <th className="p-3.5">Price</th>
              <th className="p-3.5 text-center">Stock</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-zinc-650">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-12 text-zinc-400 font-medium">
                  No products match the selected search filters.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const skuVal = p.wellnessSku || `SKU-FATAFAT-${p.id.substring(0,5).toUpperCase()}`;
                const brandVal = p.wellnessBrand || 'FATAFAT';
                const isFeatured = p.rating >= 4.8;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/30 transition-colors">
                    <td className="p-3.5">
                      <div className="h-10 w-10 rounded-xl overflow-hidden border bg-zinc-50">
                        <SafeImage src={p.image} alt={p.name} category={p.category} className="h-full w-full object-cover" />
                      </div>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-zinc-800 text-xs">{p.name}</p>
                      {isFeatured && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-brand-gold/15 text-[#7A6010] text-[8px] font-bold mt-1">
                          ★ Bestseller
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[9px] uppercase tracking-wider text-zinc-450">
                      {skuVal}
                    </td>
                    <td className="p-3.5 font-bold uppercase text-[9px] text-zinc-500">
                      {p.category}
                    </td>
                    <td className="p-3.5 font-medium text-zinc-700">
                      {brandVal}
                    </td>
                    <td className="p-3.5 font-bold text-zinc-800">
                      ₹{p.price} <span className="text-[10px] line-through text-zinc-400">₹{p.originalPrice || p.price}</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                        p.inStock 
                          ? (p.reviewCount < 100 ? 'bg-amber-50 text-amber-700 border border-amber-200/25' : 'bg-green-50 text-emerald-700 border border-emerald-200/25') 
                          : 'bg-red-50 text-red-700 border border-red-200/25'
                      }`}>
                        {p.inStock ? (p.reviewCount < 100 ? 'LOW STOCK' : 'IN STOCK') : 'OUT OF STOCK'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {p.wellnessVerified ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-zinc-100 text-zinc-400 text-[8px] font-bold">
                          DRAFT
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => router.push(`/admin/products/${encodeURIComponent(p.id)}/edit`)}
                          className="p-1 text-zinc-500 hover:text-brand-burgundy transition-colors"
                          title="Edit Product"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateProduct(p)}
                          className="p-1 text-zinc-400 hover:text-zinc-750 transition-colors"
                          title="Duplicate SKU"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleHide(p, !p.inStock)}
                          className="p-1 text-zinc-400 hover:text-zinc-800 transition-colors"
                          title={p.inStock ? 'Hide Product' : 'Make Active'}
                        >
                          {p.inStock ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
                          title="Delete / Archive Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-3xl p-6 w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-serif font-extrabold text-zinc-800 flex items-center gap-1.5">
                <Upload className="h-5 w-5 text-brand-burgundy" /> Bulk CSV Product Sourcing Import
              </h3>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setCsvInput('');
                  setImportReport(null);
                }} 
                className="p-1.5 hover:bg-zinc-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <label className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">Paste CSV Data String</label>
              <p className="text-[10px] text-zinc-400">Columns: Product Name, SKU, Brand, Category, Price, Stock Status</p>
              
              <textarea
                rows={5}
                placeholder={`Chocolate Velvet Cake, SKU-VM-CHOCO, FATAFAT, cakes, 699, In Stock
Premium Tulip Bouquet, SKU-VM-TULIP, FATAFAT, flowers, 899, In Stock`}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                className="w-full p-3.5 border rounded-2xl bg-zinc-55/5 focus:bg-white focus:outline-none font-mono text-[10px]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleValidateCSV}
                  className="px-6 py-2.5 bg-zinc-800 text-white font-bold uppercase tracking-wider rounded-xl text-[10px]"
                >
                  Validate CSV Rows
                </button>
              </div>

              {/* Import validation reports */}
              {importReport && (
                <div className="bg-zinc-50 border p-4 rounded-2xl space-y-3">
                  <h4 className="font-bold text-zinc-800 border-b pb-1.5 text-xs flex items-center gap-1">
                    <FileText className="h-4 w-4 text-brand-burgundy" /> Validation Summary Report
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-white border rounded-xl">
                      <span className="text-xl font-serif font-black text-emerald-600 block">{importReport.validRows.length}</span>
                      <span className="text-[8px] font-bold text-zinc-450 uppercase">Valid Rows</span>
                    </div>
                    <div className="p-3 bg-white border rounded-xl">
                      <span className="text-xl font-serif font-black text-red-500 block">{importReport.invalidRows.length}</span>
                      <span className="text-[8px] font-bold text-zinc-450 uppercase">Invalid Rows</span>
                    </div>
                    <div className="p-3 bg-white border rounded-xl">
                      <span className="text-xl font-serif font-black text-amber-500 block">{importReport.duplicateSkus.length}</span>
                      <span className="text-[8px] font-bold text-zinc-450 uppercase">Duplicate SKUs</span>
                    </div>
                    <div className="p-3 bg-white border rounded-xl">
                      <span className="text-xl font-serif font-black text-zinc-500 block">{importReport.missingFields.length}</span>
                      <span className="text-[8px] font-bold text-zinc-450 uppercase">Missing Values</span>
                    </div>
                  </div>

                  {importReport.invalidRows.length > 0 && (
                    <div className="space-y-1 text-red-650 bg-red-50/50 p-3 rounded-xl border border-red-200/25">
                      <p className="font-bold">Errors found:</p>
                      {importReport.invalidRows.map((err, i) => (
                        <p key={i} className="text-[10px]">• Row {err.row}: {err.reason}</p>
                      ))}
                    </div>
                  )}

                  {importReport.validRows.length > 0 && (
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleCommitImport}
                        className="px-6 py-2.5 bg-brand-burgundy text-white hover:bg-brand-burgundy-dark font-serif font-bold uppercase tracking-wider rounded-xl text-[10px] shadow"
                      >
                        Confirm Import ({importReport.validRows.length} items)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
