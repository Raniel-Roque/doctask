import { FaExclamationTriangle } from "react-icons/fa";
import { User } from "./types";

// =========================================
// Types
// =========================================
interface DeleteConfirmationProps {
  user: User | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  networkError: string | null;
}

// =========================================
// Component
// =========================================
export const DeleteConfirmation = ({ 
  user, 
  onCancel, 
  onConfirm, 
  isSubmitting = false,
  networkError = null 
}: DeleteConfirmationProps) => {
  if (!user) return null;

  // =========================================
  // Render
  // =========================================
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FaExclamationTriangle />
          Confirm Delete
        </h2>

        {/* Error Message */}
        {networkError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaExclamationTriangle />
              <span>{networkError}</span>
            </div>
          </div>
        )}

        {/* Confirmation Message */}
        <p className="mb-8 text-gray-600">
          Are you sure you want to delete {user.first_name} {user.last_name}? This action cannot be undone.
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}; 