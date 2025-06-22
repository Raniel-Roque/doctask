import { FaSignOutAlt, FaTimes, FaSpinner } from "react-icons/fa";

interface LogoutConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export const LogoutConfirmation = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: LogoutConfirmationProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <FaSignOutAlt size={24} color="#B54A4A" />
          <h2 className="text-xl font-semibold text-gray-900">
            Confirm Logout
          </h2>
        </div>

        <p className="text-gray-600 mb-6">
          Are you sure you want to log out? You will need to log in again to
          access your account.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            <FaTimes size={16} />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 text-white bg-[#B54A4A] rounded-md hover:bg-[#9B3F3F] transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin">
                  <FaSpinner size={16} />
                </div>
                Logging out...
              </>
            ) : (
              <>
                <FaSignOutAlt size={16} />
                Logout
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
