import { FaExclamationTriangle, FaKey } from "react-icons/fa";
import { Adviser } from "./types";

interface ResetPasswordConfirmationProps {
  user: Adviser | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  networkError: string | null;
}

export const ResetPasswordConfirmation = ({
  user,
  onCancel,
  onConfirm,
  isSubmitting,
  networkError,
}: ResetPasswordConfirmationProps) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <FaExclamationTriangle />
          <h3 className="text-lg font-semibold">Reset Password Confirmation</h3>
        </div>

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

        <div className="mb-6">
          <p className="text-gray-600">
            A new temporary password will be generated and sent to the user&apos;s email address. 
            The user will be required to change their password upon their next login.
          </p>
        </div>

        {networkError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {networkError}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              isSubmitting ? 'bg-yellow-400 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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