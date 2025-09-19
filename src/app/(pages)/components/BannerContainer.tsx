"use client";

import { useBannerManager } from "./BannerManager";
import { NotificationBanner } from "./NotificationBanner";

export const BannerContainer: React.FC = () => {
  const { banners, removeBanner } = useBannerManager();

  return (
    <>
      {banners.map((banner) => (
        <NotificationBanner
          key={banner.id}
          message={banner.message}
          type={banner.type}
          onClose={() => {
            removeBanner(banner.id);
            banner.onClose();
          }}
          autoClose={banner.autoClose}
          duration={banner.duration}
          topOffset={20} // All banners at the same position - only one shows at a time
        />
      ))}
    </>
  );
};
