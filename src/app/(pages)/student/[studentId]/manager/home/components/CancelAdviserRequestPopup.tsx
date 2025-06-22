import React from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

interface CancelAdviserRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export const CancelAdviserRequestPopup: React.FC<
  CancelAdviserRequestPopupProps
> = ({ isOpen, onClose, onConfirm, isSubmitting = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <FaExclamationTriangle size={24} className="text-red-600" />
          Cancel Adviser Request
        </h2>
        <p className="mb-8 text-gray-600">
          Are you sure you want to cancel your adviser request?
        </p>
        <div className="flex justify-end gap-4 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300 flex items-center gap-2"
            disabled={isSubmitting}
          >
            <FaTimes />
            No, keep request
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isSubmitting}
          >
            Yes, cancel
          </button>
        </div>
      </div>
    </div>
  );
};
