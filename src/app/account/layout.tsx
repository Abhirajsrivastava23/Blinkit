'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, ShoppingBag, MapPin, Tag, Heart, Settings, LogOut, ChevronRight } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { useToast } from '../../components/Toast';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { orders } = useOrders();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <p className="text-xs text-zinc-500 font-medium">Checking authentication...</p>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully.', 'info');
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Header />
      
      <main className="flex-grow py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <Breadcrumbs />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Account Sidebar */}
            <aside className="lg:col-span-3 bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm space-y-4 shrink-0">
              <div className="pb-4 border-b border-zinc-100 flex items-center gap-3">
                <div className="h-10 w-10 bg-brand-burgundy text-white flex items-center justify-center rounded-full font-serif font-extrabold text-sm">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold truncate">{user.name || 'User Client'}</h2>
                  <p className="text-[10px] text-zinc-400 truncate">{user.email || 'client@fatafat.com'}</p>
                </div>
              </div>

              <nav className="flex flex-col gap-1 text-xs font-bold text-zinc-600">
                <Link
                  href="/account/profile"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    isActive('/account/profile') ? 'bg-brand-burgundy text-white' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="flex items-center gap-2"><User className="h-4 w-4" /> My Profile</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </Link>
                
                <Link
                  href="/account/orders"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    pathname.startsWith('/account/orders') ? 'bg-brand-burgundy text-white' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> My Orders
                    {orders.length > 0 && (
                      <span className="bg-brand-gold text-zinc-900 text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                        {orders.length}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </Link>

                <Link
                  href="/account/addresses"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    isActive('/account/addresses') ? 'bg-brand-burgundy text-white' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Saved Addresses</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </Link>

                <Link
                  href="/account/wishlist"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    isActive('/account/wishlist') ? 'bg-brand-burgundy text-white' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="flex items-center gap-2"><Heart className="h-4 w-4" /> Wishlist</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </Link>

                <Link
                  href="/account/settings"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    isActive('/account/settings') ? 'bg-brand-burgundy text-white' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="flex items-center gap-2"><Settings className="h-4 w-4" /> Settings</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-red-50 text-red-600 transition-colors mt-4 pt-4 border-t border-zinc-100"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </nav>
            </aside>

            {/* Account Tab Content */}
            <div className="lg:col-span-9 bg-white border border-zinc-100 rounded-3xl p-6 md:p-8 shadow-sm min-h-[420px]">
              {children}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
