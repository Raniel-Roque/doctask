import { FaCheckCircle, FaTimes } from "react-icons/fa";
import { useEffect, useState, useCallback } from "react";

// =========================================
// Types
// =========================================
interface SuccessBannerProps {
  message: string | null;
  onClose: () => void;
}

// =========================================
// Component
// =========================================
export const SuccessBanner = ({ message, onClose }: SuccessBannerProps) => {
  // =========================================
  // State
  // =========================================
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // =========================================
  // Event Handlers
  // =========================================
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); 
  }, [onClose]);

  // =========================================
  // Effects
  // =========================================
  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setIsExiting(false);
      
      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); 
      return () => clearTimeout(timer);
    }
  }, [message, handleClose]);

  if (!isVisible && !message) return null;

  // =========================================
  // Render
  // =========================================
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70]">
      <div 
        className={`
          flex items-center gap-3 px-6 py-4 rounded-lg border bg-green-50 border-green-200 shadow-lg
          transform transition-all duration-300 ease-in-out
          ${isExiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
        `}
      >
        {/* Success Icon */}
        <div className="text-green-600">
          <FaCheckCircle />
        </div>

        {/* Message */}
        <span className="text-gray-700">{message}</span>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
}; 