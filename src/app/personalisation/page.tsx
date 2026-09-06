'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Camera, PenTool, Gift, Award, Clock, ShieldCheck, 
  ChevronRight, ArrowRight, Heart, CheckCircle2, MessageSquare, 
  HelpCircle, ChevronDown, Check, ArrowLeft, Star, ShoppingBag, 
  Eye, Upload, X, AlertCircle, RefreshCw, Send, Calendar, DollarSign, Search
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SafeImage from '../../components/SafeImage';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useProducts } from '../../context/ProductContext';
import { PRODUCTS as fallbackProducts, Product } from '../../data/mockData';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

export default function PersonalisationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { products } = useProducts();
  const PRODUCTS = products.length > 0 ? products : fallbackProducts;

  // Active Tab: 'EXISTING_PRODUCT' vs 'UNLISTED_PRODUCT'
  const [activeTab, setActiveTab] = useState<'EXISTING_PRODUCT' | 'UNLISTED_PRODUCT'>('EXISTING_PRODUCT');

  // Tab A: Existing Product Personalisation State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('1.0 kg');
  const [selectedType, setSelectedType] = useState('Eggless');
  const [selectedFlavour, setSelectedFlavour] = useState('Dutch Chocolate Truffle');
  const [personalisationType, setPersonalisationType] = useState('Cake Inscription / Name');
  const [customMessage, setCustomMessage] = useState('Happy Birthday Priya! ❤️');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Tab B: Unlisted Product Request State
  const [unlistedTitle, setUnlistedTitle] = useState('');
  const [unlistedDescription, setUnlistedDescription] = useState('');
  const [unlistedQuantity, setUnlistedQuantity] = useState(1);
  const [unlistedPreferredDate, setUnlistedPreferredDate] = useState('');
  const [unlistedPreferredTime, setUnlistedPreferredTime] = useState('Evening (5 PM - 8 PM)');
  const [unlistedBudget, setUnlistedBudget] = useState('');
  const [unlistedSpecialInstructions, setUnlistedSpecialInstructions] = useState('');
  const [unlistedReferenceImageUrl, setUnlistedReferenceImageUrl] = useState<string | null>(null);
  const [isUploadingUnlistedImage, setIsUploadingUnlistedImage] = useState(false);

  // Contact Info (Shared)
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fileInputRefA = useRef<HTMLInputElement | null>(null);
  const fileInputRefB = useRef<HTMLInputElement | null>(null);

  // Prefill contact if user is logged in
  useEffect(() => {
    if (user) {
      if (user.name && !customerName) setCustomerName(user.name);
      if (user.email && !customerEmail) setCustomerEmail(user.email);
      if (user.phone && !customerMobile) setCustomerMobile(user.phone);
    }
  }, [user]);

  // Filter products for the existing product picker across canonical catalog
  const filteredProducts = useMemo(() => {
    const baseList = PRODUCTS.filter(p => {
      const cat = (p.category || '').toLowerCase();
      return !cat.includes('wellness');
    });

    const q = productSearch.trim().toLowerCase();
    if (!q) {
      return baseList.slice(0, 18);
    }

    const terms = q.split(/\s+/).filter(Boolean);

    return baseList.filter(p => {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const subCat = (p.subCategory || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const shortDesc = (p.shortDescription || '').toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
      const occasions = Array.isArray(p.occasions) ? p.occasions.join(' ').toLowerCase() : '';
      const id = (p.id || '').toLowerCase();

      const searchableText = `${name} ${cat} ${subCat} ${desc} ${shortDesc} ${tags} ${occasions} ${id}`;
      return terms.every(t => searchableText.includes(t));
    });
  }, [PRODUCTS, productSearch]);

  const selectedProduct = useMemo(() => {
    if (selectedProductId) {
      const found = PRODUCTS.find(p => p.id === selectedProductId);
      if (found) return found;
    }
    return filteredProducts[0] || PRODUCTS[0] || null;
  }, [PRODUCTS, selectedProductId, filteredProducts]);

  // Handle Photo Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isUnlisted = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isUnlisted) setIsUploadingUnlistedImage(true);
    else setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', isUnlisted ? 'unlisted-reference' : 'personalisation-photo');

      const res = await fetch('/api/custom-requests/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.imageUrl) {
        if (isUnlisted) {
          setUnlistedReferenceImageUrl(data.imageUrl);
        } else {
          setUploadedImageUrl(data.imageUrl);
        }
        showToast('Photo uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to upload photo.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading image.', 'error');
    } finally {
      if (isUnlisted) setIsUploadingUnlistedImage(false);
      else setIsUploadingImage(false);
    }
  };

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast('Please enter your full name.', 'error');
      return;
    }
    if (!customerMobile.trim() || customerMobile.trim().length < 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    if (activeTab === 'UNLISTED_PRODUCT' && !unlistedTitle.trim()) {
      showToast('Please describe what product you want us to arrange.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = activeTab === 'EXISTING_PRODUCT' ? {
        requestType: 'EXISTING_PRODUCT',
        productId: selectedProduct?.id || undefined,
        productName: selectedProduct?.name || 'Celebration Personalised Cake',
        quantity,
        variant: selectedSize,
        flavour: selectedFlavour,
        personalisationType,
        personalisationMessage: customMessage.trim() || undefined,
        uploadedImageUrl: uploadedImageUrl || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        customerName: customerName.trim(),
        mobile: customerMobile.trim(),
        email: customerEmail.trim() || undefined,
        budget: selectedProduct?.price ? `₹${selectedProduct.price * quantity}` : undefined
      } : {
        requestType: 'UNLISTED_PRODUCT',
        requestedTitle: unlistedTitle.trim(),
        productName: unlistedTitle.trim(),
        requestedDetails: unlistedDescription.trim() || undefined,
        quantity: unlistedQuantity,
        referenceImageUrl: unlistedReferenceImageUrl || undefined,
        preferredDeliveryDate: unlistedPreferredDate || undefined,
        preferredDeliveryTime: unlistedPreferredTime || undefined,
        budget: unlistedBudget.trim() || undefined,
        specialInstructions: unlistedSpecialInstructions.trim() || undefined,
        customerName: customerName.trim(),
        mobile: customerMobile.trim(),
        email: customerEmail.trim() || undefined
      };

      const res = await fetch('/api/custom-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Your custom request has been submitted to FATAFAT!', 'success');
        setSubmittedRequestId(data.customRequest?.id || 'REQ-SUCCESS');
      } else {
        showToast(data.error || 'Failed to submit request.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error submitting your request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FAQS = [
    {
      q: 'How does personalising an existing product work?',
      a: 'Choose any cake, bouquet, or gift from our catalog, type your custom message, or upload a high-resolution photo. Our chef and florist team prepares it exactly to your specifications with doorstep delivery.'
    },
    {
      q: 'Can I request an unlisted cake, gift, or special hamper?',
      a: 'Yes! Select the "Request a Product Not Listed" option. Tell us what you need, add any reference photos, and our team will review availability, source the finest ingredients, and send you a confirmed quote.'
    },
    {
      q: 'Are the photo prints 100% edible and safe?',
      a: 'Absolutely. We use premium certified food-grade edible sugar sheets printed with natural food coloring. They are 100% vegetarian, delicious, and completely food-safe.'
    },
    {
      q: 'How will I receive the price and pay for my custom order?',
      a: 'Once our operations team reviews your request, we send you a confirmed price. You can view the status and pay directly with 1-click via Razorpay (UPI, Cards, NetBanking) in your My Orders section or through the SMS/Email payment link.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-brand-charcoal font-sans text-xs select-none">
      <Header />

      <main className="flex-grow">
        {/* TOP BREADCRUMB & BACK STRIP */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center justify-between">
            <Breadcrumbs />
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-brand-burgundy transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        </div>

        {/* HERO BANNER */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="relative rounded-[32px] bg-gradient-to-br from-[#6B1D2F] via-[#501422] to-[#360C16] text-white p-8 sm:p-12 overflow-hidden shadow-2xl border border-brand-burgundy/20">
            <div className="absolute inset-0 bg-[radial-gradient(#DFBA5E_0.75px,transparent_0.75px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl space-y-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-brand-gold text-[9px] font-black uppercase tracking-[0.25em]">
                <Sparkles className="h-3 w-3 text-brand-gold animate-pulse" />
                <span>FATAFAT BESPOKE PERSONALISATION STUDIO</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight leading-tight">
                Photo Cakes, Custom Wishes & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-amber-200 to-brand-gold-light">
                  Special Custom Requests
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed max-w-2xl">
                Personalise any celebration product with edible photos, custom calligraphy, and greeting plaques, or request any unlisted bespoke item. Our master chefs and artisans craft every detail fresh.
              </p>
            </div>
          </div>
        </section>

        {/* 2 MAIN OPTION TABS */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white p-2 rounded-2xl border border-zinc-200/80 shadow-sm max-w-2xl mx-auto grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab('EXISTING_PRODUCT')}
              className={`py-3 px-4 rounded-xl font-serif font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'EXISTING_PRODUCT'
                  ? 'bg-brand-burgundy text-white shadow-md'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Personalise a Product</span>
            </button>

            <button
              onClick={() => setActiveTab('UNLISTED_PRODUCT')}
              className={`py-3 px-4 rounded-xl font-serif font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'UNLISTED_PRODUCT'
                  ? 'bg-brand-burgundy text-white shadow-md'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <Gift className="h-3.5 w-3.5" />
              <span>Request Custom / Unlisted</span>
            </button>
          </div>
        </section>

        {/* TAB CONTENT */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          
          {submittedRequestId ? (
            /* SUCCESS CONFIRMATION SCREEN */
            <div className="max-w-xl mx-auto bg-white border border-emerald-200/80 rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-5">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 block">
                  Request Received Successfully
                </span>
                <h3 className="text-xl font-serif font-black text-zinc-900">
                  We&apos;re On It!
                </h3>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed max-w-md mx-auto">
                  Your customisation request <strong className="text-brand-burgundy">#{submittedRequestId}</strong> has been sent to our culinary & operations team.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Customer:</span>
                  <span className="font-bold text-zinc-800">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Mobile Contact:</span>
                  <span className="font-bold text-zinc-800">{customerMobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Status:</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold text-[10px]">
                    Under Review
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/account/orders"
                  className="px-6 py-3 bg-brand-burgundy text-white font-serif font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-brand-burgundy-dark transition-all"
                >
                  Track in My Orders
                </Link>
                <button
                  onClick={() => {
                    setSubmittedRequestId(null);
                    setCustomMessage('');
                    setUploadedImageUrl(null);
                    setUnlistedTitle('');
                    setUnlistedDescription('');
                  }}
                  className="px-6 py-3 bg-zinc-100 text-zinc-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-all"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : activeTab === 'EXISTING_PRODUCT' ? (
            /* TAB A: PERSONALISE EXISTING PRODUCT */
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Form Column (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Select Product Box */}
                <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-serif font-black text-sm text-zinc-900 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-brand-burgundy" /> 1. Select Product to Personalise
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-bold">Step 1 of 3</span>
                  </div>

                  {/* Selected Product Banner */}
                  {selectedProduct && (
                    <div className="p-3 bg-brand-burgundy/5 border border-brand-burgundy/20 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-brand-burgundy/20">
                          <SafeImage 
                            src={selectedProduct.image} 
                            alt={selectedProduct.name} 
                            category={selectedProduct.category} 
                            className="h-full w-full object-cover" 
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 bg-brand-burgundy text-white rounded">
                              {selectedProduct.category || 'Celebration Cake'}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-0.5">
                              <Check className="h-3 w-3" /> Selected
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-zinc-900 truncate mt-0.5">{selectedProduct.name}</h4>
                          <span className="font-black text-xs text-brand-burgundy">₹{selectedProduct.price}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Bar for products */}
                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search chocolate, truffle, cake, pastry, pineapple, gifts..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch('')}
                          className="absolute right-2.5 p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-200/50"
                          title="Clear search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Filter Tags / Suggestions */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider shrink-0 text-[8px]">Quick Filters:</span>
                      {[
                        { label: '🍫 Chocolate', q: 'Chocolate' },
                        { label: '🎂 Truffle', q: 'Truffle' },
                        { label: '🍰 Cakes', q: 'Cake' },
                        { label: '🧁 Pastries', q: 'Pastry' },
                        { label: '🍍 Pineapple', q: 'Pineapple' },
                        { label: '❤️ Red Velvet', q: 'Red Velvet' },
                        { label: '🎁 Hampers', q: 'Gifts' }
                      ].map(item => (
                        <button
                          key={item.q}
                          type="button"
                          onClick={() => setProductSearch(item.q)}
                          className={`px-2 py-0.5 rounded-lg border shrink-0 transition-colors font-semibold ${
                            productSearch.toLowerCase() === item.q.toLowerCase()
                              ? 'bg-brand-burgundy text-white border-brand-burgundy'
                              : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Results / Product Grid Picker */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold">
                      <span>
                        {productSearch ? `Found ${filteredProducts.length} matching products:` : `Available Celebration Catalog (${filteredProducts.length}):`}
                      </span>
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch('')}
                          className="text-brand-burgundy hover:underline"
                        >
                          View All
                        </button>
                      )}
                    </div>

                    {filteredProducts.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                        {filteredProducts.map((p) => {
                          const isSelected = selectedProduct?.id === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedProductId(p.id)}
                              className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-1.5 relative ${
                                isSelected
                                  ? 'border-brand-burgundy bg-brand-burgundy/5 ring-2 ring-brand-burgundy shadow-sm'
                                  : 'border-zinc-200/80 bg-[#FAF9F6] hover:bg-white hover:border-zinc-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 h-5 w-5 bg-brand-burgundy text-white rounded-full flex items-center justify-center shadow-xs">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                              <div className="h-20 w-full rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-100">
                                <SafeImage src={p.image} alt={p.name} category={p.category} className="h-full w-full object-cover" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 block line-clamp-1">
                                  {p.category || 'Celebration Cake'}
                                </span>
                                <p className="font-bold text-[11px] text-zinc-900 line-clamp-1 leading-snug">{p.name}</p>
                                <span className="font-black text-xs text-brand-burgundy">₹{p.price}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 space-y-2">
                        <AlertCircle className="h-8 w-8 text-zinc-400 mx-auto" />
                        <p className="font-bold text-xs text-zinc-700">No products found matching &ldquo;{productSearch}&rdquo;</p>
                        <p className="text-[10px] text-zinc-400">Try searching for &ldquo;Chocolate&rdquo;, &ldquo;Truffle&rdquo;, &ldquo;Cake&rdquo;, or &ldquo;Pastry&rdquo; or click below:</p>
                        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                          {['Chocolate', 'Truffle', 'Black Forest', 'Red Velvet', 'Pineapple', 'Pastry'].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setProductSearch(tag)}
                              className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-brand-burgundy hover:border-brand-burgundy"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Customisation Specifications Box */}
                <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-serif font-black text-sm text-zinc-900 flex items-center gap-2">
                      <PenTool className="h-4 w-4 text-brand-burgundy" /> 2. Personalisation Details
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-bold">Step 2 of 3</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Quantity</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="h-9 w-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-black text-xs flex items-center justify-center transition-colors"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs text-zinc-900">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="h-9 w-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-black text-xs flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Weight / Size Variant */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Size / Weight</label>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF9F6] border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-burgundy"
                      >
                        <option value="500 gm">500 gm (Serves 4-6)</option>
                        <option value="1.0 kg">1.0 kg (Serves 8-12)</option>
                        <option value="1.5 kg">1.5 kg (Serves 14-18)</option>
                        <option value="2.0 kg">2.0 kg (Serves 20-25)</option>
                        <option value="Standard Combo">Standard Celebration Ensemble</option>
                      </select>
                    </div>

                    {/* Flavour */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Flavour</label>
                      <select
                        value={selectedFlavour}
                        onChange={(e) => setSelectedFlavour(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF9F6] border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-burgundy"
                      >
                        <option value="Dutch Chocolate Truffle">Dutch Chocolate Truffle</option>
                        <option value="Belgian Dark Fantasy">Belgian Dark Fantasy</option>
                        <option value="Velvet Red Romance">Velvet Red Romance</option>
                        <option value="Fresh Seasonal Fruit">Fresh Seasonal Fruit</option>
                        <option value="Black Forest Supreme">Black Forest Supreme</option>
                        <option value="Classic Butterscotch Delight">Classic Butterscotch Delight</option>
                      </select>
                    </div>

                    {/* Dietary Type */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Dietary Preference</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedType('Eggless')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            selectedType === 'Eggless'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                              : 'bg-[#FAF9F6] text-zinc-600 border-zinc-200 hover:bg-white'
                          }`}
                        >
                          🟢 100% Eggless
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedType('With Egg')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            selectedType === 'With Egg'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300'
                              : 'bg-[#FAF9F6] text-zinc-600 border-zinc-200 hover:bg-white'
                          }`}
                        >
                          🟡 Regular (With Egg)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Personalisation Type Selector */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                      Choose Personalisation Element
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { label: 'Cake Inscription / Name', icon: '✍️' },
                        { label: 'Edible Photo Print', icon: '📸' },
                        { label: 'Custom Gifting Plaque', icon: '🏆' }
                      ].map((type) => (
                        <button
                          key={type.label}
                          type="button"
                          onClick={() => setPersonalisationType(type.label)}
                          className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2 ${
                            personalisationType === type.label
                              ? 'bg-brand-burgundy/5 text-brand-burgundy border-brand-burgundy ring-1 ring-brand-burgundy shadow-xs'
                              : 'bg-[#FAF9F6] text-zinc-700 border-zinc-200 hover:bg-white'
                          }`}
                        >
                          <span>{type.icon}</span>
                          <span className="text-[11px]">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                        Custom Cake / Plaque Message
                      </label>
                      <span className="text-[9px] text-zinc-400 font-mono">{customMessage.length}/60 chars</span>
                    </div>
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="e.g. Happy 25th Anniversary Mom & Dad! ❤️"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                    />
                  </div>

                  {/* Photo Upload Box */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                      Upload Custom Photo / Memory (For Edible Photo Print)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRefA}
                      onChange={(e) => handleImageUpload(e, false)}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    {uploadedImageUrl ? (
                      <div className="p-3 bg-white border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl overflow-hidden border border-zinc-200 shrink-0 bg-zinc-100">
                            <img src={uploadedImageUrl} alt="Custom Memory" className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 block">✓ Custom Photo Uploaded</span>
                            <span className="text-[9px] text-zinc-500">Ready for high-definition edible sugar sheet printing</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedImageUrl(null)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRefA.current?.click()}
                        disabled={isUploadingImage}
                        className="w-full py-4 border-2 border-dashed border-zinc-300 hover:border-brand-burgundy rounded-2xl bg-[#FAF9F6] hover:bg-white flex flex-col items-center justify-center gap-1.5 transition-all text-zinc-600 group disabled:opacity-50"
                      >
                        {isUploadingImage ? (
                          <RefreshCw className="h-5 w-5 text-brand-burgundy animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5 text-zinc-400 group-hover:text-brand-burgundy transition-colors" />
                        )}
                        <span className="font-bold text-xs">
                          {isUploadingImage ? 'Uploading High-Res Image...' : 'Click or Drag Photo Here'}
                        </span>
                        <span className="text-[9px] text-zinc-400">JPEG, PNG, WebP up to 10 MB</span>
                      </button>
                    )}
                  </div>

                  {/* Special Instructions */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                      Additional Preparation Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Please deliver before 7 PM and write message in dark chocolate..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                    />
                  </div>
                </div>

                {/* 3. Customer Contact Info */}
                <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-serif font-black text-sm text-zinc-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-burgundy" /> 3. Contact & Delivery Info
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-bold">Step 3 of 3</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Priya Sharma"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Email Address</label>
                      <input
                        type="email"
                        placeholder="priya@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Submit Personalisation Request</span>
                </button>

              </div>

              {/* Right Live Preview Column (5 cols) */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="font-serif font-black text-sm text-brand-burgundy border-b pb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-brand-gold" /> Live Studio Preview
                  </h4>

                  {/* Celebratory Card Simulation */}
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50/60 via-pink-50/40 to-white border border-amber-200/60 p-4 space-y-3">
                    <div className="relative h-44 w-full rounded-xl overflow-hidden bg-zinc-100 border shadow-inner">
                      {uploadedImageUrl ? (
                        <img src={uploadedImageUrl} alt="Custom Memory" className="h-full w-full object-cover" />
                      ) : (
                        <SafeImage 
                          src={selectedProduct?.image} 
                          alt={selectedProduct?.name || 'Product'} 
                          category={selectedProduct?.category} 
                          className="h-full w-full object-cover" 
                        />
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-burgundy/90 text-white font-black text-[8px] uppercase tracking-wider">
                        {personalisationType}
                      </div>
                    </div>

                    {/* Cake Inscription Overlay Box */}
                    {customMessage && (
                      <div className="p-2.5 bg-white/95 backdrop-blur-sm rounded-xl border border-brand-burgundy/20 shadow-xs text-center space-y-0.5">
                        <span className="text-[8px] font-extrabold text-brand-burgundy uppercase tracking-widest block">
                          Handwritten Calligraphy Inscription
                        </span>
                        <p className="font-serif font-black text-zinc-900 text-xs italic">
                          &ldquo;{customMessage}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Summary Specs */}
                    <div className="pt-2 border-t border-zinc-200/60 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Selected Item:</span>
                        <span className="font-bold text-zinc-800 truncate max-w-[180px]">{selectedProduct?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Weight & Dietary:</span>
                        <span className="font-bold text-zinc-800">{selectedSize} • {selectedType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Flavour:</span>
                        <span className="font-bold text-zinc-800">{selectedFlavour}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-black text-sm text-brand-burgundy">
                        <span>Est. Subtotal:</span>
                        <span>₹{(selectedProduct?.price || 499) * quantity}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 text-center font-medium">
                    ⚡ Freshly handcrafted on order and delivered to your doorstep within 12 hours.
                  </p>
                </div>
              </div>

            </form>
          ) : (
            /* TAB B: REQUEST PRODUCT NOT LISTED */
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* Header Callout */}
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-900 block flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-700" /> NOT LISTED ON FATAFAT?
                  </span>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed">
                    Tell us what you need! Whether it&apos;s a specific tiered cake, rare gourmet confectionery, bespoke milestone plaque, or imported luxury items, our team will check availability and send you a confirmed quote.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Title / What do you want */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                      What do you want? *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 3-tier Gold Leaf Fondant Wedding Cake with Fresh Orchids"
                      value={unlistedTitle}
                      onChange={(e) => setUnlistedTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                    />
                  </div>

                  {/* Detailed Description */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                      Detailed Description & Specifications
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe flavors, colors, theme, design elements, dietary requirements, or any specific brand you want..."
                      value={unlistedDescription}
                      onChange={(e) => setUnlistedDescription(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy transition-all"
                    />
                  </div>

                  {/* Reference Image Upload */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                      Upload Reference Image / Design Sketch (Optional)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRefB}
                      onChange={(e) => handleImageUpload(e, true)}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    {unlistedReferenceImageUrl ? (
                      <div className="p-3 bg-white border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl overflow-hidden border border-zinc-200 shrink-0 bg-zinc-100">
                            <img src={unlistedReferenceImageUrl} alt="Reference Sketch" className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 block">✓ Reference Photo Attached</span>
                            <span className="text-[9px] text-zinc-500">Our chefs will review this design</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUnlistedReferenceImageUrl(null)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRefB.current?.click()}
                        disabled={isUploadingUnlistedImage}
                        className="w-full py-4 border-2 border-dashed border-zinc-300 hover:border-brand-burgundy rounded-2xl bg-[#FAF9F6] hover:bg-white flex flex-col items-center justify-center gap-1.5 transition-all text-zinc-600 group disabled:opacity-50"
                      >
                        {isUploadingUnlistedImage ? (
                          <RefreshCw className="h-5 w-5 text-brand-burgundy animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5 text-zinc-400 group-hover:text-brand-burgundy transition-colors" />
                        )}
                        <span className="font-bold text-xs">
                          {isUploadingUnlistedImage ? 'Uploading Photo...' : 'Upload Reference Photo / Sketch'}
                        </span>
                        <span className="text-[9px] text-zinc-400">JPEG, PNG, WebP up to 10 MB</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={unlistedQuantity}
                        onChange={(e) => setUnlistedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy"
                      />
                    </div>

                    {/* Preferred Date */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Preferred Date</label>
                      <input
                        type="date"
                        value={unlistedPreferredDate}
                        onChange={(e) => setUnlistedPreferredDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy"
                      />
                    </div>

                    {/* Budget */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Estimated Budget (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. ₹1,500 - ₹3,000"
                        value={unlistedBudget}
                        onChange={(e) => setUnlistedBudget(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy"
                      />
                    </div>
                  </div>

                  {/* Customer Contact */}
                  <div className="pt-3 border-t border-zinc-200/80 space-y-3">
                    <h4 className="font-serif font-bold text-xs text-zinc-800">Your Contact Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Priya Sharma"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Mobile *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={customerMobile}
                          onChange={(e) => setCustomerMobile(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 block">Email</label>
                        <input
                          type="email"
                          placeholder="priya@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-burgundy"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-brand-burgundy hover:bg-brand-burgundy-dark text-white font-serif font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Submit Custom Product Request</span>
                </button>

              </div>
            </form>
          )}

        </section>

        {/* TRUST BADGES STRIP */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl text-center space-y-1.5 shadow-xs">
              <Award className="h-6 w-6 text-brand-gold mx-auto" />
              <h5 className="font-bold text-xs text-zinc-900">Food-Grade Sugar Sheets</h5>
              <p className="text-[10px] text-zinc-500">100% vegetarian & certified edible prints</p>
            </div>
            <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl text-center space-y-1.5 shadow-xs">
              <Clock className="h-6 w-6 text-brand-burgundy mx-auto" />
              <h5 className="font-bold text-xs text-zinc-900">Handcrafted Fresh</h5>
              <p className="text-[10px] text-zinc-500">Prepared fresh on demand with doorstep delivery</p>
            </div>
            <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl text-center space-y-1.5 shadow-xs">
              <ShieldCheck className="h-6 w-6 text-emerald-600 mx-auto" />
              <h5 className="font-bold text-xs text-zinc-900">Razorpay Verified</h5>
              <p className="text-[10px] text-zinc-500">Secure payments with instant OTP tracking</p>
            </div>
            <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl text-center space-y-1.5 shadow-xs">
              <Sparkles className="h-6 w-6 text-amber-500 mx-auto" />
              <h5 className="font-bold text-xs text-zinc-900">Bespoke Gifting</h5>
              <p className="text-[10px] text-zinc-500">Artisanal calligraphy & keepsake plaques</p>
            </div>
          </div>
        </section>

        {/* FAQS */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 border-t border-zinc-200/60">
          <div className="text-center space-y-1 mb-6">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-burgundy">GOT QUESTIONS?</span>
            <h3 className="text-xl font-serif font-black text-zinc-900">Personalisation & Custom Requests FAQ</h3>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-serif font-bold text-xs text-zinc-900 flex justify-between items-center gap-4"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-zinc-600 font-medium leading-relaxed border-t border-zinc-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
