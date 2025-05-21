import { FaExclamationTriangle } from "react-icons/fa";

interface CancelConfirmationProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
  className?: string;
}

export const CancelConfirmation = ({ isOpen, onContinue, onCancel, className = "" }: CancelConfirmationProps) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-yellow-500">
            <FaExclamationTriangle />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Cancel Adding Adviser?</h2>
        </div>
        <p className="mb-8 text-gray-600">
          The adviser is currently being added. Are you sure you want to cancel? This may leave the process in an incomplete state.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onContinue}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
          >
            Continue Adding
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors border-2 border-red-500"
          >
            Cancel Anyway
          </button>
        </div>
      </div>
    </div>
  );
}; 