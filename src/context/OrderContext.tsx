'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  selectedSize?: string;
  selectedType?: string;
}

export interface OrderAddress {
  name: string;
  mobile: string;
  house: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
  landmark?: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  address: OrderAddress;
  status: 'Pending' | 'Confirmed' | 'Preparing' | 'Packed' | 'Ready for Delivery' | 'Waiting for Partner' | 'Assigned' | 'Accepted' | 'Picked Up' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  deliveryOption: 'ASAP' | 'Scheduled';
  deliveryTimeSlot?: string;
  eta: string;
  createdAt: string;
  deliveryLocationId: 'nawabganj-unnao' | 'chandigarh-university-up';
  deliveryLocationName: string;
  assignedPartnerId?: string;
  assignedPartnerName?: string;
  assignedAt?: string;
}

interface OrderContextType {
  orders: Order[];
  placeOrder: (
    items: OrderItem[],
    address: OrderAddress,
    deliveryOption: 'ASAP' | 'Scheduled',
    deliveryTimeSlot: string,
    pricing: { subtotal: number; deliveryFee: number; discount: number; total: number }
  ) => Order;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateOrderDetails: (orderId: string, updates: Partial<Order>) => void;
  getOrderById: (orderId: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  // Load orders from server and fallback to localStorage
  const refreshOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        localStorage.setItem('fatafat_orders', JSON.stringify(data));
        return;
      }
    } catch (e) {
      console.warn('Fallback to local storage due to API error:', e);
    }
    
    const stored = localStorage.getItem('fatafat_orders');
    if (stored) {
      setOrders(JSON.parse(stored));
    }
  };

  useEffect(() => {
    refreshOrders();
    // Poll for order changes every 5 seconds to ensure real-time updates across screens
    const interval = setInterval(refreshOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const placeOrder = (
    items: OrderItem[],
    address: OrderAddress,
    deliveryOption: 'ASAP' | 'Scheduled',
    deliveryTimeSlot: string,
    pricing: { subtotal: number; deliveryFee: number; discount: number; total: number }
  ): Order => {
    const randomId = Math.floor(10000 + Math.random() * 90000);
    
    // Retrieve active logged in customer email
    let activeCustomer = 'guest@fatafat.com';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fatafat_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          activeCustomer = parsed.email || parsed.phone || 'guest@fatafat.com';
        } catch (e) {}
      }
    }

    // Determine delivery location ID based on current selection
    let locName = 'Nawabganj, Unnao';
    let locId: 'nawabganj-unnao' | 'chandigarh-university-up' = 'nawabganj-unnao';
    if (typeof window !== 'undefined') {
      const savedLoc = localStorage.getItem('fatafat_location');
      if (savedLoc) {
        locName = savedLoc;
        if (savedLoc.includes('Chandigarh') || savedLoc.includes('University')) {
          locId = 'chandigarh-university-up';
        }
      }
    }

    const newOrder: Order = {
      id: `FF${randomId}`,
      customerId: activeCustomer,
      items,
      subtotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      discount: pricing.discount,
      total: pricing.total,
      address,
      status: 'Pending',
      deliveryOption,
      deliveryTimeSlot: deliveryOption === 'Scheduled' ? deliveryTimeSlot : undefined,
      eta: '35 mins',
      createdAt: new Date().toISOString(),
      deliveryLocationId: locId,
      deliveryLocationName: locName
    };

    // Save to local state
    const updated = [newOrder, ...orders];
    setOrders(updated);
    localStorage.setItem('fatafat_orders', JSON.stringify(updated));

    // Save to server database asynchronously
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    }).catch(err => console.error('Failed to post order to server:', err));

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    setOrders(updated);
    localStorage.setItem('fatafat_orders', JSON.stringify(updated));

    // Update on server
    fetch('/api/orders/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, updates: { status } })
    }).catch(err => console.error('Failed to update status on server:', err));
  };

  const updateOrderDetails = (orderId: string, updates: Partial<Order>) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, ...updates } : o));
    setOrders(updated);
    localStorage.setItem('fatafat_orders', JSON.stringify(updated));

    // Update on server
    fetch('/api/orders/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, updates })
    }).catch(err => console.error('Failed to update details on server:', err));
  };

  const getOrderById = (orderId: string) => {
    return orders.find((o) => o.id === orderId);
  };

  return (
    <OrderContext.Provider value={{ orders, placeOrder, updateOrderStatus, updateOrderDetails, getOrderById, refreshOrders }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
