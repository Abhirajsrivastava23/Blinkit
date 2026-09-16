'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../data/mockData';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  refreshProducts: () => Promise<Product[]>;
  updateLocalProduct: (product: Product) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const latestRequestId = useRef(0);
  const productsRef = useRef<Product[]>([]);

  // Keep productsRef in sync with state
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const updateLocalProduct = useCallback((canonicalProduct: Product) => {
    if (!canonicalProduct || !canonicalProduct.id) return;
    latestRequestId.current += 1;
    setProducts(prev => {
      const pId = String(canonicalProduct.id).toLowerCase().trim();
      const next = [...prev];
      const idx = next.findIndex(p => String(p.id).toLowerCase().trim() === pId);
      if (idx >= 0) {
        next[idx] = canonicalProduct;
      } else {
        next.unshift(canonicalProduct);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fatafat_products_sync', { detail: next }));
      }
      return next;
    });
  }, []);

  const refreshProducts = useCallback(async (): Promise<Product[]> => {
    const requestId = ++latestRequestId.current;
    try {
      const res = await fetch(`/api/products?_t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Discard if a newer request or local mutation has occurred
          if (requestId !== latestRequestId.current) {
            return productsRef.current;
          }

          // Version-aware merge: preserve any product that has a newer updatedAt in current state
          const currentMap = new Map<string, Product>();
          for (const p of productsRef.current) {
            currentMap.set(String(p.id).toLowerCase().trim(), p);
          }

          const merged = data.map((fetchedP: Product) => {
            const existingP = currentMap.get(String(fetchedP.id).toLowerCase().trim());
            if (!existingP) return fetchedP;

            const existingTime = existingP.updatedAt ? new Date(existingP.updatedAt).getTime() : 0;
            const fetchedTime = fetchedP.updatedAt ? new Date(fetchedP.updatedAt).getTime() : 0;

            if (existingTime > fetchedTime && !Number.isNaN(existingTime) && !Number.isNaN(fetchedTime)) {
              return existingP;
            }
            return fetchedP;
          });

          setProducts(merged);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fatafat_products_sync', { detail: merged }));
          }
          return merged;
        }
      }
    } catch (error) {
      console.error('Error fetching database products:', error);
    } finally {
      setLoading(false);
    }
    return productsRef.current;
  }, []);

  useEffect(() => {
    void refreshProducts();

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<Product[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setProducts(customEvent.detail);
      } else {
        void refreshProducts();
      }
    };

    const handleFocus = () => {
      void refreshProducts();
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        void refreshProducts();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('fatafat_products_sync', handleSync);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('fatafat_products_sync', handleSync);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [refreshProducts]);

  return (
    <ProductContext.Provider value={{ products, loading, refreshProducts, updateLocalProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}

