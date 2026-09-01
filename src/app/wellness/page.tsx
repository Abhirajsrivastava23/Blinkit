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
  const { user, loginWithGoogle, updateWellnessStatus, wellnessPublished, isLoading } = useAuth();
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

  // Terms and conditions state
  const [termsChecked, setTermsChecked] = useState(false);
  const [submittingTerms, setSubmittingTerms] = useState(false);

  // 1. Identify authorization state from session context
  const isGoogleAuthenticated = user && user.googleProviderId && user.email !== 'guest@fatafat.com';
  const wellnessStatus = user?.wellnessAccessStatus || 'NOT_REQUESTED';

  // Publication check redirect
  useEffect(() => {
    if (!isLoading && !wellnessPublished && user?.role !== 'admin') {
      router.push('/');
    }
  }, [isLoading, wellnessPublished, user, router]);

  // 2. Fetch server user details on load
  useEffect(() => {
    if (user?.email && user.email !== 'guest@fatafat.com') {
      const fetchServerUser = async () => {
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const meData = await res.json();
            if (meData.authenticated && meData.user && meData.user.wellnessAccessStatus !== user.wellnessAccessStatus) {
              updateWellnessStatus(meData.user.wellnessAccessStatus, {
                wellnessApprovedAt: meData.user.wellnessApprovedAt,
                wellnessApprovedBy: meData.user.wellnessApprovedBy,
                wellnessRequestId: meData.user.wellnessRequestId
              });
            }
          }
        } catch (e) {}
      };
      fetchServerUser();
    }
  }, [user?.email, updateWellnessStatus, user?.wellnessAccessStatus]);

  // Load and filter wellness products when entered & approved
  useEffect(() => {
    if (wellnessStatus !== 'ACTIVE') {
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
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
            setFilteredProducts([]);
            showToast('Security Error: Failed to retrieve catalog. 403 Forbidden.', 'error');
          }
        } catch {
          setFilteredProducts([]);
        } finally {
          setLoading(false);
        }
      };

      void fetchWellnessData();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchVal, selectedBrand, selectedCategory, selectedCondomType, selectedFlavor, priceRange, sortBy, wellnessStatus, user?.email, showToast]);

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

    if (!user.dob) {
      showToast('Please add your correct Date of Birth to your profile before requesting access to Wellness.', 'error');
      router.push('/account/profile');
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
          reason: `DOB check access request`
        })
      });

      if (res.ok) {
        updateWellnessStatus('PENDING_REVIEW', {
          wellnessRequestId: mockReqId
        });
        showToast('Access request submitted. Under review by Super Admin.', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit request.', 'error');
      }
    } catch (err) {
      showToast('Request submission error.', 'error');
    }
  };

  const handleAcceptTerms = async () => {
    if (!termsChecked) return;
    setSubmittingTerms(true);
    try {
      const res = await fetch('/api/wellness/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsVersion: 'v1' })
      });
      if (res.ok) {
        showToast('Terms accepted successfully! Welcome to Wellness.', 'success');
        window.location.reload();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to accept terms.', 'error');
      }
    } catch (err) {
      showToast('Error accepting terms.', 'error');
    } finally {
      setSubmittingTerms(false);
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

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
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

  // STATE B: STATUS = PROFILE_INCOMPLETE
  if (wellnessStatus === 'PROFILE_INCOMPLETE') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-[#DFBA5E]/15 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="h-14 w-14 bg-zinc-800/40 text-brand-gold rounded-full flex items-center justify-center mx-auto border border-zinc-750">
            <Lock className="h-6 w-6 text-[#DFBA5E]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Profile Incomplete</h3>
            <p className="text-[10px] text-[#DFBA5E] font-extrabold">Date of Birth Required</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            Please add your correct Date of Birth to your profile before requesting access to Wellness.
          </p>

          <button
            onClick={() => router.push('/account/profile')}
            className="w-full py-3.5 bg-[#6B1D2F] hover:bg-[#8F3A44] text-white rounded-xl font-serif font-bold uppercase tracking-wider shadow text-[10px]"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  // STATE C: STATUS = NOT_ELIGIBLE
  if (wellnessStatus === 'NOT_ELIGIBLE') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-red-950/25 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="h-14 w-14 bg-red-950/20 border border-red-900/40 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldOff className="h-6 w-6 text-red-500" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Access Denied</h3>
            <p className="text-[10px] text-red-400 font-extrabold uppercase">Underage Restriction</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            Wellness access is available only to customers aged 18 or above.
          </p>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 bg-[#1C1C24] hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-wider text-[9px]"
          >
            ← Back to Storefront
          </button>
        </div>
      </div>
    );
  }

  // STATE D: STATUS = NOT_REQUESTED
  if (wellnessStatus === 'NOT_REQUESTED') {
    // Determine user's calculated age dynamically for display
    let calculatedAge = 0;
    if (user?.dob) {
      const dobDate = new Date(user.dob);
      const today = new Date();
      calculatedAge = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        calculatedAge--;
      }
    }

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

          {user?.dob && (
            <div className="bg-[#1C1C24] p-3 rounded-2xl border border-zinc-850 text-left text-zinc-450 text-[10px] space-y-1 font-medium">
              <p>🎂 Date of Birth: <span className="text-white font-bold">{user.dob}</span></p>
              <p>🛡️ Calculated Age: <span className="text-[#DFBA5E] font-bold">{calculatedAge} Years Old</span></p>
            </div>
          )}

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

  // STATE E: STATUS = PENDING_REVIEW
  if (wellnessStatus === 'PENDING_REVIEW' || wellnessStatus === 'PENDING') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-[#DFBA5E]/15 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="h-14 w-14 bg-amber-950/20 border border-amber-900/35 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Wellness Access Request Received</h3>
            <p className="text-[9px] text-[#DFBA5E] font-black uppercase tracking-wider">Ticket ID: {user?.wellnessRequestId}</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            Your request has been submitted successfully. Our team will review your eligibility and your Wellness section will be available within approximately 15 minutes after approval.
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

  // STATE F: STATUS = REJECTED
  if (wellnessStatus === 'REJECTED') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-sm w-full bg-[#121217] border border-red-950/25 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="h-14 w-14 bg-red-950/20 border border-red-900/40 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <ShieldOff className="h-6 w-6 text-red-500" />
          </div>

          <div className="space-y-1">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Access Rejected</h3>
            <p className="text-[9px] text-red-400 font-extrabold uppercase">Verification Rejected</p>
          </div>

          <p className="text-zinc-450 leading-relaxed text-[11px] font-medium">
            Your Wellness access request was rejected because you do not meet the minimum age requirement of 18.
          </p>

          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/')} 
              className="flex-grow py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-wider text-[9px]"
            >
              Back to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE G: STATUS = SUSPENDED / REVOKED
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

  // STATE H: APPROVED BUT REQUIRES TERMS ACCEPTANCE
  if (wellnessStatus === 'TERMS_REQUIRED') {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4 select-none font-sans text-xs">
        <div className="absolute inset-0 bg-[#050508]" />
        
        <div className="relative max-w-md w-full bg-[#121217] border border-[#DFBA5E]/15 rounded-3xl p-8 shadow-2xl space-y-6 text-left">
          <div className="h-12 w-12 bg-amber-950/20 border border-[#DFBA5E]/20 text-[#DFBA5E] rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="h-6 w-6 text-[#DFBA5E]" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="font-serif font-black text-sm uppercase tracking-wider text-white">Wellness Terms & Conditions</h3>
            <p className="text-[9px] text-[#DFBA5E] font-extrabold uppercase">Acceptance Required for Activation</p>
          </div>

          <div className="bg-[#1C1C24] p-4 rounded-2xl border border-zinc-850 text-zinc-350 text-[10px] leading-relaxed max-h-48 overflow-y-auto space-y-3 font-medium">
            <p className="font-bold text-white text-[11px]">FATAFAT Wellness Policy Guidelines:</p>
            <p>1. By entering this section, you represent that you are at least 18 years of age. Date of birth details are validated from your official profile.</p>
            <p>2. Wellness items (condoms, lubricants, personal washes) are delivered in highly secure, unbranded packaging to maintain your privacy.</p>
            <p>3. Information and instructions provided are for educational and convenience purposes only. Standard manufacturer directions should always be followed.</p>
            <p>4. All sales of sexual wellbeing products are final and not eligible for return due to hygiene regulations.</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer text-zinc-400 select-none">
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-[#6B1D2F] rounded bg-zinc-900 border-zinc-750 focus:ring-offset-0 focus:ring-0"
            />
            <span className="text-[10px] leading-snug">
              I have read and agree to the Wellness Terms & Conditions.
            </span>
          </label>

          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/')} 
              className="flex-grow py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-wider text-[9px] text-center"
            >
              Cancel
            </button>
            <button 
              onClick={handleAcceptTerms}
              disabled={!termsChecked || submittingTerms}
              className="flex-grow py-3 bg-[#6B1D2F] hover:bg-[#8F3A44] disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold uppercase tracking-wider text-[9px] text-center"
            >
              {submittingTerms ? 'Activating...' : 'Accept & Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // STATE I: APPROVED & ACTIVE -> RENDER CATALOG
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
