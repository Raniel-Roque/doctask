import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';

interface SuccessBannerProps {
  message: string | null;
  onClose: () => void;
}

export const SuccessBanner: React.FC<SuccessBannerProps> = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show banner for non-error messages
    if (message && !message.toLowerCase().includes('error') && !message.toLowerCase().includes('failed')) {
      // Ease in
      setIsVisible(true);
      
      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        // Ease out
        setIsVisible(false);
        // Wait for animation to complete before calling onClose
        setTimeout(() => {
          onClose();
        }, 300); // Match this with the transition duration
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message || message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) return null;

  return (
    <div 
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3 z-50 transition-all duration-300 ease-in-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="text-green-500">
        <FaCheckCircle size={20} />
      </div>
      <span className="text-green-700">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => {
            onClose();
          }, 300);
        }}
        className="text-green-500 hover:text-green-700 transition-colors"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
}; 