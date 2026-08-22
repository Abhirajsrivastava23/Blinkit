'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Address {
  id: string;
  name: string;
  mobile: string;
  house: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
  landmark?: string;
}

export interface User {
  phone: string;
  name?: string;
  email?: string;
  googleProviderId?: string;
  profileImage?: string;
  createdAt?: string;
  lastLoginAt?: string;
  wellnessAccessStatus?: 'NOT_REQUESTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED';
  wellnessApprovedAt?: string;
  wellnessApprovedBy?: string;
  wellnessRequestId?: string;
  role?: string;
  deliveryPartnerId?: string;
  locationId?: string;
  locationName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginWithPhone: (phone: string) => Promise<void>;
  loginWithGoogle: (googleUser: { googleProviderId: string; email: string; name: string; profileImage?: string }) => Promise<void>;
  updateWellnessStatus: (status: User['wellnessAccessStatus'], details?: Partial<User>) => void;
  logout: () => void;
  savedAddresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => void;
  removeAddress: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user session and addresses from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('fatafat_user');
    const storedAddresses = localStorage.getItem('fatafat_addresses');
    
    let activeClientUser: User;
    if (storedUser) {
      activeClientUser = JSON.parse(storedUser);
      setUser(activeClientUser);
    } else {
      // Default guest user
      activeClientUser = { 
        phone: '9876543210', 
        name: 'Premium Guest', 
        email: 'guest@fatafat.com',
        wellnessAccessStatus: 'NOT_REQUESTED'
      };
      setUser(activeClientUser);
      localStorage.setItem('fatafat_user', JSON.stringify(activeClientUser));
    }

    // Establish secure session on the backend
    fetch('/api/auth/customer-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: activeClientUser.email,
        phone: activeClientUser.phone,
        name: activeClientUser.name
      })
    }).catch(err => console.error('Failed to sync guest session:', err));

    if (storedAddresses) {
      setSavedAddresses(JSON.parse(storedAddresses));
    } else {
      const defaultAddresses = [
        {
          id: 'addr-1',
          name: 'Aman Sharma',
          mobile: '9876543210',
          house: 'Room 304, Block C',
          street: 'Chandigarh University Campus',
          area: 'Gharuan',
          city: 'Chandigarh University, Uttar Pradesh',
          pincode: '140413',
          landmark: 'Gate 2 Entrance'
        },
        {
          id: 'addr-2',
          name: 'Rahul Gupta',
          mobile: '9988776655',
          house: 'Flat 12, Block B',
          street: 'Main Market Road',
          area: 'Nawabganj',
          city: 'Nawabganj, Unnao',
          pincode: '209859',
          landmark: 'Near Nawabganj Bird Sanctuary'
        }
      ];
      setSavedAddresses(defaultAddresses);
      localStorage.setItem('fatafat_addresses', JSON.stringify(defaultAddresses));
    }
    setIsLoading(false);
  }, []);

  const loginWithPhone = async (phone: string) => {
    const newUser: User = { 
      phone, 
      name: 'Valued Client', 
      email: `client.${phone.slice(-4)}@fatafat.com`,
      wellnessAccessStatus: 'NOT_REQUESTED'
    };

    try {
      await fetch('/api/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          phone: newUser.phone,
          name: newUser.name
        })
      });
    } catch (e) {
      console.error('Error syncing customer phone session:', e);
    }

    setUser(newUser);
    localStorage.setItem('fatafat_user', JSON.stringify(newUser));
  };

  const loginWithGoogle = async (googleUser: { googleProviderId: string; email: string; name: string; profileImage?: string }) => {
    const storedUserKey = `fatafat_user_${googleUser.email}`;
    const storedUser = localStorage.getItem(storedUserKey);
    let finalUser: User;
    
    if (storedUser) {
      finalUser = JSON.parse(storedUser);
      finalUser.lastLoginAt = new Date().toISOString();
    } else {
      finalUser = {
        phone: '99999' + Math.floor(1000 + Math.random() * 9000),
        name: googleUser.name,
        email: googleUser.email,
        googleProviderId: googleUser.googleProviderId,
        profileImage: googleUser.profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60',
        wellnessAccessStatus: 'NOT_REQUESTED',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    }

    try {
      await fetch('/api/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: finalUser.email,
          phone: finalUser.phone,
          name: finalUser.name
        })
      });
    } catch (e) {
      console.error('Error syncing customer Google session:', e);
    }
    
    setUser(finalUser);
    localStorage.setItem('fatafat_user', JSON.stringify(finalUser));
    localStorage.setItem(storedUserKey, JSON.stringify(finalUser));
  };

  const updateWellnessStatus = (status: User['wellnessAccessStatus'], details?: Partial<User>) => {
    if (!user) return;
    const updated: User = {
      ...user,
      wellnessAccessStatus: status,
      ...details
    };
    setUser(updated);
    localStorage.setItem('fatafat_user', JSON.stringify(updated));
    if (user.email) {
      localStorage.setItem(`fatafat_user_${user.email}`, JSON.stringify(updated));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fatafat_user');
  };

  const addAddress = (address: Omit<Address, 'id'>) => {
    const newAddress: Address = {
      ...address,
      id: `addr-${Date.now()}`
    };
    const updated = [...savedAddresses, newAddress];
    setSavedAddresses(updated);
    localStorage.setItem('fatafat_addresses', JSON.stringify(updated));
  };

  const removeAddress = (id: string) => {
    const updated = savedAddresses.filter(addr => addr.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem('fatafat_addresses', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      isLoading,
      loginWithPhone,
      loginWithGoogle,
      updateWellnessStatus,
      logout,
      savedAddresses,
      addAddress,
      removeAddress
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
