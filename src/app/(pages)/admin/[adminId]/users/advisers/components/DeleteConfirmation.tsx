import { FaExclamationTriangle, FaTrash } from "react-icons/fa";
import { Adviser } from "./types";

interface DeleteConfirmationProps {
  user: Adviser | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  networkError?: string | null;
}

export const DeleteConfirmation = ({ 
  user, 
  onCancel, 
  onConfirm, 
  isSubmitting = false,
  networkError = null 
}: DeleteConfirmationProps) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FaExclamationTriangle />
          Confirm Delete
        </h2>
        {networkError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaExclamationTriangle />
              <span>{networkError}</span>
            </div>
          </div>
        )}
        <p className="mb-8 text-gray-600">
          Are you sure you want to delete {user.first_name} {user.last_name}? This action cannot be undone.
        </p>
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
            disabled={isSubmitting}
            className={`px-6 py-2 text-white rounded-lg transition-colors border-2 flex items-center gap-2 ${
              isSubmitting 
                ? 'bg-red-400 border-red-400 cursor-not-allowed' 
                : 'bg-red-600 border-red-500 hover:bg-red-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <FaTrash />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 