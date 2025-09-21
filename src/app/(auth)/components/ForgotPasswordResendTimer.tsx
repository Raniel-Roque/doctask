import React, { useState, useEffect } from "react";

interface ForgotPasswordResendTimerProps {
  onResend: () => void;
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
      // Rate limit logic
      const rateLimitKey = `forgotPasswordRateLimit_${email}`;
      const rateLimitData = localStorage.getItem(rateLimitKey);
      if (rateLimitData) {
        const { count, resetTime } = JSON.parse(rateLimitData);
        const now = Date.now();
        if (now < resetTime && count >= 3) {
          setRateLimited(true);
          const remainingTime = Math.ceil((resetTime - now) / 1000);
          setTimeLeft(remainingTime);
          setCanResend(false);
          return;
        }
      }
      const resendResult = await onResend();

      // Only start timer and update rate limit if resend was successful
      // The onResend function should return a boolean or throw an error on failure
      if (resendResult !== false) {
        // Only start timer if this is not the first resend
        if (hasResentBefore) {
          // 2 minute timer
          const resetTime = Date.now() + 120000;
          setTimeLeft(120);
          setCanResend(false);
          localStorage.setItem(
            `forgotPasswordResendTimer_${email}`,
            JSON.stringify({ resetTime }),
          );
        } else {
          // First resend - mark that we've resent before but don't start timer
          setHasResentBefore(true);
        }

        // Update rate limit
        const storedRateLimitData = localStorage.getItem(rateLimitKey);
        const now = Date.now();
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
      className="text-sm text-center mt-4"
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
