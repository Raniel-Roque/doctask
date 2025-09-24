"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { apiRequest } from "@/lib/utils";

type NetworkState =
  | { status: "online"; unstable: boolean }
  | { status: "offline"; unstable: false };

const HEALTH_ENDPOINT = "/api/health";

export function NetworkStatusBanner() {
  const { addBanner, removeBanner, clearAllBanners } = useBannerManager();
  const [state, setState] = useState<NetworkState>(() => ({
    status: "online", // Default to online to avoid hydration mismatch
    unstable: false,
  }));
  const [mounted, setMounted] = useState(false);
  const [details, setDetails] = useState<string | null>(null);
  const [bannerId, setBannerId] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const isOffline = state.status === "offline";
  const isUnstable = state.status === "online" && state.unstable;

  const startHealthChecks = useMemo(
    () => () => {
      if (intervalRef.current !== null) return;
      // Check periodically for connectivity and backend reachability
      // Faster checks when offline; slower when online
      const tick = async () => {
        try {
          // Check health endpoint with enhanced retry logic
          await apiRequest(HEALTH_ENDPOINT, {
            method: "GET",
            cache: "no-store",
          });
          // If we reach here, internet and backend are reachable
          setState({ status: "online", unstable: false });
          setDetails(null);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          // If the browser reports online but request fails, treat as unstable
          if (typeof navigator !== "undefined" && navigator.onLine) {
            setState({ status: "online", unstable: true });
            setDetails(
              message.includes("abort")
                ? "Network timeout while contacting server"
                : message.includes("Circuit breaker is OPEN")
                  ? "Service temporarily unavailable - circuit breaker is open"
                  : `Cannot reach server: ${message}`,
            );
          } else {
            setState({ status: "offline", unstable: false });
            setDetails("You appear to be offline");
          }
        }
      };

      // Initial immediate check
      void tick();
      // Polling cadence changes based on state on each tick
      intervalRef.current = window.setInterval(
        () => {
          void tick();
        },
        isOffline ? 5000 : 15000,
      );
    },
    [isOffline],
  );

  useEffect(() => {
    setMounted(true);

    // Set initial state based on actual navigator status after mount
    if (typeof navigator !== "undefined") {
      setState({
        status: navigator.onLine ? "online" : "offline",
        unstable: false,
      });
    }

    const handleOnline = () => {
      setState({ status: "online", unstable: false });
      setDetails(null);
      // Clear all banners when connection is fully restored
      clearAllBanners();
      setBannerId(null);
    };
    const handleOffline = () => {
      setState({ status: "offline", unstable: false });
      setDetails("You appear to be offline");
      // Remove existing banner when going offline
      if (bannerId) {
        removeBanner(bannerId);
        setBannerId(null);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    startHealthChecks();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startHealthChecks, bannerId, removeBanner, clearAllBanners]);

  // Manage banner display based on network state
  useEffect(() => {
    if (!mounted) return;

    const shouldShowBanner = isOffline || isUnstable;
    const message = isOffline
      ? "You are offline."
      : details || "Connection is unstable. Trying to reconnect...";
    const type = isOffline ? "error" : ("warning" as const);

    if (shouldShowBanner && !bannerId) {
      // Add new banner with high priority to override all other banners
      const id = addBanner({
        message,
        type,
        onClose: () => {
          // Banner was dismissed by user
        },
        autoClose: false,
        priority: "high", // Network status banners have high priority
      });
      setBannerId(id);
    } else if (!shouldShowBanner && bannerId) {
      // Remove banner when network is stable and clear all banners
      clearAllBanners();
      setBannerId(null);
    }
  }, [
    mounted,
    isOffline,
    isUnstable,
    details,
    bannerId,
    addBanner,
    removeBanner,
    clearAllBanners,
  ]);

  // Don't render anything - the banner is managed by BannerContainer
  return null;
}
