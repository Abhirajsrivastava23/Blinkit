'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../data/mockData';
import { useAuth } from './AuthContext';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedType?: string; // Egg vs Eggless
  cakeMessage?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number, options?: { size?: string; type?: string; message?: string }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  promoCode: string;
  promoError: string;
  discountAmount: number;
  applyPromoCode: (code: string) => boolean;
  removePromoCode: () => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { wellnessPublished } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const freeDeliveryThreshold = 799;

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('fatafat_cart');
    if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart));
      } catch (e) {}
    }
  }, []);

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
    setCartItems(items);
    localStorage.setItem('fatafat_cart', JSON.stringify(items));
  };

  const addToCart = (
    product: Product,
    quantity: number = 1,
    options?: { size?: string; type?: string; message?: string }
  ) => {
    if (!product.inStock) return;

    if (product.category === 'wellness') {
      if (!wellnessPublished) {
        alert('Access Denied: The Wellness section is currently unpublished.');
        return;
      }
      const stored = localStorage.getItem('fatafat_user');
      let status = 'NOT_REQUESTED';
      if (stored) {
        try {
          status = JSON.parse(stored).wellnessAccessStatus || 'NOT_REQUESTED';
        } catch (e) {}
      }
      if (status !== 'ACTIVE' && status !== 'APPROVED') {
        alert('Access Denied: You must request and receive approval for Wellness 18+ products.');
        return;
      }
    }

    const existingIndex = cartItems.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.selectedSize === (options?.size || product.variants?.[0] || '') &&
        item.selectedType === (options?.type || (product.egglessAvailable ? (product.isEgglessDefault ? 'Eggless' : 'Egg') : ''))
    );

    let updatedCart = [...cartItems];

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
  };

  const removeFromCart = (productId: string) => {
    const updatedCart = cartItems.filter((item) => item.product.id !== productId);
    saveCart(updatedCart);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updatedCart = cartItems.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    saveCart(updatedCart);
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
    if (promoCode === 'FATAFAT10') {
      setDiscountAmount(Math.round(subtotal * 0.1));
    } else if (promoCode === 'CELEBRATE200') {
      if (subtotal >= 999) {
        setDiscountAmount(200);
      } else {
        // Remove code if requirement is no longer met
        setPromoCode('');
        setDiscountAmount(0);
        setPromoError('Promo code CELEBRATE200 removed: Subtotal fell below ₹999.');
      }
    } else {
      setDiscountAmount(0);
    }
  }, [subtotal, promoCode]);

  const applyPromoCode = (code: string): boolean => {
    const normalizedCode = code.toUpperCase().trim();
    setPromoError('');

    if (normalizedCode === 'FATAFAT10') {
      setPromoCode('FATAFAT10');
      setDiscountAmount(Math.round(subtotal * 0.1));
      return true;
    } else if (normalizedCode === 'CELEBRATE200') {
      if (subtotal >= 999) {
        setPromoCode('CELEBRATE200');
        setDiscountAmount(200);
        return true;
      } else {
        setPromoError('Promo code CELEBRATE200 requires a minimum subtotal of ₹999.');
        return false;
      }
    } else {
      setPromoError('Invalid promo code. Try FATAFAT10 or CELEBRATE200.');
      return false;
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setDiscountAmount(0);
    setPromoError('');
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
        amountToFreeDelivery
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
