import { FaExclamationTriangle } from "react-icons/fa";

interface CancelConfirmationProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
  className?: string;
}

export const CancelConfirmation = ({
  isOpen,
  onContinue,
  onCancel,
  className = ""
}: CancelConfirmationProps) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <FaExclamationTriangle />
          <h3 className="text-lg font-semibold">Unsaved Changes</h3>
        </div>
        <p className="text-gray-600 mb-6">
          You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onContinue}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Continue Editing
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}; 