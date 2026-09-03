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
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<Order | null>;
  updateOrderDetails: (orderId: string, updates: Partial<Order>) => Promise<Order | null>;
  getOrderById: (orderId: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  statusCode: number | null;
}

export const STATUS_RANK: Record<string, number> = {
  'NOT_STARTED': 0,
  'Pending': 10,
  'Confirmed': 20,
  'Preparing': 30,
  'Packed': 40,
  'Ready for Delivery': 45,
  'Waiting for Partner': 48,
  'Assigned': 50,
  'Accepted': 60,
  'Picked Up': 70,
  'Out for Delivery': 80,
  'Delivered': 90,
  'Cancelled': 100,
  'Failed Delivery': 100
};

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
  const isFetchingRef = React.useRef(false);
  const orderSeqRef = React.useRef(0);
  const latestHandledSeqRef = React.useRef(0);

  // Load orders from server with monotonic state preservation
  const refreshOrders = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const thisSeq = ++orderSeqRef.current;

    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      setStatusCode(res.status);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && thisSeq >= latestHandledSeqRef.current) {
          latestHandledSeqRef.current = thisSeq;
          setOrders(prev => {
            const prevMap = new Map<string, Order>();
            for (const o of prev) prevMap.set(String(o.id).toLowerCase(), o);

            const serverIds = new Set<string>();
            // Merge server data with single authoritative DB status
            const updated = data.map((serverOrder: Order) => {
              serverIds.add(String(serverOrder.id).toLowerCase());
              const existing = prevMap.get(String(serverOrder.id).toLowerCase());
              if (!existing) return serverOrder;

              const existingRank = STATUS_RANK[existing.status] || 0;
              const serverRank = STATUS_RANK[serverOrder.status] || 0;

              // Prevent stale delayed polling response from downgrading a newer local optimistic status
              if (existingRank > serverRank && existing.updatedAt && serverOrder.updatedAt) {
                if (new Date(existing.updatedAt).getTime() > new Date(serverOrder.updatedAt).getTime()) {
                  return { ...serverOrder, status: existing.status };
                }
              }

              // Monotonic payment status authority
              const existingPaid = existing.paymentStatus === 'PAID' || existingRank >= 20;
              const serverPaid = serverOrder.paymentStatus === 'PAID' || serverRank >= 20;

              if (existingPaid && !serverPaid && serverOrder.paymentStatus !== 'REJECTED') {
                return { ...serverOrder, paymentStatus: 'PAID' as const };
              }
              return serverOrder;
            });

            // Preserve freshly created local orders placed in last 5 minutes
            for (const prevOrder of prev) {
              const key = String(prevOrder.id).toLowerCase();
              if (!serverIds.has(key)) {
                const ageMs = Date.now() - new Date(prevOrder.createdAt || 0).getTime();
                if (ageMs < 5 * 60 * 1000) {
                  updated.push(prevOrder);
                }
              }
            }

            // Sort newest first
            updated.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

            if (typeof window !== 'undefined') {
              localStorage.setItem('fatafat_orders', JSON.stringify(updated));
            }
            return updated;
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
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshOrders();

    // Poll for order changes every 2 seconds with visibility check
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void refreshOrders();
    }, 2000);

    return () => {
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

  const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<Order | null> => {
    // Optimistic local update
    const now = new Date().toISOString();
    setOrders(prev => {
      const updated = prev.map((o) => (String(o.id).toLowerCase() === String(orderId).toLowerCase() ? { ...o, status, updatedAt: now } : o));
      if (typeof window !== 'undefined') {
        localStorage.setItem('fatafat_orders', JSON.stringify(updated));
      }
      return updated;
    });

    // Authoritative update on server
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, updates: { status } })
      });
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        const serverOrder = data.order as Order;
        setOrders(prev => {
          const updated = prev.map((o) => (String(o.id).toLowerCase() === String(orderId).toLowerCase() ? serverOrder : o));
          if (typeof window !== 'undefined') {
            localStorage.setItem('fatafat_orders', JSON.stringify(updated));
          }
          return updated;
        });
        return serverOrder;
      }
      return null;
    } catch (err) {
      console.error('Failed to update status on server:', err);
      return null;
    }
  };

  const updateOrderDetails = async (orderId: string, updates: Partial<Order>): Promise<Order | null> => {
    const now = new Date().toISOString();
    setOrders(prev => {
      const updated = prev.map((o) => (String(o.id).toLowerCase() === String(orderId).toLowerCase() ? { ...o, ...updates, updatedAt: now } : o));
      if (typeof window !== 'undefined') {
        localStorage.setItem('fatafat_orders', JSON.stringify(updated));
      }
      return updated;
    });

    // Authoritative update on server
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, updates })
      });
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        const serverOrder = data.order as Order;
        setOrders(prev => {
          const updated = prev.map((o) => (String(o.id).toLowerCase() === String(orderId).toLowerCase() ? serverOrder : o));
          if (typeof window !== 'undefined') {
            localStorage.setItem('fatafat_orders', JSON.stringify(updated));
          }
          return updated;
        });
        return serverOrder;
      }
      return null;
    } catch (err) {
      console.error('Failed to update details on server:', err);
      return null;
    }
  };

  const getOrderById = (orderId: string) => {
    if (!orderId) return undefined;
    const clean = String(orderId).trim().toLowerCase();
    return orders.find((o) => String(o.id || '').trim().toLowerCase() === clean);
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
