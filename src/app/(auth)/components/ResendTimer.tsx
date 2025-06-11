import React, { useState, useEffect } from 'react';

interface ResendTimerProps {
  onResend: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const ResendTimer: React.FC<ResendTimerProps> = ({ onResend, disabled = false, loading = false }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleResend = () => {
    if (canResend && !loading) {
      onResend();
      setTimeLeft(300);
      setCanResend(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={!canResend || loading || disabled}
      className="font-medium text-red-200 hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {canResend
        ? "Didn't receive a code? Click here to resend"
        : `Resend code in ${formatTime(timeLeft)}`}
    </button>
  );
};

export default ResendTimer; 