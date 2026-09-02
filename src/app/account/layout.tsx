'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, ShoppingBag, MapPin, Heart, Settings, LogOut, ChevronRight } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FAF9F6] to-[#F5F3EF]">
      <Header />
      
      <main className="flex-grow py-8 md:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <Breadcrumbs />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start mt-6">
            
            {/* Premium Account Sidebar - Profile Card */}
            <aside className="md:col-span-3">
              <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                
                {/* Profile Header */}
                <div className="bg-gradient-to-br from-brand-burgundy/5 to-brand-burgundy/10 px-6 pt-6 pb-4">
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 bg-brand-burgundy text-white flex items-center justify-center rounded-full font-serif font-black text-2xl shadow-md mb-3 ring-4 ring-white">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <h2 className="text-base font-serif font-bold text-zinc-900 text-center truncate max-w-xs">{user.name || (user.email ? user.email.split('@')[0] : 'Customer')}</h2>
                    <p className="text-xs text-zinc-500 mt-1 text-center truncate max-w-xs">{user.email || ''}</p>
                    <div className="mt-3 px-3 py-1 bg-brand-burgundy/10 border border-brand-burgundy/20 rounded-full">
                      <span className="text-[10px] font-semibold text-brand-burgundy uppercase tracking-wide">FATAFAT Member</span>
                    </div>
                  </div>
                </div>

                {/* Navigation Menu */}
                <nav className="divide-y divide-zinc-100">
                  <Link
                    href="/account/profile"
                    className={`flex items-center justify-between px-5 py-3.5 transition-all ${
                      isActive('/account/profile') 
                        ? 'bg-brand-burgundy/8 border-l-3 border-brand-burgundy text-brand-burgundy font-semibold' 
                        : 'text-zinc-700 hover:bg-zinc-50 border-l-3 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <User className="h-4.5 w-4.5" /> 
                      <span>My Profile</span>
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>
                  
                  <Link
                    href="/account/orders"
                    className={`flex items-center justify-between px-5 py-3.5 transition-all ${
                      pathname.startsWith('/account/orders') 
                        ? 'bg-brand-burgundy/8 border-l-3 border-brand-burgundy text-brand-burgundy font-semibold' 
                        : 'text-zinc-700 hover:bg-zinc-50 border-l-3 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <ShoppingBag className="h-4.5 w-4.5" />
                      <span>My Orders</span>
                      {orders.length > 0 && (
                        <span className="ml-auto mr-1 bg-brand-burgundy text-white text-[10px] px-2 py-0.5 rounded-full font-bold min-w-5 text-center">
                          {orders.length}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>

                  <Link
                    href="/account/addresses"
                    className={`flex items-center justify-between px-5 py-3.5 transition-all ${
                      isActive('/account/addresses') 
                        ? 'bg-brand-burgundy/8 border-l-3 border-brand-burgundy text-brand-burgundy font-semibold' 
                        : 'text-zinc-700 hover:bg-zinc-50 border-l-3 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4.5 w-4.5" />
                      <span>Saved Addresses</span>
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>

                  <Link
                    href="/account/wishlist"
                    className={`flex items-center justify-between px-5 py-3.5 transition-all ${
                      isActive('/account/wishlist') 
                        ? 'bg-brand-burgundy/8 border-l-3 border-brand-burgundy text-brand-burgundy font-semibold' 
                        : 'text-zinc-700 hover:bg-zinc-50 border-l-3 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <Heart className="h-4.5 w-4.5" />
                      <span>Wishlist</span>
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>

                  <Link
                    href="/account/settings"
                    className={`flex items-center justify-between px-5 py-3.5 transition-all ${
                      isActive('/account/settings') 
                        ? 'bg-brand-burgundy/8 border-l-3 border-brand-burgundy text-brand-burgundy font-semibold' 
                        : 'text-zinc-700 hover:bg-zinc-50 border-l-3 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <Settings className="h-4.5 w-4.5" />
                      <span>Settings</span>
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>
                </nav>

                {/* Sign Out Button */}
                <div className="border-t border-zinc-100 p-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Account Tab Content */}
            <div className="md:col-span-9 bg-white border border-zinc-100 rounded-2xl shadow-sm min-h-[420px] p-6 md:p-8">
              {children}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
