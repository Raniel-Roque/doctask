"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Banner {
  id: string;
  message: string;
  type: "error" | "success" | "warning" | "info";
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

interface BannerContextType {
  banners: Banner[];
  addBanner: (banner: Omit<Banner, "id">) => string;
  removeBanner: (id: string) => void;
  clearAllBanners: () => void;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export const useBannerManager = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error("useBannerManager must be used within a BannerProvider");
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
    const newBanner = { ...banner, id };
    
    setBanners(prev => {
      // Remove any existing banner of the same type to prevent duplicates
      const filtered = prev.filter(b => b.type !== banner.type);
      return [...filtered, newBanner];
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
