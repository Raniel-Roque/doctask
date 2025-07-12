import { FaLock, FaUnlock, FaTimes, FaSpinner } from "react-icons/fa";
import { User } from "./types";
import { useState } from "react";

interface LockAccountConfirmationProps {
  user: User | null;
  onCancel: () => void;
  onConfirm: (action: "lock" | "unlock") => void;
  isSubmitting: boolean;
  networkError: string | null;
  setNetworkError?: (err: string | null) => void;
}

export const LockAccountConfirmation = ({
  user,
  onCancel,
  onConfirm,
  isSubmitting = false,
  networkError = null,
}: LockAccountConfirmationProps) => {
  const [processingAction, setProcessingAction] = useState<
    "lock" | "unlock" | null
  >(null);

  if (!user) return null;

  const handleCancel = () => {
    onCancel();
  };

  const handleAction = async (action: "lock" | "unlock") => {
    setProcessingAction(action);
    await onConfirm(action);
    setProcessingAction(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isSubmitting}
        >
          <FaTimes size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <FaLock size={24} color="#B54A4A" />
          <h2 className="text-xl font-semibold text-gray-900">
            Account Access Control
          </h2>
        </div>

        <p className="text-gray-600 mb-6">
          Choose an action for {user.first_name} {user.last_name}&apos;s
          account:
        </p>

        {networkError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {networkError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleAction("unlock")}
            className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || processingAction === "lock"}
          >
            {processingAction === "unlock" ? (
              <>
                <div className="animate-spin">
                  <FaSpinner size={16} />
                </div>
                Unlocking Account...
              </>
            ) : (
              <>
                <FaUnlock size={16} />
                Unlock Account
              </>
            )}
          </button>
          <button
            onClick={() => handleAction("lock")}
            className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-[#B54A4A] rounded-md hover:bg-[#9B3F3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || processingAction === "unlock"}
          >
            {processingAction === "lock" ? (
              <>
                <div className="animate-spin">
                  <FaSpinner size={16} />
                </div>
                Locking Account...
              </>
            ) : (
              <>
                <FaLock size={16} />
                Lock Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
