import { useEffect, useState } from 'react';
import { FaCheckCircle, FaInfoCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';

type BannerType = 'success' | 'info' | 'warning';

interface BannerProps {
  message: string;
  type: BannerType;
  duration?: number;
  onClose?: () => void;
}

const Banner = ({ message, type, duration = 3000, onClose }: BannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (duration) {
      timeoutId = setTimeout(() => {
        setIsVisible(false);
        // Call onClose after animation completes
        setTimeout(() => {
          onClose?.();
        }, 300);
      }, duration);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [duration, onClose]);

  const getBannerStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle size={20} color="#10B981" />;
      case 'info':
        return <FaInfoCircle size={20} color="#3B82F6" />;
      case 'warning':
        return <FaExclamationCircle size={20} color="#F59E0B" />;
      default:
        return <FaInfoCircle size={20} color="#6B7280" />;
    }
  };

  return (
    <div
      className={`fixed top-16 left-0 right-0 z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 border-b ${getBannerStyles()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{message}</p>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              type="button"
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onClose?.(), 300);
              }}
            >
              <span className="sr-only">Close</span>
              <FaTimes size={20} color="#9CA3AF" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner; 