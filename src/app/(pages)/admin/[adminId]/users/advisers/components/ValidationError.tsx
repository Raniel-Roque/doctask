import { FaExclamationTriangle } from "react-icons/fa";

interface ValidationErrorProps {
  error: string | null;
  onClose: () => void;
  className?: string;
}

export const ValidationError = ({ error, onClose, className = "" }: ValidationErrorProps) => {
  if (!error) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-red-500">
            <FaExclamationTriangle />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Register Error</h2>
        </div>
        <p className="mb-8 text-gray-600">
          {error}
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors border-2 border-blue-500"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}; 