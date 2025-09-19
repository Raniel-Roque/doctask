"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBanner } from "@/app/(pages)/components/BannerContext";
import { apiRequest } from "@/lib/utils";

// Custom hook to safely use banner context
function useBannerSafe() {
  try {
    return useBanner();
  } catch {
    return null;
  }
}

type NetworkState =
  | { status: "online"; unstable: boolean }
  | { status: "offline"; unstable: false };

const HEALTH_ENDPOINT = "/api/health";

export function NetworkStatusBanner() {
  const [state, setState] = useState<NetworkState>(() => ({
    status: "online", // Default to online to avoid hydration mismatch
    unstable: false,
  }));
  const [mounted, setMounted] = useState(false);
  const [details, setDetails] = useState<string | null>(null);
  const [bannerId, setBannerId] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Use banner context safely
  const bannerContext = useBannerSafe();
  const addBanner = bannerContext?.addBanner;
  const removeBanner = bannerContext?.removeBanner;

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
      // Remove existing banner when connection is restored
      if (bannerId && removeBanner) {
        removeBanner(bannerId);
        setBannerId(null);
      }
    };
    const handleOffline = () => {
      setState({ status: "offline", unstable: false });
      setDetails("You appear to be offline");
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
  }, [startHealthChecks, bannerId, removeBanner]);

  // Manage banner display based on network state
  useEffect(() => {
    if (!mounted || !addBanner || !removeBanner) return;

    const shouldShowBanner = isOffline || isUnstable;
    const message = isOffline
      ? "You are offline."
      : details || "Connection is unstable. Trying to reconnect...";
    const type = isOffline ? "error" : ("warning" as const);

    if (shouldShowBanner && !bannerId) {
      // Add new banner
      const id = addBanner({
        message,
        type,
        priority: 10, // High priority for network status
        autoClose: false,
        onClose: () => {
          if (bannerId) {
            removeBanner(bannerId);
            setBannerId(null);
          }
        },
      });
      setBannerId(id);
    } else if (!shouldShowBanner && bannerId) {
      // Remove banner when network is stable
      removeBanner(bannerId);
      setBannerId(null);
    } else if (shouldShowBanner && bannerId) {
      // Update existing banner message if needed
      removeBanner(bannerId);
      const id = addBanner({
        message,
        type,
        priority: 10,
        autoClose: false,
        onClose: () => {
          if (bannerId) {
            removeBanner(bannerId);
            setBannerId(null);
          }
        },
      });
      setBannerId(id);
    }
  }, [mounted, isOffline, isUnstable, details, bannerId, addBanner, removeBanner]);

  // Don't render anything - the banner is managed by the context
  return null;
}
