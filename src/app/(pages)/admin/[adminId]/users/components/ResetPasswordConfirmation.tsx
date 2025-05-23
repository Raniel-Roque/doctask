import { FaExclamationTriangle, FaKey } from "react-icons/fa";
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
}: ResetPasswordConfirmationProps) => {
  if (!user) return null;

  // =========================================
  // Render
  // =========================================
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <FaExclamationTriangle />
          <h3 className="text-lg font-semibold">Reset Password Confirmation</h3>
        </div>

        {/* User Information */}
        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            You are about to reset the password for:
          </p>
          <p className="font-medium">
            {user.first_name} {user.middle_name ? `${user.middle_name} ` : ""}
            {user.last_name}
          </p>
          <p className="text-gray-600">{user.email}</p>
        </div>

        {/* Reset Information */}
        <div className="mb-6">
          <p className="text-gray-600">
            A new temporary password will be generated and sent to the user&apos;s email address. 
            The user will be required to change their password upon their next login.
          </p>
        </div>

        {/* Error Message */}
        {networkError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {networkError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            disabled={isSubmitting}
          >
            <FaKey />
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}; 