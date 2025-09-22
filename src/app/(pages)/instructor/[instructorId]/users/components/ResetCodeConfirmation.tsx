import React, { useEffect } from "react";
import {
  FaExclamationTriangle,
  FaSync,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import { User } from "./types";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";

// =========================================
// Types
// =========================================
interface ResetCodeConfirmationProps {
  user: User | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  networkError?: string | null;
}

// =========================================
// Component
// =========================================
export const ResetCodeConfirmation = ({
  user,
  onCancel,
  onConfirm,
  isSubmitting = false,
  networkError = null,
}: ResetCodeConfirmationProps) => {
  const { addBanner } = useBannerManager();

  // Handle network errors
  useEffect(() => {
    if (networkError) {
      const errorMessage = getErrorMessage(
        new Error(networkError),
        ErrorContexts.resetCode("adviser"),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    }
  }, [networkError, addBanner]);

  if (!user) return null;

  const handleCancel = () => {
    onCancel();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  // =========================================
  // Render
  // =========================================
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border-2 border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle size={24} color="#EAB308" />
            <h3 className="text-xl font-semibold text-gray-900">
              Reset Adviser Code Confirmation
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* User Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-3 font-medium">
            You are about to reset the adviser code for:
          </p>
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">
              {user.first_name} {user.middle_name ? `${user.middle_name} ` : ""}
              {user.last_name}
            </p>
            <p className="text-gray-600 text-sm">{user.email}</p>
          </div>
        </div>

        {/* Reset Information */}
        <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-gray-700">
            A new unique adviser code will be generated and the old code will be invalidated. 
            The adviser will need to use the new code for future operations.
          </p>
        </div>

        {/* Error Message */}
        {networkError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaExclamationTriangle />
              <span>{networkError}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300 flex items-center gap-2"
            disabled={isSubmitting}
          >
            <FaTimes />
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin">
                  <FaSpinner />
                </div>
                Resetting...
              </>
            ) : (
              <>
                <FaSync />
                Reset Code
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
