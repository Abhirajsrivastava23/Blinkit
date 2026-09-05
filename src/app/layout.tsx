import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#6B1D2F',
};

export const metadata: Metadata = {
  title: 'FATAFAT — Celebrate. Gift. Indulge. Fatafat.',
  description: 'FATAFAT brings cakes, flowers, gifts, chocolates and celebration essentials to your doorstep, fast.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: ['/favicon.ico']
  }
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
