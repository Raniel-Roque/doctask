import { FaExclamationTriangle } from "react-icons/fa";
import { useEffect, useState } from "react";

// =========================================
// Types
// =========================================
interface ValidationErrorProps {
  error: string | null;
  onClose: () => void;
  className?: string;
}

// =========================================
// Component
// =========================================
export const ValidationError = ({
  error,
  onClose,
  className = "",
}: ValidationErrorProps) => {
  // =========================================
  // State
  // =========================================
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // =========================================
  // Effects
  // =========================================
  useEffect(() => {
    if (error) {
      setIsVisible(true);
      setIsExiting(false);
    } else {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!isVisible && !error) return null;

  // =========================================
  // Event Handlers
  // =========================================
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // =========================================
  // Render
  // =========================================
  return (
    <div
      className={`
        fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${className}
        transition-opacity duration-300 ease-in-out
        ${isExiting ? "opacity-0" : "opacity-100"}
      `}
    >
      <div
        className={`
          bg-white rounded-lg p-6 max-w-md w-full mx-4
          transform transition-all duration-300 ease-in-out
          ${isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-red-600">
            <FaExclamationTriangle />
            <h3 className="text-lg font-semibold">Validation Error</h3>
          </div>
        </div>

        {/* Error Message */}
        <p className="text-gray-600">{error}</p>

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
