import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

interface UnsavedChangesConfirmationProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export const UnsavedChangesConfirmation: React.FC<
  UnsavedChangesConfirmationProps
> = ({ isOpen, onContinue, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-yellow-500">
            <FaExclamationTriangle size={20} />
          </div>
          <h3 className="text-lg font-semibold">Unsaved Changes</h3>
        </div>
        <p className="text-gray-600 mb-6">
          You have unsaved changes. Are you sure you want to leave? Your changes
          will be lost.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};
