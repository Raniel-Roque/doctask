"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useRouter, usePathname } from "next/navigation";
import { secureStorage, validators } from "@/lib/secure-storage";

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

export function SessionTimeout() {
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [lastActivity, setLastActivity] = useState(() => {
    // Initialize with a default value to avoid hydration mismatch
    return 0;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initialize from secure storage after mount
    const stored = secureStorage.get<number>(LAST_ACTIVITY_KEY, {
      validate: validators.timestamp,
      defaultValue: Date.now(),
    });
    setLastActivity(stored || Date.now());

    // Clear timestamp if we're on the login page
    if (pathname === "/login") {
      secureStorage.remove(LAST_ACTIVITY_KEY);
      return;
    }

    // Check if session has expired on mount
    const checkInitialTimeout = () => {
      const currentTime = Date.now();
      const storedTime = secureStorage.get<number>(LAST_ACTIVITY_KEY, {
        validate: validators.timestamp,
        defaultValue: currentTime,
      });

      // If there's no stored time or it's very recent (within last 5 minutes),
      // assume this is a fresh login and don't timeout
      const timeSinceLastActivity = currentTime - (storedTime || currentTime);
      const isRecentLogin = timeSinceLastActivity < 5 * 60 * 1000; // 5 minutes

      if (!isRecentLogin && timeSinceLastActivity >= TIMEOUT_DURATION) {
        secureStorage.remove(LAST_ACTIVITY_KEY);
        secureStorage.remove("viewedNotesDocuments");
        secureStorage.remove("viewedNoteCounts");
        signOut();
        router.replace("/login");
        return;
      }
    };

    // Run initial check
    checkInitialTimeout();

    // Function to update last activity timestamp with throttling
    let lastUpdateTime = 0;
    const updateLastActivity = () => {
      const now = Date.now();
      // Throttle updates to once per second to reduce performance impact
      if (now - lastUpdateTime > 1000) {
        lastUpdateTime = now;
        setLastActivity(now);
        secureStorage.set(LAST_ACTIVITY_KEY, now, {
          validate: validators.timestamp,
        });
      }
    };

    // Add event listeners for user activity (reduced list)
    const events = ["mousedown", "keypress", "click", "keydown"];

    events.forEach((event) => {
      window.addEventListener(event, updateLastActivity, { passive: true });
    });

    // Check for timeout
    const checkTimeout = () => {
      const currentTime = Date.now();
      const storedTime = secureStorage.get<number>(LAST_ACTIVITY_KEY, {
        validate: validators.timestamp,
        defaultValue: currentTime,
      });

      const timeSinceLastActivity = currentTime - (storedTime || currentTime);
      if (timeSinceLastActivity >= TIMEOUT_DURATION) {
        secureStorage.remove(LAST_ACTIVITY_KEY);
        secureStorage.remove("viewedNotesDocuments");
        secureStorage.remove("viewedNoteCounts");
        signOut();
        router.replace("/login");
      }
    };

    // Check every 30 seconds instead of 10 to reduce frequency
    const intervalId = setInterval(checkTimeout, 30000);

    // Handle tab/window visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden or window is minimized - don't update activity
        // The timeout will still work based on the last activity timestamp
      } else {
        // Tab becomes visible again - check if session expired while hidden
        checkTimeout();
      }
    };

    // Handle window focus/blur
    const handleFocus = () => {
      // Window gains focus - check if session expired while unfocused
      checkTimeout();
    };

    const handleBlur = () => {
      // Window loses focus - don't update activity
      // The timeout will still work based on the last activity timestamp
    };

    // Handle tab/window close - save current time
    const handleBeforeUnload = () => {
      secureStorage.set(LAST_ACTIVITY_KEY, Date.now(), {
        validate: validators.timestamp,
      });
    };

    // Add visibility and focus event listeners with passive option where possible
    document.addEventListener("visibilitychange", handleVisibilityChange, {
      passive: true,
    });
    window.addEventListener("focus", handleFocus, { passive: true });
    window.addEventListener("blur", handleBlur, { passive: true });
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateLastActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(intervalId);
    };
  }, [lastActivity, signOut, router, pathname]);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return null; // This component doesn't render anything
}
