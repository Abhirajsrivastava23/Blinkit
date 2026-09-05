'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Share2, Camera, Globe, Heart } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const pathname = usePathname();
  const isWellness = pathname.startsWith('/wellness');

  return (
    <footer className={`transition-colors duration-300 ${
      isWellness 
        ? 'bg-[#0B0B0E] border-t border-zinc-900 text-zinc-400' 
        : 'bg-brand-burgundy text-white/80 border-t border-brand-burgundy-light'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 items-start">
          
          {/* Brand Col */}
          <div className="space-y-4 col-span-2">
            <Link href={isWellness ? '/wellness' : '/'} className="flex flex-col select-none">
              <Logo isWellness={isWellness} size="lg" />
              <span className={`text-[7px] tracking-[0.3em] mt-1.5 font-bold ${isWellness ? 'text-wellness-muted' : 'text-brand-gold'}`}>
                CELEBRATE. GIFT. INDULGE. FATAFAT.
              </span>
            </Link>
            <p className={`text-xs max-w-xs leading-relaxed ${isWellness ? 'text-wellness-muted' : 'text-zinc-400'}`}>
              Handcrafting beautiful celebration moments. From artisanal pastries and fresh floral bouquets to luxury hampers and personal care essentials. Delivered Fatafat.
            </p>
            <div className="flex gap-4 pt-1">
              <a href="#" className={`hover:opacity-75 transition-opacity ${isWellness ? 'text-wellness-bronze' : 'text-brand-gold'}`}>
                <Share2 className="h-4.5 w-4.5" />
              </a>
              <a href="#" className={`hover:opacity-75 transition-opacity ${isWellness ? 'text-wellness-bronze' : 'text-brand-gold'}`}>
                <Camera className="h-4.5 w-4.5" />
              </a>
              <a href="#" className={`hover:opacity-75 transition-opacity ${isWellness ? 'text-wellness-bronze' : 'text-brand-gold'}`}>
                <Globe className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          {/* Shop Column */}
          <div className="space-y-3">
            <h4 className={`text-[10px] font-extrabold uppercase tracking-widest ${isWellness ? 'text-wellness-bronze' : 'text-white'}`}>
              Shop
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/cakes" className="hover:text-white transition-colors">Cakes</Link></li>
              <li><Link href="/pastries" className="hover:text-white transition-colors">Pastries</Link></li>
              <li><Link href="/desserts" className="hover:text-white transition-colors">Desserts</Link></li>
              <li><Link href="/flowers" className="hover:text-white transition-colors">Flowers</Link></li>
              <li><Link href="/chocolates" className="hover:text-white transition-colors">Chocolates</Link></li>
              <li><Link href="/gifts" className="hover:text-white transition-colors">Gift Hampers</Link></li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-3">
            <h4 className={`text-[10px] font-extrabold uppercase tracking-widest ${isWellness ? 'text-wellness-bronze' : 'text-white'}`}>
              Company
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog Gazette</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Help Column */}
          <div className="space-y-3">
            <h4 className={`text-[10px] font-extrabold uppercase tracking-widest ${isWellness ? 'text-wellness-bronze' : 'text-white'}`}>
              Help
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/delivery" className="hover:text-white transition-colors">Delivery Options</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition-colors">Refund policy</Link></li>
              <li><Link href="/return-policy" className="hover:text-white transition-colors">Returns policy</Link></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-3">
            <h4 className={`text-[10px] font-extrabold uppercase tracking-widest ${isWellness ? 'text-wellness-bronze' : 'text-white'}`}>
              Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-white transition-colors">Cookies Policy</Link></li>
              <li><Link href="/shipping-policy" className="hover:text-white transition-colors">Shipping Policy</Link></li>
              <li><Link href="/cancellation-policy" className="hover:text-white transition-colors">Cancellation Policy</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className={`mt-16 pt-8 border-t flex flex-col sm:flex-row items-center justify-between text-[10px] ${
          isWellness ? 'border-wellness-bronze/10 text-wellness-muted' : 'border-brand-burgundy-light text-white/50'
        }`}>
          <p>© {new Date().getFullYear()} FATAFAT LTD. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-4 mt-4 sm:mt-0 font-bold uppercase tracking-wider items-center">
            <span className="opacity-60">Secure Payments 🔐</span>
            <Link href="/admin" className={`hover:underline ${isWellness ? 'text-wellness-bronze' : 'text-brand-gold'}`}>Admin Dashboard</Link>
            <span className="opacity-20">|</span>
            <Link href="/delivery-partner" className={`hover:underline ${isWellness ? 'text-wellness-bronze' : 'text-brand-gold'}`}>Delivery Partner</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
