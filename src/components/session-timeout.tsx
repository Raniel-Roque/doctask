"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useRouter, usePathname } from "next/navigation";

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

export function SessionTimeout() {
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [lastActivity, setLastActivity] = useState(() => {
    // Initialize from localStorage or current time
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored) : Date.now();
  });

  useEffect(() => {
    // Clear timestamp if we're on the login page
    if (pathname === "/login") {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      return;
    }

    // Check if session has expired on mount
    const checkInitialTimeout = () => {
      const currentTime = Date.now();
      const storedTime = localStorage.getItem(LAST_ACTIVITY_KEY);

      if (storedTime) {
        const timeSinceLastActivity = currentTime - parseInt(storedTime);
        if (timeSinceLastActivity >= TIMEOUT_DURATION) {
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          localStorage.removeItem("viewedNotesDocuments");
          localStorage.removeItem("viewedNoteCounts");
          signOut();
          router.replace("/login");
          return;
        }
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
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
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
      const storedTime = localStorage.getItem(LAST_ACTIVITY_KEY);

      if (storedTime) {
        const timeSinceLastActivity = currentTime - parseInt(storedTime);

        if (timeSinceLastActivity >= TIMEOUT_DURATION) {
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          localStorage.removeItem("viewedNotesDocuments");
          localStorage.removeItem("viewedNoteCounts");
          signOut();
          router.replace("/login");
        }
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
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
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

  return null; // This component doesn't render anything
}
