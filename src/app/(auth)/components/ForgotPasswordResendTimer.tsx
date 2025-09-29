import React, { useState, useEffect } from "react";

interface ForgotPasswordResendTimerProps {
  onResend: () => Promise<boolean>;
  disabled?: boolean;
  loading?: boolean;
  email: string;
}

const ForgotPasswordResendTimer: React.FC<ForgotPasswordResendTimerProps> = ({
  onResend,
  disabled = false,
  loading = false,
  email,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [rateLimited, setRateLimited] = useState(false);
  const [hasResentBefore, setHasResentBefore] = useState(false);

  // Check timer on mount and when loading state changes
  useEffect(() => {
    const checkTimer = () => {
      const storedTimer = localStorage.getItem(
        `forgotPasswordResendTimer_${email}`,
      );
      if (storedTimer) {
        const { resetTime } = JSON.parse(storedTimer);
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((resetTime - now) / 1000));
        if (remaining > 0) {
          setTimeLeft(remaining);
          setCanResend(false);
          setHasResentBefore(true);
          return true; // Timer found and active
        } else {
          localStorage.removeItem(`forgotPasswordResendTimer_${email}`);
        }
      }
      setTimeLeft(0);
      setCanResend(true);
      return false; // No active timer
    };

    // Check immediately
    checkTimer();

    // Check after loading state changes to catch async timer setting
    if (!loading) {
      const timer = setTimeout(() => {
        checkTimer();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [email, loading]);

  // Countdown timer with reduced frequency for better performance
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            localStorage.removeItem(`forgotPasswordResendTimer_${email}`);
            return 0;
          }
          return prev - 1;
        });
      }, 2000); // Changed from 1000ms to 2000ms to reduce frequency
      return () => clearInterval(timer);
    }
  }, [timeLeft, email]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleResend = async () => {
    if (!canResend || loading || disabled) return;
    try {
      // Enhanced rate limit logic with session-based tracking
      const rateLimitKey = `forgotPasswordRateLimit_${email}`;
      const sessionKey = `sessionForgotPasswordRateLimit_${email}`;
      const now = Date.now();

      // Check both regular rate limit and session-based rate limit
      const rateLimitData = localStorage.getItem(rateLimitKey);
      const sessionData = localStorage.getItem(sessionKey);

      // Check regular rate limit (3 attempts per 5 minutes)
      if (rateLimitData) {
        const { count, resetTime } = JSON.parse(rateLimitData);
        if (now < resetTime && count >= 3) {
          setRateLimited(true);
          const remainingTime = Math.ceil((resetTime - now) / 1000);
          setTimeLeft(remainingTime);
          setCanResend(false);
          return;
        }
      }

      // Check session-based rate limit (prevents navigation bypass)
      if (sessionData) {
        const { count, resetTime: sessionResetTime } = JSON.parse(sessionData);
        if (now < sessionResetTime && count >= 3) {
          setRateLimited(true);
          const remainingTime = Math.ceil((sessionResetTime - now) / 1000);
          setTimeLeft(remainingTime);
          setCanResend(false);
          return;
        }
      }

      const resendResult = await onResend();

      // Only start timer and update rate limit if resend was successful
      // The onResend function should return a boolean or throw an error on failure
      if (resendResult !== false) {
        // Start timer on first resend attempt
        if (!hasResentBefore) {
          // First resend - start timer immediately
          setHasResentBefore(true);
          const resetTime = Date.now() + 120000;
          setTimeLeft(120);
          setCanResend(false);
          localStorage.setItem(
            `forgotPasswordResendTimer_${email}`,
            JSON.stringify({ resetTime }),
          );
        } else {
          // Subsequent resends - start timer
          const resetTime = Date.now() + 120000;
          setTimeLeft(120);
          setCanResend(false);
          localStorage.setItem(
            `forgotPasswordResendTimer_${email}`,
            JSON.stringify({ resetTime }),
          );
        }

        // Update both regular and session-based rate limits
        const storedRateLimitData = localStorage.getItem(rateLimitKey);
        const storedSessionData = localStorage.getItem(sessionKey);
        const now = Date.now();

        // Update regular rate limit
        if (storedRateLimitData) {
          const { count, resetTime: oldResetTime } =
            JSON.parse(storedRateLimitData);
          if (now < oldResetTime) {
            localStorage.setItem(
              rateLimitKey,
              JSON.stringify({ count: count + 1, resetTime: oldResetTime }),
            );
          } else {
            localStorage.setItem(
              rateLimitKey,
              JSON.stringify({ count: 1, resetTime: now + 300000 }),
            );
          }
        } else {
          localStorage.setItem(
            rateLimitKey,
            JSON.stringify({ count: 1, resetTime: now + 300000 }),
          );
        }

        // Update session-based rate limit (longer duration to prevent navigation bypass)
        if (storedSessionData) {
          const { count, resetTime: oldSessionResetTime } =
            JSON.parse(storedSessionData);
          if (now < oldSessionResetTime) {
            localStorage.setItem(
              sessionKey,
              JSON.stringify({
                count: count + 1,
                resetTime: oldSessionResetTime,
              }),
            );
          } else {
            localStorage.setItem(
              sessionKey,
              JSON.stringify({ count: 1, resetTime: now + 600000 }), // 10 minutes
            );
          }
        } else {
          localStorage.setItem(
            sessionKey,
            JSON.stringify({ count: 1, resetTime: now + 600000 }), // 10 minutes
          );
        }
        setRateLimited(false);
      }
    } catch (error) {
      // Handle any errors from the onResend function
      console.error("Error in forgot password resend timer:", error);
      // Don't show error here as the parent component should handle it
    }
  };

  return (
    <div
      className={`text-sm text-center mt-4 ${
        canResend && !loading && !disabled ? "hover:underline" : ""
      }`}
      style={{
        cursor: canResend && !loading && !disabled ? "pointer" : "default",
        color: "#fff",
      }}
      onClick={() => {
        if (canResend && !loading && !disabled) handleResend();
      }}
    >
      {canResend
        ? rateLimited
          ? "Rate limit exceeded. Please wait."
          : "Didn't receive a code? Click here to send a new code"
        : `Send new code in ${formatTime(timeLeft)}`}
    </div>
  );
};

export default ForgotPasswordResendTimer;
