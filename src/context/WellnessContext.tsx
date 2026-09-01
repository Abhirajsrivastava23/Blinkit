'use client';

import React, { createContext, useContext, useState } from 'react';

interface WellnessContextType {
  isAgeVerified: boolean;
  verifyAge: () => void;
  resetAgeVerification: () => void;
}

const WellnessContext = createContext<WellnessContextType | undefined>(undefined);

export const WellnessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem('fatafat_wellness_verified') === 'true';
  });

  const verifyAge = () => {
    setIsAgeVerified(true);
    localStorage.setItem('fatafat_wellness_verified', 'true');
  };

  const resetAgeVerification = () => {
    setIsAgeVerified(false);
    localStorage.removeItem('fatafat_wellness_verified');
  };

  return (
    <WellnessContext.Provider value={{ isAgeVerified, verifyAge, resetAgeVerification }}>
      {children}
    </WellnessContext.Provider>
  );
};

export const useWellness = () => {
  const context = useContext(WellnessContext);
  if (context === undefined) {
    throw new Error('useWellness must be used within a WellnessProvider');
  }
  return context;
};
