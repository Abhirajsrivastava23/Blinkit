'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, MapPin, User, Heart, ShoppingBag, Menu, X, ChevronDown, Sparkles, ArrowRight, Compass } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { PRODUCTS as fallbackProducts, Product } from '../data/mockData';
import CartDrawer from './CartDrawer';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import Logo from './Logo';
import SafeImage from './SafeImage';

const LOCATIONS = [
  'Nawabganj, Unnao',
  'Chandigarh University, Uttar Pradesh'
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { products } = useProducts();
  const PRODUCTS: Product[] = useMemo(() => {
    const list: Product[] = products.length > 0 ? [...products] : [...fallbackProducts];
    const existingIds = new Set(list.map((p) => p.id.toLowerCase()));
    for (const fb of fallbackProducts) {
      if (!existingIds.has(fb.id.toLowerCase())) {
        list.push(fb);
      }
    }
    return list;
  }, [products]);
  
  const { cartItems } = useCart();
  const { wishlist } = useWishlist();
  const { savedAddresses, user, isLoggedIn, logout, wellnessPublished } = useAuth();
  const { showToast } = useToast();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  // Location States
  const [mounted, setMounted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('Nawabganj, Unnao');

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('fatafat_location');
    if (stored) setSelectedLocation(stored);
  }, []);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locSearchQuery, setLocSearchQuery] = useState('');
  
  // Live Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (searchQuery.trim() === '') {
      return [] as Product[];
    }

    const query = searchQuery.toLowerCase();
    const baseQuery = query.trim();

    return PRODUCTS.filter((product) => {
      if (product.category === 'wellness' && !pathname.startsWith('/wellness')) {
        return false;
      }

      const matchesText =
        product.name.toLowerCase().includes(baseQuery) ||
        product.category.toLowerCase().includes(baseQuery) ||
        (product.description && product.description.toLowerCase().includes(baseQuery)) ||
        (product.occasions && product.occasions.some((o) => o.toLowerCase().includes(baseQuery)));
      
      return matchesText;
    }).slice(0, 6);
  }, [PRODUCTS, pathname, searchQuery]);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Close search suggestions and profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchFocused(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const selectSearchResult = (productId: string) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    router.push(pathname.startsWith('/wellness') ? `/wellness/product/${productId}` : `/product/${productId}`);
  };

  // Location selector change handler
  const selectNewLocation = (loc: string) => {
    setSelectedLocation(loc);
    localStorage.setItem('fatafat_location', loc);
    window.dispatchEvent(new Event('fatafat_location_changed'));
    setIsLocationModalOpen(false);
    showToast(`Delivery location updated to ${loc}`, 'success');
  };

  // Browser Geolocation Mock Detection
  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          selectNewLocation('Nawabganj, Unnao');
          showToast('GPS coordinates locked: Nawabganj, Unnao.', 'success');
        },
        (error) => {
          selectNewLocation('Nawabganj, Unnao');
          showToast('GPS access denied. Defaulted to Nawabganj, Unnao.', 'info');
        }
      );
    } else {
      selectNewLocation('Nawabganj, Unnao');
    }
  };

  const isWellness = pathname.startsWith('/wellness');

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/cakes', label: 'Cakes' },
    { href: '/pastries', label: 'Pastries' },
    { href: '/desserts', label: 'Desserts' },
    { href: '/flowers', label: 'Flowers' },
    { href: '/chocolates', label: 'Chocolates' },
    { href: '/gifts', label: 'Gift Hampers' }
  ];

  return (
    <>
      {/* Top Announcement Bar */}
      <div className={`w-full py-2 text-center text-[9px] tracking-[0.2em] uppercase font-bold select-none border-b transition-colors duration-300 ${
        isWellness 
          ? 'bg-wellness-black border-zinc-900 text-wellness-bronze' 
          : 'bg-[#FDFBF7] border-zinc-200/20 text-brand-burgundy'
      }`}>
        <span className="flex items-center justify-center gap-2">
          <Sparkles className="h-3 w-3 text-brand-gold animate-pulse shrink-0" />
          <span>Celebrate. Gift. Indulge. — Handcrafted Celebration Essentials Delivered Fatafat</span>
        </span>
      </div>

      {/* Main Header Container (Compact Quick-Commerce Style) */}
      <header className={`sticky top-0 z-40 w-full transition-all duration-300 border-b backdrop-blur-md ${
        isWellness 
          ? 'bg-wellness-black/95 text-wellness-text border-wellness-bronze/15' 
          : 'bg-[#FDFBF7]/95 text-brand-charcoal border-zinc-200/20 shadow-sm'
      }`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-18 items-center justify-between gap-4 md:gap-6">
            
            {/* 1. Logo & Location Selector Block */}
            <div className="flex items-center gap-4 shrink-0">
              <Link href={isWellness ? '/wellness' : '/'} className="flex items-center group gap-1.5">
                <Logo isWellness={isWellness} size="md" />
                {isWellness && (
                  <span className="text-[9px] font-sans font-black tracking-widest text-wellness-bronze border border-wellness-bronze/30 px-1.5 py-0.5 rounded-lg select-none shrink-0 bg-wellness-bronze/5">
                    WELLNESS 18+
                  </span>
                )}
              </Link>
              
              {/* Location Selector Trigger Button */}
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all max-w-[125px] xs:max-w-[160px] sm:max-w-none shrink min-w-0 ${
                  isWellness 
                    ? 'border-zinc-800 hover:border-wellness-bronze text-wellness-bronze bg-wellness-dark' 
                    : 'border-zinc-200 hover:border-brand-burgundy/40 text-brand-burgundy bg-white shadow-sm'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <div className="text-left leading-none max-w-[80px] hidden sm:block min-w-0">
                  <span className="text-[7px] text-zinc-400 block font-bold uppercase">Delivering to</span>
                  <span className="truncate block font-black mt-0.5">{selectedLocation}</span>
                </div>
                <span className="sm:hidden font-black truncate max-w-[70px] xs:max-w-[95px]">{selectedLocation}</span>
                <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
              </button>
            </div>

            {/* 2. Interactive Search Bar */}
            <div ref={searchRef} className="relative flex-grow max-w-md hidden md:block">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isWellness ? "Search Wellness products..." : "Search cakes, flowers, gifts & more..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs transition-all border outline-none font-medium ${
                      isWellness 
                        ? 'bg-wellness-dark border-zinc-800 text-wellness-text placeholder-wellness-muted focus:border-wellness-bronze' 
                        : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-brand-burgundy'
                    }`}
                  />
                  <Search className={`absolute left-3.5 top-3 h-4 w-4 ${isWellness ? 'text-wellness-bronze' : 'text-zinc-400'}`} />
                </div>
              </form>

              {/* Live Search suggestions dropdown */}
              {isSearchFocused && (searchQuery.trim().length > 0 || searchResults.length > 0) && (
                <div className={`absolute top-full mt-2 w-full rounded-2xl shadow-xl border p-2 z-50 overflow-hidden ${
                  isWellness 
                    ? 'bg-wellness-dark border-wellness-bronze/35 text-wellness-text' 
                    : 'bg-white border-zinc-150/40 text-brand-charcoal'
                }`}>
                  {searchResults.length > 0 ? (
                    <div>
                      <div className="text-[8px] uppercase tracking-widest font-extrabold px-3 py-1.5 text-zinc-400 border-b mb-1">
                        Matching Curated Picks
                      </div>
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => selectSearchResult(product.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                            isWellness ? 'hover:bg-wellness-card' : 'hover:bg-zinc-50'
                          }`}
                        >
                          <SafeImage
                            src={product.image}
                            alt={product.name}
                            category={product.category}
                            className="h-8 w-8 object-cover rounded-lg border border-zinc-100"
                          />
                          <div className="flex-grow min-w-0">
                            <p className="font-bold truncate text-zinc-800">{product.name}</p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">
                              {product.category} • ₹{product.price}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-zinc-450 font-medium">
                      No matching premium items found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Action Links & Shopping Buttons */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              
              {/* Profile Link or Dropdown */}
              {isLoggedIn && user ? (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className={`p-2 rounded-xl transition-colors hidden sm:flex items-center gap-1.5 ${
                      isWellness ? 'hover:bg-wellness-card text-wellness-text' : 'hover:bg-zinc-50 text-zinc-700'
                    } cursor-pointer`}
                    title="Profile Account"
                  >
                    <User className="h-4.5 w-4.5 stroke-[1.5]" />
                    <span className="text-[10px] font-extrabold max-w-[80px] truncate hidden lg:inline">{user.name || 'Account'}</span>
                    <ChevronDown className="h-3 w-3 opacity-60 hidden lg:inline" />
                  </button>
                  
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200/80 rounded-2xl p-2 shadow-xl z-50 text-left font-sans text-xs">
                      <div className="px-3 py-2 border-b border-zinc-50 mb-1">
                        <p className="font-extrabold text-zinc-800 truncate">{user.name}</p>
                        <p className="text-[9px] text-zinc-400 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/account/orders"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex w-full items-center px-3 py-1.5 rounded-xl text-zinc-700 hover:bg-zinc-50 transition-colors font-bold"
                      >
                        My Orders
                      </Link>
                      <Link
                        href="/account/profile"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex w-full items-center px-3 py-1.5 rounded-xl text-zinc-700 hover:bg-zinc-50 transition-colors font-bold"
                      >
                        Account
                      </Link>
                      <Link
                        href="/account/wishlist"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex w-full items-center px-3 py-1.5 rounded-xl text-zinc-700 hover:bg-zinc-50 transition-colors font-bold"
                      >
                        Wishlist
                      </Link>
                      <Link
                        href="/account/addresses"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex w-full items-center px-3 py-1.5 rounded-xl text-zinc-700 hover:bg-zinc-50 transition-colors font-bold"
                      >
                        Addresses
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          logout();
                          showToast('Logged out successfully', 'success');
                          router.push('/');
                        }}
                        className="flex w-full items-center px-3 py-1.5 rounded-xl text-red-650 hover:bg-red-50 transition-colors font-bold text-left cursor-pointer"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className={`px-4.5 py-2 border rounded-full text-xs font-bold transition-all hidden sm:inline-block ${
                    isWellness
                      ? 'border-wellness-bronze/35 text-wellness-bronze hover:bg-wellness-bronze/10'
                      : 'border-brand-burgundy/25 text-brand-burgundy hover:bg-brand-blush'
                  }`}
                >
                  Sign in
                </Link>
              )}
              
              {/* Wishlist Link */}
              <Link
                href="/account/wishlist"
                className={`p-2 rounded-xl transition-colors relative hidden sm:block ${
                  isWellness ? 'hover:bg-wellness-card text-wellness-text' : 'hover:bg-zinc-50 text-zinc-700'
                }`}
                title="My Favorites"
              >
                <Heart className="h-4.5 w-4.5 stroke-[1.5]" />
                {wishlist.length > 0 && (
                  <span className={`absolute top-1 right-1 h-3.5 min-w-3.5 flex items-center justify-center rounded-full text-[7px] font-extrabold px-1 text-white ${
                    isWellness ? 'bg-wellness-bronze' : 'bg-brand-burgundy'
                  }`}>
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* Cart Basket button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className={`p-2 rounded-xl transition-colors relative flex items-center gap-2 border shadow-sm px-3.5 py-2 rounded-xl text-xs font-black ${
                  isWellness 
                    ? 'border-wellness-bronze/30 hover:bg-wellness-card text-wellness-bronze bg-wellness-dark' 
                    : 'border-brand-burgundy/10 hover:bg-brand-blush text-brand-burgundy bg-white'
                }`}
                title="Basket Cart"
              >
                <ShoppingBag className="h-4 w-4 stroke-[2]" />
                <span className="hidden sm:inline" suppressHydrationWarning>{mounted ? `₹${cartSubtotal}` : '₹0'}</span>
                {mounted && cartCount > 0 && (
                  <span className={`h-4 min-w-4 flex items-center justify-center rounded-full text-[8px] font-black px-1 text-white ${
                    isWellness ? 'bg-wellness-bronze text-zinc-950' : 'bg-brand-coral'
                  }`} suppressHydrationWarning>
                    {cartCount}
                  </span>
                )}
              </button>

              {isWellness && (
                <button
                  onClick={() => router.push('/')}
                  className="p-2 border border-red-950 bg-red-950/20 text-red-400 hover:bg-red-950/40 rounded-xl text-[9px] font-black uppercase tracking-widest px-3 py-2 shrink-0 transition-colors"
                >
                  Exit Wellness
                </button>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-xl transition-colors md:hidden ${
                  isWellness ? 'hover:bg-wellness-card text-wellness-text' : 'hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5 stroke-[1.5]" /> : <Menu className="h-5 w-5 stroke-[1.5]" />}
              </button>

            </div>
          </div>
        </div>

        {/* 4. Compact Category Navigation Strip (Desktop Only) */}
        <div className={`hidden md:block border-t ${
          isWellness 
            ? 'bg-wellness-black border-zinc-900' 
            : 'bg-[#FDFBF7] border-zinc-200/10'
        }`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="flex justify-center items-center gap-8 py-2.5 text-[9px] font-black uppercase tracking-[0.2em]">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative py-1 transition-all select-none ${
                      isActive 
                        ? 'text-brand-burgundy font-black scale-105' 
                        : isWellness 
                        ? 'text-wellness-muted hover:text-white' 
                        : 'text-zinc-500 hover:text-brand-burgundy'
                    }`}
                  >
                    {link.label}
                    <span className={`absolute bottom-0 left-0 h-[2px] bg-brand-burgundy transition-all duration-300 ${
                      isActive ? 'w-full' : 'w-0'
                    }`} />
                  </Link>
                );
              })}
              
              <span className="h-3 w-px bg-zinc-300/30"></span>

              {/* Wellness 18+ Outlined Link */}
              {wellnessPublished && (
                <Link
                  href="/wellness"
                  className={`px-3 py-1 rounded-full border text-[8px] font-black tracking-widest uppercase transition-all select-none ${
                    isWellness 
                      ? 'border-wellness-bronze text-wellness-bronze bg-wellness-bronze/10' 
                      : 'border-zinc-300 text-zinc-500 hover:border-brand-burgundy hover:text-brand-burgundy hover:bg-brand-burgundy/[0.02]'
                  }`}
                >
                  Wellness 18+
                </Link>
              )}
            </nav>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className={`md:hidden border-t absolute top-full left-0 w-full shadow-2xl z-50 p-5 space-y-4 transition-all duration-300 ${
            isWellness 
              ? 'bg-wellness-dark border-wellness-bronze/20 text-wellness-text' 
              : 'bg-[#FDFBF7] border-zinc-250/60 text-brand-charcoal'
          }`}>
            {/* Search Input for mobile */}
            <div>
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search cakes, flowers, gifts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs outline-none border ${
                      isWellness
                        ? 'bg-wellness-black border-zinc-800 text-wellness-text placeholder-wellness-muted'
                        : 'bg-white border-zinc-200 text-zinc-850 placeholder-zinc-400 focus:border-brand-burgundy'
                    }`}
                  />
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                </div>
              </form>
            </div>

            {/* Links */}
            <nav className="flex flex-col gap-3 font-bold text-xs uppercase tracking-wider">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`py-1.5 border-b border-zinc-200/5 ${pathname === link.href ? 'text-brand-burgundy font-black' : 'text-zinc-500'}`}
                >
                  {link.label}
                </Link>
              ))}
              
              {wellnessPublished && (
                <Link 
                  href="/wellness" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={`py-2 px-3 rounded-full border text-center transition-colors font-extrabold tracking-wider ${
                    isWellness
                      ? 'bg-wellness-bronze text-zinc-950 border-transparent'
                      : 'bg-white border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/5'
                  }`}
                >
                  FATAFAT Wellness (18+)
                </Link>
              )}

              {/* Location Select for mobile */}
              <div className="pt-3 border-t border-zinc-200/5 flex flex-col gap-1.5">
                <span className="text-[8px] text-zinc-450 uppercase tracking-widest font-black">Delivery Location</span>
                <select
                  value={selectedLocation}
                  onChange={(e) => selectNewLocation(e.target.value)}
                  className={`text-xs p-2.5 rounded-xl border focus:outline-none bg-white ${
                    isWellness 
                      ? 'bg-wellness-black border-zinc-800 text-wellness-text' 
                      : 'border-zinc-200 text-zinc-700'
                  }`}
                >
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              {/* User Account / Admin for mobile */}
              <div className="flex gap-4 pt-3 border-t border-zinc-200/5">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/account/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs border font-medium ${
                        isWellness 
                          ? 'border-zinc-800 text-wellness-text' 
                          : 'border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <User className="h-4 w-4" /> Account
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                        showToast('Logged out successfully', 'success');
                        router.push('/');
                      }}
                      className="flex-1 py-2.5 rounded-xl text-xs border border-transparent text-white bg-red-650 hover:bg-red-750 font-bold cursor-pointer"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs border font-bold ${
                      isWellness 
                        ? 'border-wellness-bronze/40 text-wellness-bronze hover:bg-wellness-bronze/10' 
                        : 'border-brand-burgundy/25 text-brand-burgundy hover:bg-brand-blush'
                    }`}
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* 5. LOCATION SELECTOR MODAL */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FDFBF7] border border-[#E58B75]/25 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-left">
            <button
              onClick={() => setIsLocationModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="font-serif font-black text-lg text-brand-burgundy mb-1">Select Delivery Location</h3>
            <p className="text-[11px] text-zinc-550 mb-5 font-medium leading-relaxed">
              Define your delivery sector to customize catalog availability and delivery estimates.
            </p>

            {/* GPS Detection */}
            <button
              onClick={handleDetectLocation}
              className="w-full p-4 mb-4 bg-brand-burgundy/5 border border-brand-burgundy/10 rounded-2xl flex items-center gap-3.5 hover:bg-brand-burgundy/10 transition-all text-left font-bold text-brand-burgundy"
            >
              <Compass className="h-5 w-5 shrink-0 animate-spin-slow" />
              <div>
                <p className="text-xs">Detect Current Location</p>
                <p className="text-[9px] opacity-75 font-normal">Using GPS coordinates via browser</p>
              </div>
            </button>

            {/* Address Search Input */}
            <div className="relative mb-5">
              <input
                type="text"
                placeholder="Search sector, street, city..."
                className="w-full p-3 pl-10 border border-zinc-200 rounded-xl text-xs bg-white focus:outline-none focus:border-brand-burgundy"
                value={locSearchQuery}
                onChange={(e) => setLocSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
            </div>

            {/* Saved Addresses list */}
            {savedAddresses && savedAddresses.length > 0 && (
              <div className="space-y-2 mb-5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-450 block">Saved Delivery Addresses</span>
                <div className="divide-y border rounded-2xl bg-white overflow-hidden text-xs">
                  {savedAddresses.map((addr, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectNewLocation(addr.city)}
                      className="w-full p-3 text-left hover:bg-zinc-50 flex items-start gap-2.5 transition-colors font-medium text-zinc-700"
                    >
                      <MapPin className="h-4 w-4 mt-0.5 text-brand-coral shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-zinc-900 block truncate">{addr.name}</span>
                        <span className="text-[10px] text-zinc-500 leading-normal block truncate">{addr.house}, {addr.street}, {addr.city}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* List of Main Cities */}
            <div className="space-y-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-450 block">Or Choose a Main Location</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => selectNewLocation(loc)}
                    className={`p-3 border rounded-xl font-bold transition-all text-center ${
                      selectedLocation === loc
                        ? 'border-brand-burgundy bg-brand-burgundy text-white shadow-sm'
                        : 'border-zinc-200 bg-white hover:border-brand-burgundy hover:bg-brand-burgundy/5 text-zinc-700'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Panel */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
