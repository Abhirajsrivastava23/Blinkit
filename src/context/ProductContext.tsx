'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../data/mockData';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProducts(data);
        }
      }
    } catch (error) {
      console.error('Error fetching database products:', error);
    } finally {
      setLoading(false);
    }
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
    <ProductContext.Provider value={{ products, loading, refreshProducts }}>
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
