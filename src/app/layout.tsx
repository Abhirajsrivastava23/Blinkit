import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { WellnessProvider } from '../context/WellnessContext';
import { OrderProvider } from '../context/OrderContext';

import { ToastProvider } from '../components/Toast';
import { ProductProvider } from '../context/ProductContext';

import { Cormorant_Garamond, Inter } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'FATAFAT — Celebrate. Gift. Indulge. Fatafat.',
  description: 'FATAFAT brings cakes, flowers, gifts, chocolates and celebration essentials to your doorstep, fast.',
};

import QuickViewModal from '../components/QuickViewModal';
import KeyboardShortcutListener from '../components/KeyboardShortcutListener';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF9F6] text-[#1A1A1A]">
        <ToastProvider>
          <ProductProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <WellnessProvider>
                    <OrderProvider>
                      {children}
                      <QuickViewModal />
                      <KeyboardShortcutListener />
                    </OrderProvider>
                  </WellnessProvider>
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </ProductProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
