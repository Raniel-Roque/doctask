"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";

type NetworkState =
  | { status: "online"; unstable: boolean }
  | { status: "offline"; unstable: false };

const HEALTH_ENDPOINT = "/api/health";

export function NetworkStatusBanner() {
  const [state, setState] = useState<NetworkState>(() => ({
    status: typeof navigator !== "undefined" && navigator.onLine
      ? "online"
      : "offline",
    unstable: false,
  }));
  const [details, setDetails] = useState<string | null>(null);
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
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(HEALTH_ENDPOINT, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      intervalRef.current = window.setInterval(() => {
        void tick();
      }, isOffline ? 5000 : 15000);
    },
    [isOffline],
  );

  useEffect(() => {
    const handleOnline = () => {
      setState({ status: "online", unstable: false });
      setDetails(null);
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
  }, [startHealthChecks]);

  if (!isOffline && !isUnstable) return null;

  const message = isOffline
    ? "You are offline."
    : details || "Connection is unstable. Trying to reconnect...";

  const type = isOffline ? "error" : "warning" as const;

  return (
    <NotificationBanner
      message={message}
      type={type}
      onClose={() => { /* persist banner until state changes */ }}
      autoClose={false}
    />
  );
}


