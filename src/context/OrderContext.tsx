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
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  address: OrderAddress;
  status: 'Pending' | 'Confirmed' | 'Preparing' | 'Packed' | 'Ready for Delivery' | 'Waiting for Partner' | 'Assigned' | 'Accepted' | 'Picked Up' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  paymentStatus: 'PENDING' | 'PAYMENT_VERIFICATION_PENDING' | 'COMPLETED' | 'FAILED' | 'PAID' | 'PROCESSING' | 'REJECTED' | 'NOT_STARTED';
  paymentMethod?: 'UPI' | 'Card' | 'NetBanking';
  paymentId?: string;
  utr?: string;
  proofImageUrl?: string;
  submittedAt?: string;
  paymentSubmittedAt?: string;
  paymentVerifiedAt?: string;
  paymentRejectedAt?: string;
  rejectionReason?: string;
  deliveryOption: 'ASAP' | 'Scheduled';
  deliveryTimeSlot?: string;
  scheduledDeliveryAt?: string;
  eta: string;
  createdAt: string;
  updatedAt?: string;
  statusHistory?: Array<{ newStatus: string; previousStatus?: string | null; changedByUserId?: string; changedByRole?: string; timestamp: string; action?: string; note?: string }>;
  delivery_completed_at?: string;
  delivery_otp_verified?: boolean;
  otp_verified_at?: string;
  verified_by_partner_id?: string;
  deliveryOtp?: string | null;
  deliveryLocationId: 'nawabganj-unnao' | 'chandigarh-university-up';
  deliveryLocationName: string;
  assignedPartnerId?: string;
  assignedPartnerName?: string;
  assignedAt?: string;
  cancellationReason?: string;
  cancelledAt?: string;
}

interface OrderContextType {
  orders: Order[];
  placeOrder: (
    items: OrderItem[],
    address: OrderAddress,
    deliveryOption: 'ASAP' | 'Scheduled',
    deliveryTimeSlot: string,
    pricing: { subtotal: number; deliveryFee: number; discount: number; total: number },
    paymentMethod?: 'UPI' | 'Card' | 'NetBanking',
    scheduledDeliveryAt?: string
  ) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateOrderDetails: (orderId: string, updates: Partial<Order>) => void;
  getOrderById: (orderId: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  statusCode: number | null;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('fatafat_orders');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  // Load orders from server and fallback to localStorage
  const refreshOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      setStatusCode(res.status);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(prev => {
            const map = new Map<string, Order>();
            for (const o of prev) map.set(o.id, o);
            for (const o of data) map.set(o.id, o);
            const merged = Array.from(map.values());
            if (typeof window !== 'undefined') {
              localStorage.setItem('fatafat_orders', JSON.stringify(merged));
            }
            return merged;
          });
          setError(null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `HTTP Error ${res.status}`);
      }
    } catch (e) {
      console.error('Error refreshing orders:', e);
      setError('Failed to fetch orders from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshOrders();
    }, 0);

    // Poll for order changes every 5 seconds to ensure real-time updates across screens
    const interval = setInterval(() => {
      void refreshOrders();
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const placeOrder = async (
    items: OrderItem[],
    address: OrderAddress,
    deliveryOption: 'ASAP' | 'Scheduled',
    deliveryTimeSlot: string,
    pricing: { subtotal: number; deliveryFee: number; discount: number; total: number },
    paymentMethod?: 'UPI' | 'Card' | 'NetBanking',
    scheduledDeliveryAt?: string
  ): Promise<Order> => {
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

    const payload = {
      items,
      address,
      deliveryOption,
      deliveryTimeSlot: deliveryOption === 'Scheduled' ? deliveryTimeSlot : undefined,
      scheduledDeliveryAt: scheduledDeliveryAt || undefined,
      discount: pricing.discount,
      paymentMethod: paymentMethod || 'UPI',
      deliveryLocationId: locId,
      deliveryLocationName: locName
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.order) {
      throw new Error(data.error || 'Failed to place order. Please try again.');
    }

    const serverOrder = data.order as Order;

    // Save to local state
    setOrders(prev => {
      const updated = [serverOrder, ...prev.filter(o => o.id !== serverOrder.id)];
      localStorage.setItem('fatafat_orders', JSON.stringify(updated));
      return updated;
    });

    return serverOrder;
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
    <OrderContext.Provider value={{ orders, placeOrder, updateOrderStatus, updateOrderDetails, getOrderById, refreshOrders, isLoading, error, statusCode }}>
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
