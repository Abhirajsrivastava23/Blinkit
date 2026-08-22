'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Info, Search, Filter, EyeOff, HelpCircle, ChevronDown, Check, 
  Globe, ShieldAlert, Sparkles, LogIn, Lock, CheckCircle2, ShieldOff, Mail, X
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import { PRODUCTS as fallbackProducts, Product } from '../../data/mockData';
import { ProductGridSkeleton } from '../../components/LoadingSkeleton';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const BRANDS = ['All', 'Durex', 'KamaSutra', 'Skore', 'Manforce', 'Clean & Dry'];
const CATEGORIES = ['All', 'Condoms', 'Lubricants', 'Intimate Care'];
const CONDOM_TYPES = ['All', 'Smooth', 'Dotted', 'Ribbed', 'Ribbed & Dotted'];
const FLAVORS = ['All', 'Chocolate', 'Strawberry'];

export default function WellnessPage() {
  const router = useRouter();
  const { user, loginWithGoogle, updateWellnessStatus } = useAuth();
  const { products, refreshProducts } = useProducts();
  const { showToast } = useToast();
  const PRODUCTS = products.length > 0 ? products : fallbackProducts;

  // Wellness login modal states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);

  // Access Enter bypass state
  const [hasEntered, setHasEntered] = useState(false);

  // Filter States for approved catalog
  const [searchVal, setSearchVal] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCondomType, setSelectedCondomType] = useState('All');
  const [selectedFlavor, setSelectedFlavor] = useState('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState('recommended');
  
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Age verification settings toggle simulated
  const [ageVerificationRequired, setAgeVerificationRequired] = useState(true);
  const [verificationIDType, setVerificationIDType] = useState('Aadhaar Card');
  const [verificationNumber, setVerificationNumber] = useState('');

  // 1. Identify authorization state from session context
  const isGoogleAuthenticated = user && user.googleProviderId && user.email !== 'guest@fatafat.com';
  const wellnessStatus = user?.wellnessAccessStatus || 'NOT_REQUESTED';

  // 2. Fetch server user details on load
  useEffect(() => {
    if (user?.email && user.email !== 'guest@fatafat.com') {
      // Sync status from server users table to local session
      const fetchServerUser = async () => {
        try {
          const res = await fetch('/api/users/list');
          if (res.ok) {
            const list = await res.json();
            const matched = list.find((u: any) => u.email === user.email);
            if (matched && matched.wellnessAccessStatus !== user.wellnessAccessStatus) {
              updateWellnessStatus(matched.wellnessAccessStatus, {
                wellnessApprovedAt: matched.wellnessApprovedAt,
                wellnessApprovedBy: matched.wellnessApprovedBy,
                wellnessRequestId: matched.wellnessRequestId
              });
            }
          }
        } catch (e) {}
      };
      fetchServerUser();
    }
  }, [user?.email, updateWellnessStatus]);

  // Load and filter wellness products when entered & approved
  useEffect(() => {
    if (wellnessStatus !== 'APPROVED' || !hasEntered) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      // Server-side GET request simulation with Auth header security
      const fetchWellnessData = async () => {
        try {
          const res = await fetch(`/api/products?wellness=true`, {
            headers: {
              'x-user-email': user?.email || ''
            }
          });
          if (res.ok) {
            const data = await res.json();
            let result = data.filter((p: Product) => p.category === 'wellness');

            // 1. Search Query
            if (searchVal.trim()) {
              const query = searchVal.toLowerCase().trim();
              result = result.filter((p: Product) =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                p.wellnessBrand?.toLowerCase().includes(query) ||
                p.wellnessType?.toLowerCase().includes(query)
              );
            }

            // 2. Brand Filter
            if (selectedBrand !== 'All') {
              result = result.filter((p: Product) => p.wellnessBrand === selectedBrand);
            }

            // 3. Category Filter
            if (selectedCategory !== 'All') {
              result = result.filter((p: Product) => p.wellnessType === selectedCategory);
            }

            // 4. Condom Type Filter
            if (selectedCondomType !== 'All') {
              result = result.filter((p: Product) => p.wellnessTexture?.toLowerCase().includes(selectedCondomType.toLowerCase()));
            }

            // 5. Flavor Filter
            if (selectedFlavor !== 'All') {
              result = result.filter((p: Product) => p.wellnessFlavor === selectedFlavor);
            }

            // 6. Price range
            result = result.filter((p: Product) => p.price >= priceRange[0] && p.price <= priceRange[1]);

            // Sort logic
            if (sortBy === 'price_low_high') {
              result.sort((a: Product, b: Product) => a.price - b.price);
            } else if (sortBy === 'price_high_low') {
              result.sort((a: Product, b: Product) => b.price - a.price);
            } else if (sortBy === 'rating') {
              result.sort((a: Product, b: Product) => b.rating - a.rating);
            }

            setFilteredProducts(result);
          } else {
            // Server returned 403 Forbidden!
            setFilteredProducts([]);
            showToast('Security Error: Failed to retrieve catalog. 403 Forbidden.', 'error');
          }
        } catch (e) {
          setFilteredProducts([]);
        } finally {
          setLoading(false);
        }
      };

      fetchWellnessData();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchVal, selectedBrand, selectedCategory, selectedCondomType, selectedFlavor, priceRange, sortBy, wellnessStatus, hasEntered, user?.email]);

  // Handler: Google Login Submission
  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail || !googleName) {
      showToast('Please enter both name and email.', 'error');
      return;
    }
    setIsSubmittingGoogle(true);

    const mockGoogleId = 'google-' + Math.floor(100000 + Math.random() * 900000);
    const mockProfileImg = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60';

    try {
      // 1. Sync User database on server
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleEmail.trim(),
          name: googleName.trim(),
          googleProviderId: mockGoogleId,
          profileImage: mockProfileImg,
          wellnessAccessStatus: 'NOT_REQUESTED'
        })
      });

      if (res.ok) {
        // 2. Update local AuthContext session
        await loginWithGoogle({
          googleProviderId: mockGoogleId,
          email: googleEmail.trim(),
          name: googleName.trim(),
          profileImage: mockProfileImg
        });

        showToast('Google account verified successfully.', 'success');
        setShowGoogleModal(false);
      }
    } catch (err) {
      showToast('Authentication check failed.', 'error');
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  // Handler: Request Access
  const handleRequestAccess = async () => {
    if (!user || !user.email) return;

    if (ageVerificationRequired && !verificationNumber) {
      showToast('Please enter your document ID number for age validation.', 'error');
      return;
    }

    try {
      const mockReqId = 'WR-' + Math.floor(1000 + Math.random() * 9000);
      const res = await fetch('/api/users/update-wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          wellnessAccessStatus: 'PENDING_REVIEW',
          requestId: mockReqId,
          reason: `Auto verification via ${verificationIDType}: ${verificationNumber || 'Auto-checked'}`
        })
      });

      if (res.ok) {
        updateWellnessStatus('PENDING_REVIEW', {
          wellnessRequestId: mockReqId
        });
        showToast('Access request submitted. Under review by Super Admin.', 'success');
      }
    } catch (err) {
      showToast('Request submission error.', 'error');
    }
  };

  // ====================================================
  // VIEW RENDERER BRIDGES
  // ====================================================

  // STATE A: NOT LOGGED IN WITH GOOGLE
  if (!isGoogleAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-950 via-[#050508] to-black opacity-95" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-[#DFBA5E]/15 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-[#1C1C24] border border-[#DFBA5E]/20 text-[#DFBA5E] rounded-full">
              <ShieldAlert className="h-10 w-10 animate-pulse text-[#DFBA5E]" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-black tracking-widest text-white">
              FATAFAT <span className="text-[#DFBA5E]">WELLNESS</span>
            </h1>
            <p className="text-[9px] tracking-[0.25em] text-[#DFBA5E] font-black uppercase">
              Age-Restricted Portal 18+
            </p>
          </div>

          <p className="text-zinc-400 leading-relaxed text-[11px] font-medium">
            Age-restricted products are available only to approved customers. Submitting authentication is required to access the catalog.
          </p>

          <button
            onClick={() => {
              window.location.href = '/login?callback=/wellness';
            }}
            className="w-full py-3.5 bg-[#6B1D2F] hover:bg-[#8F3A44] text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow transition-all hover:scale-102 flex items-center justify-center gap-2 text-[10px] cursor-pointer"
          >
            <Globe className="h-4.5 w-4.5" /> Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // STATE B: STATUS = NOT_REQUESTED
  if (wellnessStatus === 'NOT_REQUESTED') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-[#DFBA5E]/15 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="h-14 w-14 bg-zinc-800/40 text-brand-gold rounded-full flex items-center justify-center mx-auto border border-zinc-750">
            <Lock className="h-6 w-6 text-[#DFBA5E]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Wellness 18+ Access</h3>
            <p className="text-[10px] text-[#DFBA5E] font-extrabold">Your Google account ({user?.email}) is verified.</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            To view age-restricted wellness products, submit an access request to the system administrators.
          </p>

          {/* Configurable simulated Age Verification Inputs */}
          <div className="bg-[#1C1C24] p-3.5 rounded-2xl border border-zinc-850 text-left space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[9px] font-extrabold text-[#DFBA5E] uppercase tracking-wider">Configure Age Document Check</span>
              <input
                type="checkbox"
                checked={ageVerificationRequired}
                onChange={(e) => setAgeVerificationRequired(e.target.checked)}
                className="h-3.5 w-3.5 text-brand-burgundy rounded focus:ring-brand-burgundy bg-zinc-900 border-zinc-750"
              />
            </label>

            {ageVerificationRequired && (
              <div className="space-y-2">
                <select
                  value={verificationIDType}
                  onChange={(e) => setVerificationIDType(e.target.value)}
                  className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] text-white focus:outline-none focus:border-wellness-bronze"
                >
                  <option value="Aadhaar Card">Aadhaar Card (18+ check)</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Passport">Passport</option>
                </select>

                <input
                  type="text"
                  placeholder="Enter Document number..."
                  value={verificationNumber}
                  onChange={(e) => setVerificationNumber(e.target.value)}
                  className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] text-white focus:outline-none focus:border-wellness-bronze"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleRequestAccess}
            className="w-full py-3.5 bg-[#6B1D2F] hover:bg-[#8F3A44] text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow text-[10px]"
          >
            ✉ REQUEST ACCESS
          </button>
        </div>
      </div>
    );
  }

  // STATE C: STATUS = PENDING_REVIEW
  if (wellnessStatus === 'PENDING_REVIEW') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-[#DFBA5E]/15 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="h-14 w-14 bg-amber-950/20 border border-amber-900/35 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Under Review</h3>
            <p className="text-[9px] text-[#DFBA5E] font-black uppercase tracking-wider">Ticket ID: {user?.wellnessRequestId}</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            Your request is currently under review by Super Admin. You will be granted catalog access once approved.
          </p>

          <button 
            onClick={() => router.push('/')} 
            className="w-full py-3 bg-[#1C1C24] hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-wider text-[9px]"
          >
            ← Back to Storefront
          </button>
        </div>
      </div>
    );
  }

  // STATE D: STATUS = REJECTED
  if (wellnessStatus === 'REJECTED') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-red-950/25 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="h-14 w-14 bg-red-950/20 border border-red-900/40 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldOff className="h-6 w-6 text-red-500" />
          </div>

          <div className="space-y-1">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Access Denied</h3>
            <p className="text-[9px] text-red-400 font-extrabold uppercase">Verification Rejected</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            Your Wellness access request was not approved by administration. Internal details are protected.
          </p>

          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/')} 
              className="flex-grow py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-wider text-[9px]"
            >
              Back to Store
            </button>
            <button 
              onClick={() => showToast('Opening support portal...', 'info')} 
              className="px-4 py-3 bg-[#6B1D2F] hover:bg-[#8F3A44] text-white rounded-xl font-bold uppercase tracking-wider text-[9px]"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE E: STATUS = SUSPENDED
  if (wellnessStatus === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-red-950/25 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="h-14 w-14 bg-red-950/20 border border-red-900/45 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldOff className="h-6 w-6 text-red-500" />
          </div>

          <div className="space-y-1">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Account Suspended</h3>
            <p className="text-[9px] text-red-400 font-extrabold uppercase">Wellness Access Locked</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            Wellness access is currently unavailable for this account. Contact support to appeal.
          </p>

          <button 
            onClick={() => router.push('/')} 
            className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-wider text-[9px]"
          >
            ← Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  // STATE F: APPROVED BUT HAS NOT CLICKED "ENTER WELLNESS"
  if (wellnessStatus === 'APPROVED' && !hasEntered) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-emerald-950/25 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="h-14 w-14 bg-emerald-950/20 border border-emerald-900/45 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-bounce" />
          </div>

          <div className="space-y-1">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Access Approved</h3>
            <p className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest">wellness access status verified</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            Welcome back! Your request was approved by {user?.wellnessApprovedBy || 'Admin'}. Proceed to enter the wellness zone.
          </p>

          <button
            onClick={() => setHasEntered(true)}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow text-[10px] hover:scale-102 transition-all"
          >
            🚀 ENTER WELLNESS
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // STATE G: APPROVED & CLICKED "ENTER WELLNESS" -> RENDER CATALOG
  // ====================================================
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0E] text-wellness-text font-sans selection:bg-[#DFBA5E]/20 select-none">
      <Header />
      
      {/* 4. MAIN WELLNESS CONTENT */}
      <main className="flex-grow py-8 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-8 text-left">
        
        {/* Banner header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-wellness-dark border border-wellness-bronze/20 p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-[#DFBA5E]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1.5 z-10">
            <span className="text-[9px] bg-wellness-bronze text-zinc-950 font-black px-2 py-0.5 rounded uppercase tracking-widest">
              18+ Verified Portal
            </span>
            <h2 className="text-xl font-serif font-black text-white leading-none">Intimacy & Sexual Wellbeing</h2>
            <p className="text-xs text-wellness-muted font-medium">Discreet packaging. Free delivery options. Delivered Fatafat.</p>
          </div>

          <div className="text-[10px] text-wellness-muted font-bold tracking-widest uppercase border border-wellness-bronze/30 px-3 py-1.5 rounded-xl bg-wellness-black select-none z-10">
            🛡️ SECURED PACKAGING & BILLING
          </div>
        </div>

        {/* Live Search and filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar filters (Desktop only) */}
          <aside className="space-y-6 hidden lg:block bg-wellness-dark border border-wellness-bronze/10 p-5 rounded-3xl h-fit">
            <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
              <span className="font-serif font-black text-white uppercase tracking-wider text-xs">Catalog Filter</span>
              <button 
                onClick={() => {
                  setSelectedBrand('All');
                  setSelectedCategory('All');
                  setSelectedFlavor('All');
                  setSelectedCondomType('All');
                }}
                className="text-[9px] text-[#DFBA5E] hover:underline uppercase font-bold"
              >
                Clear all
              </button>
            </div>

            {/* Subcategories */}
            <div className="space-y-2 text-left">
              <label className="text-[8px] font-extrabold uppercase tracking-widest text-[#DFBA5E] block">Product Category</label>
              <div className="flex flex-col gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                      selectedCategory === cat 
                        ? 'bg-wellness-bronze text-zinc-950 font-black shadow' 
                        : 'hover:bg-wellness-card text-wellness-muted'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Brands */}
            <div className="space-y-2 text-left">
              <label className="text-[8px] font-extrabold uppercase tracking-widest text-[#DFBA5E] block">Brand Choice</label>
              <div className="flex flex-col gap-1.5">
                {BRANDS.map((brnd) => (
                  <button
                    key={brnd}
                    onClick={() => setSelectedBrand(brnd)}
                    className={`text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                      selectedBrand === brnd 
                        ? 'bg-wellness-bronze text-zinc-950 font-black shadow' 
                        : 'hover:bg-wellness-card text-wellness-muted'
                    }`}
                  >
                    {brnd}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product grid content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Topbar sort filter inputs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-[11px] text-wellness-muted font-bold uppercase tracking-wider">
                Showing {filteredProducts.length} Premium Essentials
              </p>
              
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="p-2.5 bg-wellness-dark border border-wellness-bronze/20 rounded-xl text-[10px] text-white focus:outline-none focus:border-wellness-bronze font-bold uppercase tracking-wider"
                >
                  <option value="recommended">Sort: Recommended</option>
                  <option value="price_low_high">Price: Low to High</option>
                  <option value="price_high_low">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <ProductGridSkeleton />
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="relative">
                    <ProductCard product={p} />
                    <span className="absolute top-2 left-2 z-10 bg-red-950 border border-red-800 text-red-400 text-[8px] font-black px-1 rounded shadow-sm">
                      18+ ONLY
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-wellness-dark border border-wellness-bronze/10 p-12 text-center rounded-3xl text-wellness-muted space-y-2">
                <EyeOff className="h-8 w-8 mx-auto text-wellness-bronze/40" />
                <p className="font-bold text-white text-xs">No matching wellness items found</p>
                <p className="text-[10px]">Try updating your brand or category filter query.</p>
              </div>
            )}

          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
