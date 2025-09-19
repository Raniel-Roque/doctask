"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Banner {
  id: string;
  message: string;
  type: "error" | "success" | "warning" | "info";
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
  priority?: number; // Higher number = higher priority (shows on top)
}

interface BannerContextType {
  banners: Banner[];
  addBanner: (banner: Omit<Banner, "id">) => string;
  removeBanner: (id: string) => void;
  clearAllBanners: () => void;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export const useBanner = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error("useBanner must be used within a BannerProvider");
  }
  return context;
};

interface BannerProviderProps {
  children: ReactNode;
}

export const BannerProvider: React.FC<BannerProviderProps> = ({ children }) => {
  const [banners, setBanners] = useState<Banner[]>([]);

  const addBanner = useCallback((banner: Omit<Banner, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newBanner: Banner = {
      ...banner,
      id,
      priority: banner.priority || 0,
    };

    setBanners(prev => {
      // If it's a high priority banner (like network status), replace existing ones of same type
      if ((newBanner.priority || 0) > 0) {
        return prev.filter(b => (b.priority || 0) !== (newBanner.priority || 0)).concat(newBanner);
      }
      // Otherwise, just add it
      return [...prev, newBanner];
    });

    return id;
  }, []);

  const removeBanner = useCallback((id: string) => {
    setBanners(prev => prev.filter(banner => banner.id !== id));
  }, []);

  const clearAllBanners = useCallback(() => {
    setBanners([]);
  }, []);

  return (
    <BannerContext.Provider value={{ banners, addBanner, removeBanner, clearAllBanners }}>
      {children}
    </BannerContext.Provider>
  );
};
