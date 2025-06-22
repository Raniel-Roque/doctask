import React from "react";
import {
  FaExclamationTriangle,
  FaKey,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";
import { User } from "./types";

// =========================================
// Types
// =========================================
interface ResetPasswordConfirmationProps {
  user: User | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  networkError: string | null;
}

// =========================================
// Component
// =========================================
export const ResetPasswordConfirmation = ({
  user,
  onCancel,
  onConfirm,
  isSubmitting,
  networkError,
  setNetworkError,
}: ResetPasswordConfirmationProps & {
  setNetworkError?: (err: string | null) => void;
}) => {
  if (!user) return null;

  const handleCancel = () => {
    if (typeof setNetworkError === "function") setNetworkError(null);
    onCancel();
  };

  // =========================================
  // Render
  // =========================================
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border-2 border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <FaExclamationTriangle size={24} color="#EAB308" />
          <h3 className="text-xl font-semibold text-gray-900">
            Reset Password Confirmation
          </h3>
        </div>

        {/* User Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-3 font-medium">
            You are about to reset the password for:
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
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-gray-700">
            A new temporary password will be generated and sent to the
            user&apos;s email address.
          </p>
        </div>

        {/* Error Message */}
        {networkError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {networkError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300 flex items-center gap-2"
            disabled={isSubmitting}
          >
            <FaTimes />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                <FaKey />
                Reset Password
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
