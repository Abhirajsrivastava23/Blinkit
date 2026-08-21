'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Package, FolderHeart, ListPlus, Users, Tag, Star, 
  Truck, CreditCard, Flame, Settings, ArrowLeft, LogOut, Compass, FileText,
  Menu, X, ChevronDown, Bell, Search, HelpCircle, User, ShieldAlert, Sparkles, ChevronRight, TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../../components/Toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [userRole, setUserRole] = useState('ADMIN');
  const [adminName, setAdminName] = useState('Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@fatafat.com');

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const isLoginPage = pathname === '/admin/login';

  // 1. Authorization checks
  useEffect(() => {
    if (isLoginPage) return;

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          showToast('Access denied: Operations Console authorization required.', 'error');
          router.push('/admin/login');
          return;
        }

        const data = await res.json();
        if (data.user.role !== 'admin') {
          showToast('Access denied: Admin role required for this system.', 'error');
          router.push('/admin/login');
          return;
        }

        // Keep simulated role categories for sidebar visibility limits if needed
        const email = data.user.email || '';
        if (email === 'superadmin@fatafat.com') {
          setUserRole('SUPER_ADMIN');
        } else if (email === 'manager@fatafat.com') {
          setUserRole('INVENTORY_MANAGER');
        } else {
          setUserRole('ADMIN');
        }

        setAdminName(data.user.name || 'Admin Operations');
        setAdminEmail(email);
      } catch (err) {
        console.error('Admin layout auth error:', err);
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [pathname, router, isLoginPage]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#FAF9F6] text-brand-charcoal">{children}</div>;
  }

  // Sidebar link categories as specified
  const navGroups = [
    {
      title: 'Overview',
      links: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp }
      ]
    },
    {
      title: 'Orders',
      links: [
        { href: '/admin/orders', label: 'Orders List', icon: ShoppingBag },
        { href: '/admin/returns', label: 'Returns & Refunds', icon: ShieldAlert }
      ]
    },
    {
      title: 'Catalog',
      links: [
        { href: '/admin/products', label: 'Products', icon: Package },
        { href: '/admin/categories', label: 'Categories', icon: FolderHeart },
        { href: '/admin/brands', label: 'Brands', icon: Compass },
        { href: '/admin/inventory', label: 'Inventory Monitor', icon: ListPlus }
      ]
    },
    {
      title: 'Customers',
      links: [
        { href: '/admin/customers', label: 'Customers List', icon: Users },
        { href: '/admin/reviews', label: 'Reviews Feed', icon: Star }
      ]
    },
    {
      title: 'Marketing',
      links: [
        { href: '/admin/coupons', label: 'Coupons', icon: Tag },
        { href: '/admin/campaigns', label: 'Campaigns', icon: Sparkles }
      ]
    },
    {
      title: 'Delivery',
      links: [
        { href: '/admin/delivery', label: 'Delivery Ops', icon: Truck },
        { href: '/admin/delivery-partners', label: 'Delivery Partners', icon: Users }
      ]
    },
    {
      title: 'Wellness 18+',
      links: [
        { href: '/admin/wellness', label: 'Wellness Products', icon: Flame }
      ]
    },
    {
      title: 'System',
      links: [
        { href: '/admin/activity', label: 'Activity Logs', icon: FileText },
        { href: '/admin/settings', label: 'Settings Panel', icon: Settings }
      ]
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  // Breadcrumbs utility
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((part, index) => {
      const href = '/' + parts.slice(0, index + 1).join('/');
      const label = part.charAt(0).toUpperCase() + part.slice(1);
      return { href, label };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen flex bg-[#FDFBF7] text-zinc-950 font-sans selection:bg-brand-burgundy/10 text-xs">
      
      {/* 2. FIXED SIDEBAR (Desktop) */}
      <aside 
        className={`hidden lg:flex flex-col bg-[#1C1A17] text-zinc-400 border-r border-zinc-800 transition-all duration-300 shrink-0 select-none ${
          isCollapsed ? 'w-20' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
          {!isCollapsed ? (
            <div className="text-left space-y-0.5">
              <h3 className="font-sans font-black text-white text-base tracking-tighter">
                FATA<span className="text-brand-coral bg-brand-coral/10 px-1 py-0.5 rounded ml-0.5 text-xs font-black">FAT</span>
              </h3>
              <p className="text-[7px] text-brand-gold font-extrabold uppercase tracking-widest leading-none">COMMERCE OPERATIONS</p>
            </div>
          ) : (
            <div className="mx-auto font-black text-white text-base bg-brand-burgundy h-8 w-8 rounded-lg flex items-center justify-center shadow-sm">
              F
            </div>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all hidden lg:block shrink-0"
            title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5 rotate-90" />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-grow overflow-y-auto p-3 space-y-5 text-left scrollbar-none">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <span className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-zinc-650 block px-3">
                  {group.title}
                </span>
              )}
              <div className="flex flex-col gap-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  
                  // Hide features if INVENTORY_MANAGER role is restricted
                  if (userRole === 'INVENTORY_MANAGER' && (
                    group.title === 'Marketing' || 
                    group.title === 'System' || 
                    group.title === 'Customers'
                  )) {
                    return null;
                  }

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all relative ${
                        active 
                          ? 'bg-[#6B1D2F] text-white font-bold shadow-sm' 
                          : 'hover:bg-zinc-850 hover:text-zinc-100'
                      }`}
                      title={link.label}
                    >
                      {active && (
                        <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-brand-gold" />
                      )}
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand-gold' : 'text-zinc-550 group-hover:text-zinc-200'}`} />
                      {!isCollapsed && <span className="text-[11px] font-medium leading-none">{link.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout widget */}
        <div className="p-3 border-t border-zinc-850">
          <button
            onClick={() => {
              localStorage.removeItem('fatafat_user');
              showToast('Logged out from operational console.', 'info');
              router.push('/admin/login');
            }}
            className="w-full flex items-center justify-center gap-2 p-2 hover:bg-red-950/20 text-red-400 hover:text-red-300 rounded-xl transition-colors font-bold text-[11px]"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Sign Out Portal</span>}
          </button>
        </div>
      </aside>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* TOPBAR (Completely separate from Storefront) */}
        <header className="h-14 border-b border-zinc-200/50 bg-white px-6 flex items-center justify-between select-none shrink-0 shadow-sm">
          
          {/* Topbar Left: Drawer toggle and breadcrumbs */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-650"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 font-bold uppercase tracking-wider">
              <span className="hover:text-brand-burgundy cursor-pointer">FATAFAT OPS</span>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.href}>
                  <ChevronRight className="h-3 w-3 text-zinc-350" />
                  <Link 
                    href={crumb.href} 
                    className={idx === breadcrumbs.length - 1 ? 'text-zinc-800 font-extrabold' : 'hover:text-brand-burgundy'}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Topbar Right: Actions & Profile */}
          <div className="flex items-center gap-4">
            
            {/* Global Admin Search Bar */}
            <div className="relative w-48 sm:w-60 hidden md:block">
              <input
                type="text"
                placeholder="Search catalog, orders..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] focus:outline-none focus:border-brand-burgundy font-medium"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-zinc-650 relative"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-burgundy animate-pulse" />
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 text-left overflow-hidden">
                  <div className="p-3 bg-zinc-50 border-b font-bold text-zinc-700 flex justify-between items-center text-[10px]">
                    <span>SYSTEM NOTIFICATIONS</span>
                    <span className="text-[8px] bg-brand-burgundy/10 text-brand-burgundy px-1.5 py-0.5 rounded">NEW</span>
                  </div>
                  <div className="divide-y max-h-48 overflow-y-auto">
                    <div className="p-3 hover:bg-[#FDFBF7] flex gap-2 items-start cursor-pointer text-[10px]">
                      <Users className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-zinc-800">New Partner Registered</p>
                        <p className="text-zinc-500">Rider Aman updated credentials.</p>
                      </div>
                    </div>
                    <div className="p-3 hover:bg-[#FDFBF7] flex gap-2 items-start cursor-pointer text-[10px]">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-zinc-800">Low Stock Warning</p>
                        <p className="text-zinc-500">Chocolate Cake is below threshold limits.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 hover:bg-zinc-50 rounded-xl transition-all"
              >
                <div className="h-7 w-7 bg-brand-burgundy text-white flex items-center justify-center rounded-lg font-serif font-bold text-xs select-none">
                  {adminName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-bold text-[10px] leading-none text-zinc-800">{adminName}</p>
                  <p className="text-[8px] text-zinc-400 uppercase tracking-widest font-extrabold mt-0.5">{userRole}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2.5 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl py-2 z-50 text-left">
                  <div className="px-4 py-2 border-b">
                    <p className="font-extrabold text-[10px] text-zinc-800 truncate">{adminName}</p>
                    <p className="text-[8px] text-zinc-400 truncate mt-0.5">{adminEmail}</p>
                  </div>
                  <button 
                    onClick={() => {
                      router.push('/admin/settings');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#FDFBF7] text-xs font-bold text-zinc-650 flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4 text-zinc-400" /> Settings
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('fatafat_user');
                      showToast('Logged out successfully', 'info');
                      router.push('/admin/login');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-xs font-bold text-red-600 border-t flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Content Body Layout */}
        <div className="flex-grow p-6 overflow-y-auto">
          {children}
        </div>

        {/* Operations Footer */}
        <footer className="py-3 bg-white border-t text-center text-[8px] text-zinc-400 font-extrabold uppercase tracking-widest select-none">
          © 2026 FATAFAT COMMERCE OPERATIONS PORTAL • SERVER SECURED
        </footer>
      </div>

      {/* ================= MOBILE DRAWER OVERLAY ================= */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            onClick={() => setIsMobileDrawerOpen(false)} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          <aside className="relative w-60 bg-[#1C1A17] text-zinc-400 h-full flex flex-col p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="text-left">
                <h3 className="font-sans font-black text-white text-base">FATA<span className="text-brand-coral">FAT</span></h3>
                <p className="text-[7px] text-brand-gold font-extrabold uppercase tracking-widest">COMMERCE OPS</p>
              </div>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 hover:bg-zinc-850 rounded text-zinc-450 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-grow overflow-y-auto space-y-5 text-left scrollbar-none">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <span className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-zinc-600 block px-3">
                    {group.title}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {group.links.map((link) => {
                      const Icon = link.icon;
                      const active = isActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            active 
                              ? 'bg-brand-burgundy text-white font-bold shadow' 
                              : 'hover:bg-zinc-800/50 hover:text-white'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

    </div>
  );
}
