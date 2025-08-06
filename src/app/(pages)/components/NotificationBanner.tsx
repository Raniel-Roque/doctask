import React, { useEffect, useState } from "react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";

interface NotificationBannerProps {
  message: string | null;
  type: "error" | "success" | "warning" | "info";
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  message,
  type,
  onClose,
  autoClose = true,
  duration = type === "error"
    ? 7000 // 7 seconds for errors
    : type === "success"
      ? 5000 // 5 seconds for success
      : 6000, // 6 seconds for warning and info
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      // Ease in
      setIsVisible(true);

      // Auto close if enabled
      if (autoClose) {
        const timer = setTimeout(() => {
          // Ease out
          setIsVisible(false);
          // Wait for animation to complete before calling onClose
          setTimeout(() => {
            onClose();
          }, 300); // Match this with the transition duration
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [message, onClose, autoClose, duration]);

  if (!message) return null;

  const bgColor = {
    error: "bg-red-50 border-red-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
  }[type];

  const textColor = {
    error: "text-red-700",
    success: "text-green-700",
    warning: "text-yellow-700",
    info: "text-blue-700",
  }[type];

  const iconColor = {
    error: "text-red-500",
    success: "text-green-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  }[type];

  const Icon = type === "success" ? FaCheckCircle : FaExclamationCircle;

  return (
    <div
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 ${bgColor} border rounded-lg p-4 shadow-lg flex items-center gap-3 z-[99999] print:hidden transition-all duration-300 ease-in-out min-w-[220px] max-w-max
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
      `}
    >
      <div className={iconColor}>
        <Icon size={20} />
      </div>
      <span className={`${textColor} whitespace-nowrap`}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => {
            onClose();
          }, 300);
        }}
        className={`${iconColor} hover:opacity-80 transition-opacity`}
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};
