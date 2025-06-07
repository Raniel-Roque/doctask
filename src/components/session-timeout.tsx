"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

export function SessionTimeout() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [lastActivity, setLastActivity] = useState(() => {
    // Initialize from localStorage or current time
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored) : Date.now();
  });

  useEffect(() => {    
    // Check if session has expired on mount
    const checkInitialTimeout = () => {
      const currentTime = Date.now();
      const storedTime = localStorage.getItem(LAST_ACTIVITY_KEY);
      
      if (storedTime) {
        const timeSinceLastActivity = currentTime - parseInt(storedTime);        
        if (timeSinceLastActivity >= TIMEOUT_DURATION) {
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          signOut();
          router.push("/login");
          return;
        }
      }
    };

    // Run initial check
    checkInitialTimeout();
    
    // Function to update last activity timestamp
    const updateLastActivity = () => {
      const newTime = Date.now();
      setLastActivity(newTime);
      localStorage.setItem(LAST_ACTIVITY_KEY, newTime.toString());
    };

    // Add event listeners for user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown"
    ];

    events.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });

    // Check for timeout
    const checkTimeout = () => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivity;

      if (timeSinceLastActivity >= TIMEOUT_DURATION) {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        signOut();
        router.push("/login");
      }
    };

    // Check every 10 seconds
    const intervalId = setInterval(checkTimeout, 10000);

    // Handle tab/window close
    const handleBeforeUnload = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, lastActivity.toString());
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(intervalId);
    };
  }, [lastActivity, signOut, router]);

  return null; // This component doesn't render anything
} 