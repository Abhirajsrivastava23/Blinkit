'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../data/mockData';
import { useAuth } from './AuthContext';
import { useToast } from '../components/Toast';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedType?: string; // Egg vs Eggless
  cakeMessage?: string;
  customImage?: string;
  addons?: any[];
  specialInstructions?: string;
  flavour?: string;
}

export interface CouponCelebrationState {
  isOpen: boolean;
  code: string;
  discountAmount: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number, options?: { size?: string; type?: string; message?: string }) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  promoCode: string;
  promoError: string;
  discountAmount: number;
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: () => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
  couponCelebration: CouponCelebrationState;
  dismissCelebration: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { wellnessPublished } = useAuth();
  const { showToast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    const storedCart = localStorage.getItem('fatafat_cart');
    if (!storedCart) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedCart) as CartItem[];
      if (Array.isArray(parsed)) {
        // Enforce maximum 3 distinct products limit on stored cart
        const unique = new Set<string>();
        const sanitized: CartItem[] = [];
        for (const item of parsed) {
          if (unique.has(item.product.id) || unique.size < 3) {
            unique.add(item.product.id);
            sanitized.push(item);
          }
        }
        if (sanitized.length !== parsed.length) {
          localStorage.setItem('fatafat_cart', JSON.stringify(sanitized));
        }
        return sanitized;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponCelebration, setCouponCelebration] = useState<CouponCelebrationState>({
    isOpen: false,
    code: '',
    discountAmount: 0,
  });

  const dismissCelebration = () => {
    setCouponCelebration(prev => ({ ...prev, isOpen: false }));
  };

  const freeDeliveryThreshold = 799;

  // Listen for real-time product updates to keep cart item images and prices synchronized
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<Product[]>;
      const freshProducts = customEvent.detail;
      if (Array.isArray(freshProducts) && freshProducts.length > 0) {
        setCartItems(prev => {
          let hasChanges = false;
          const updated = prev.map(item => {
            const matched = freshProducts.find(p => p.id === item.product.id);
            if (matched && (matched.image !== item.product.image || matched.price !== item.product.price || matched.name !== item.product.name)) {
              hasChanges = true;
              return { 
                ...item, 
                product: { ...item.product, image: matched.image, price: matched.price, name: matched.name } 
              };
            }
            return item;
          });
          if (hasChanges) {
            localStorage.setItem('fatafat_cart', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    };

    window.addEventListener('fatafat_products_sync', handleSync);
    return () => window.removeEventListener('fatafat_products_sync', handleSync);
  }, []);

  // Save cart to localStorage when it changes
  const saveCart = (items: CartItem[]) => {
    // Ensure items never exceed 3 distinct products
    const unique = new Set<string>();
    const sanitized: CartItem[] = [];
    for (const item of items) {
      if (unique.has(item.product.id) || unique.size < 3) {
        unique.add(item.product.id);
        sanitized.push(item);
      }
    }
    setCartItems(sanitized);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fatafat_cart', JSON.stringify(sanitized));
    }
  };

  const addToCart = (
    product: Product,
    quantity: number = 1,
    options?: { size?: string; type?: string; message?: string }
  ): boolean => {
    if (!product.inStock) return false;

    if (product.category === 'wellness') {
      if (!wellnessPublished) {
        alert('Access Denied: The Wellness section is currently unpublished.');
        return false;
      }
      const stored = typeof window !== 'undefined' ? localStorage.getItem('fatafat_user') : null;
      let status = 'NOT_REQUESTED';
      if (stored) {
        try {
          status = JSON.parse(stored).wellnessAccessStatus || 'NOT_REQUESTED';
        } catch {
          status = 'NOT_REQUESTED';
        }
      }
      if (status !== 'ACTIVE' && status !== 'APPROVED') {
        alert('Access Denied: You must request and receive approval for Wellness 18+ products.');
        return false;
      }
    }

    // Read current items considering localStorage to eliminate fast click race conditions
    let baseItems = cartItems;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('fatafat_cart');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > baseItems.length) {
            baseItems = parsed;
          }
        }
      } catch {}
    }

    const isExistingProductInCart = baseItems.some((item) => item.product.id === product.id);
    const uniqueProductCount = new Set(baseItems.map((item) => item.product.id)).size;

    if (!isExistingProductInCart && uniqueProductCount >= 3) {
      showToast('You can add up to 3 products per cart.', 'error');
      return false;
    }

    const existingIndex = baseItems.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.selectedSize === (options?.size || product.variants?.[0] || '') &&
        item.selectedType === (options?.type || (product.egglessAvailable ? (product.isEgglessDefault ? 'Eggless' : 'Egg') : ''))
    );

    const updatedCart = [...baseItems];

    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity += quantity;
    } else {
      updatedCart.push({
        product,
        quantity,
        selectedSize: options?.size || product.variants?.[0],
        selectedType: options?.type || (product.egglessAvailable ? (product.isEgglessDefault ? 'Eggless' : 'Egg') : undefined),
        cakeMessage: options?.message
      });
    }

    saveCart(updatedCart);
    return true;
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => {
      const updatedCart = prev.filter((item) => item.product.id !== productId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('fatafat_cart', JSON.stringify(updatedCart));
      }
      return updatedCart;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev => {
      const updatedCart = prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('fatafat_cart', JSON.stringify(updatedCart));
      }
      return updatedCart;
    });
  };

  const clearCart = () => {
    saveCart([]);
    setPromoCode('');
    setDiscountAmount(0);
    setPromoError('');
  };

  // Subtotal calculation (takes product price into account)
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Delivery fee logic
  const deliveryFee = subtotal === 0 || subtotal >= freeDeliveryThreshold ? 0 : 49;
  const amountToFreeDelivery = subtotal >= freeDeliveryThreshold ? 0 : freeDeliveryThreshold - subtotal;

  // Recalculate promo discount if subtotal changes
  useEffect(() => {
    if (!promoCode) {
      setDiscountAmount(0);
      return;
    }

    let isMounted = true;
    const revalidate = async () => {
      try {
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: promoCode, subtotal })
        });
        const data = await res.json();
        if (!isMounted) return;
        if (res.ok && data.valid) {
          setDiscountAmount(Number(data.discountAmount) || 0);
        } else {
          setPromoCode('');
          setDiscountAmount(0);
          setPromoError(data.error || 'Applied coupon removed due to cart changes.');
        }
      } catch {
        if (!isMounted) return;
        setPromoCode('');
        setDiscountAmount(0);
      }
    };

    void revalidate();
    return () => {
      isMounted = false;
    };
  }, [subtotal, promoCode]);

  const applyPromoCode = async (code: string): Promise<boolean> => {
    const normalizedCode = code.toUpperCase().trim();
    setPromoError('');

    if (!normalizedCode) {
      setPromoError('Please enter a coupon code.');
      return false;
    }

    if (subtotal <= 0) {
      setPromoError('Add items to cart before applying coupon.');
      return false;
    }

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode, subtotal })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        const discount = Number(data.discountAmount) || 0;
        setPromoCode(normalizedCode);
        setDiscountAmount(discount);
        setPromoError('');
        // Trigger celebration animation only on successful coupon application
        setCouponCelebration({
          isOpen: true,
          code: normalizedCode,
          discountAmount: discount
        });
        return true;
      } else {
        setPromoError(data.error || 'Invalid coupon code.');
        setPromoCode('');
        setDiscountAmount(0);
        setCouponCelebration({
          isOpen: false,
          code: '',
          discountAmount: 0
        });
        return false;
      }
    } catch (err) {
      console.error('Error applying coupon:', err);
      setPromoError('Unable to validate coupon. Please try again.');
      setCouponCelebration({
        isOpen: false,
        code: '',
        discountAmount: 0
      });
      return false;
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setDiscountAmount(0);
    setPromoError('');
    setCouponCelebration({
      isOpen: false,
      code: '',
      discountAmount: 0
    });
  };

  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        promoCode,
        promoError,
        discountAmount,
        applyPromoCode,
        removePromoCode,
        subtotal,
        deliveryFee,
        total,
        freeDeliveryThreshold,
        amountToFreeDelivery,
        couponCelebration,
        dismissCelebration
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
