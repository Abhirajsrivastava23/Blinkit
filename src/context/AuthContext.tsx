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
  wellnessAccessStatus?: 'NOT_REQUESTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'ACTIVE' | 'TERMS_REQUIRED' | 'PROFILE_INCOMPLETE' | 'NOT_ELIGIBLE' | 'REVOKED' | 'PENDING';
  wellnessApprovedAt?: string;
  wellnessApprovedBy?: string;
  wellnessRequestId?: string;
  role?: string;
  deliveryPartnerId?: string;
  locationId?: string;
  locationName?: string;
  dob?: string;
  gender?: string;
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
  updateProfile: (details: Partial<User>) => Promise<boolean>;
  wellnessPublished: boolean;
  setWellnessPublished: (published: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wellnessPublished, setWellnessPublished] = useState(false);

  // Safely initialize savedAddresses state from localStorage to avoid inline effect warnings
  const [savedAddresses, setSavedAddresses] = useState<Address[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fatafat_addresses');
      if (cached && cached !== '[]') {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore parsing errors
        }
      }
    }
    // Return seed addresses as default
    return [
      {
        id: 'addr-default-1',
        name: 'Abhiraj Srivastava',
        mobile: '9876543210',
        house: 'Flat 402, Royal Palms',
        street: 'Main Road, Sector 4',
        area: 'Nawabganj',
        city: 'Nawabganj, Unnao',
        pincode: '209859',
        landmark: 'Near Nawabganj Bird Sanctuary'
      }
    ];
  });

  // Load user session and addresses on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Query the server for active session
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated && meData.user) {
            setWellnessPublished(meData.wellnessPublished || false);
            
            if (meData.user.role === 'customer') {
              // Update client context with active authenticated customer details
              const authedUser: User = {
                phone: meData.user.phone || '9876543210',
                name: meData.user.name || 'Valued Client',
                email: meData.user.email,
                googleProviderId: meData.user.googleProviderId || meData.user.phone,
                role: meData.user.role,
                wellnessAccessStatus: meData.user.wellnessAccessStatus || 'NOT_REQUESTED',
                profileImage: meData.user.profileImage || '',
                dob: meData.user.dob || '',
                gender: meData.user.gender || ''
              };

              // Use pre-fetched addresses if available from /api/auth/me
              if (meData.user.addresses && Array.isArray(meData.user.addresses)) {
                setSavedAddresses(meData.user.addresses);
                localStorage.setItem('fatafat_addresses', JSON.stringify(meData.user.addresses));
              }

              // Sync wellness status from users list only as fallback if not returned by me API
              if (meData.user.email && (!meData.user.profileImage || meData.user.wellnessAccessStatus === 'NOT_REQUESTED')) {
                try {
                  const listRes = await fetch('/api/users/list');
                  if (listRes.ok) {
                    const list = await listRes.json();
                    const matched = list.find((u: { email: string }) => u.email.toLowerCase() === meData.user.email.toLowerCase());
                    if (matched) {
                      authedUser.name = matched.name || authedUser.name;
                      authedUser.phone = matched.phone || authedUser.phone;
                      authedUser.wellnessAccessStatus = matched.wellnessAccessStatus || 'NOT_REQUESTED';
                      authedUser.googleProviderId = matched.googleProviderId || authedUser.googleProviderId;
                      authedUser.profileImage = matched.profileImage || '';
                      authedUser.dob = matched.dob || '';
                      authedUser.gender = matched.gender || '';
                      if (matched.addresses && Array.isArray(matched.addresses)) {
                        setSavedAddresses(matched.addresses);
                        localStorage.setItem('fatafat_addresses', JSON.stringify(matched.addresses));
                      }
                    }
                  }
                } catch (e) {
                  console.error('Failed to fetch wellness status in init:', e);
                }
              }

              setUser(authedUser);
              localStorage.setItem('fatafat_user', JSON.stringify(authedUser));
              setIsLoading(false);
              return;
            } else {
              // It's an admin or delivery partner
              const authedUser: User = {
                phone: meData.user.phone || '',
                name: meData.user.name || meData.user.role,
                email: meData.user.email,
                role: meData.user.role,
                deliveryPartnerId: meData.user.deliveryPartnerId || '',
                locationId: meData.user.locationId || '',
                locationName: meData.user.locationName || ''
              };
              setUser(authedUser);
              localStorage.setItem('fatafat_user', JSON.stringify(authedUser));
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize session from server:', err);
      }

      // Guest fallback if no active authenticated server session exists
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.startsWith('/admin') || path.startsWith('/delivery-partner')) {
          setIsLoading(false);
          return;
        }
      }

      const storedUser = localStorage.getItem('fatafat_user');
      let activeClientUser: User;

      if (storedUser) {
        activeClientUser = JSON.parse(storedUser);
        if (activeClientUser.email && activeClientUser.email !== 'guest@fatafat.com') {
          activeClientUser = { 
            phone: '9876543210', 
            name: 'Premium Guest', 
            email: 'guest@fatafat.com',
            wellnessAccessStatus: 'NOT_REQUESTED'
          };
          localStorage.setItem('fatafat_user', JSON.stringify(activeClientUser));
        }
        setUser(activeClientUser);
      } else {
        activeClientUser = { 
          phone: '9876543210', 
          name: 'Premium Guest', 
          email: 'guest@fatafat.com',
          wellnessAccessStatus: 'NOT_REQUESTED'
        };
        setUser(activeClientUser);
        localStorage.setItem('fatafat_user', JSON.stringify(activeClientUser));
      }

      // Synchronise guest session to server cookie
      try {
        await fetch('/api/auth/customer-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: activeClientUser.email,
            phone: activeClientUser.phone,
            name: activeClientUser.name
          })
        });
      } catch (e) {
        console.error('Failed to sync guest session to server:', e);
      }

      setIsLoading(false);
    };

    initAuth();
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

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Failed to logout server session:', e);
    }
    const guestUser: User = { 
      phone: '9876543210', 
      name: 'Premium Guest', 
      email: 'guest@fatafat.com',
      wellnessAccessStatus: 'NOT_REQUESTED'
    };
    setUser(guestUser);
    localStorage.setItem('fatafat_user', JSON.stringify(guestUser));
  };

  const updateProfile = async (details: Partial<User>): Promise<boolean> => {
    if (!user || user.email === 'guest@fatafat.com') return false;
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const updatedUser: User = {
            ...user,
            name: data.user.name,
            phone: data.user.phone,
            dob: data.user.dob,
            gender: data.user.gender,
            profileImage: data.user.profileImage
          };
          setUser(updatedUser);
          localStorage.setItem('fatafat_user', JSON.stringify(updatedUser));
          if (user.email) {
            localStorage.setItem(`fatafat_user_${user.email}`, JSON.stringify(updatedUser));
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Error updating profile:', e);
    }
    return false;
  };

  const addAddress = async (address: Omit<Address, 'id'>) => {
    const newAddress: Address = {
      ...address,
      id: `addr-${Date.now()}`
    };
    const updated = [...savedAddresses, newAddress];
    setSavedAddresses(updated);
    localStorage.setItem('fatafat_addresses', JSON.stringify(updated));

    if (user && user.email !== 'guest@fatafat.com') {
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses: updated })
        });
      } catch (e) {
        console.error('Error syncing added address:', e);
      }
    }
  };

  const removeAddress = async (id: string) => {
    const updated = savedAddresses.filter(addr => addr.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem('fatafat_addresses', updated.length > 0 ? JSON.stringify(updated) : '[]');

    if (user && user.email !== 'guest@fatafat.com') {
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses: updated })
        });
      } catch (e) {
        console.error('Error syncing removed address:', e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user && user.email !== 'guest@fatafat.com',
      isLoading,
      loginWithPhone,
      loginWithGoogle,
      updateWellnessStatus,
      logout,
      savedAddresses,
      addAddress,
      removeAddress,
      updateProfile,
      wellnessPublished,
      setWellnessPublished
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
