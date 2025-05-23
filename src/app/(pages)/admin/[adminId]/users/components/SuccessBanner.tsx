import { FaCheckCircle, FaTimes } from "react-icons/fa";
import { useEffect, useState } from "react";

interface SuccessBannerProps {
  message: string | null;
  onClose: () => void;
}

export const SuccessBanner = ({ message, onClose }: SuccessBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setIsExiting(false);
    } else {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match this with the transition duration
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!isVisible && !message) return null;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match this with the transition duration
  };

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70]">
      <div 
        className={`
          flex items-center gap-3 px-6 py-4 rounded-lg border bg-green-50 border-green-200 shadow-lg
          transform transition-all duration-300 ease-in-out
          ${isExiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
        `}
      >
        <div className="text-green-600">
          <FaCheckCircle />
        </div>
        <span className="text-gray-700">{message}</span>
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