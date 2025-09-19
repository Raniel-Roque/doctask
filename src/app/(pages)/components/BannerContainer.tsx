"use client";

import React from "react";
import { useBanner } from "./BannerContext";
import { NotificationBanner } from "./NotificationBanner";

export const BannerContainer: React.FC = () => {
  const { banners } = useBanner();

  // Sort banners by priority (highest first) and then by order added
  const sortedBanners = banners.sort((a, b) => {
    if (a.priority !== b.priority) {
      return (b.priority || 0) - (a.priority || 0);
    }
    return banners.indexOf(a) - banners.indexOf(b);
  });

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[99999] print:hidden">
      {sortedBanners.map((banner, index) => (
        <div
          key={banner.id}
          className="mb-2"
          style={{
            transform: `translateY(${index * 4}px)`, // Slight offset for visual separation
          }}
        >
          <NotificationBanner
            message={banner.message}
            type={banner.type}
            onClose={() => banner.onClose()}
            autoClose={banner.autoClose}
            duration={banner.duration}
          />
        </div>
      ))}
    </div>
  );
};
