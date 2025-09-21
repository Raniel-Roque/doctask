import { FaLock, FaUnlock, FaTimes, FaSpinner } from "react-icons/fa";
import { User } from "./types";
import { useState, useEffect } from "react";

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
  const [isLocked, setIsLocked] = useState<boolean | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Fetch the current locked status from Clerk when component mounts
  useEffect(() => {
    const fetchLockStatus = async () => {
      if (!user?.clerk_id) {
        setIsLoadingStatus(false);
        return;
      }

      try {
        setIsLoadingStatus(true);
        const response = await fetch(`/api/clerk/get-user-status?userId=${user.clerk_id}`);
        
        if (response.ok) {
          const data = await response.json();
          setIsLocked(data.locked || false);
        } else {
          // Default to unlocked if API fails
          setIsLocked(false);
        }
      } catch (error) {
        console.error('Error fetching user lock status:', error);
        // Default to unlocked if there's an error
        setIsLocked(false);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    fetchLockStatus();
  }, [user?.clerk_id]);

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
          type="button"
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
          {isLoadingStatus ? (
            "Loading account status..."
          ) : isLocked ? (
            `${user.first_name} ${user.last_name}'s account is currently locked.`
          ) : (
            `${user.first_name} ${user.last_name}'s account is currently unlocked.`
          )}
        </p>

        {networkError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {networkError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isLoadingStatus ? (
            <div className="flex items-center justify-center gap-2 px-4 py-2 text-gray-500">
              <div className="animate-spin">
                <FaSpinner size={16} />
              </div>
              Loading account status...
            </div>
          ) : isLocked ? (
            // Show only unlock button if account is locked
            <button
              type="button"
              onClick={() => handleAction("unlock")}
              className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
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
          ) : (
            // Show only lock button if account is unlocked
            <button
              type="button"
              onClick={() => handleAction("lock")}
              className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-[#B54A4A] rounded-md hover:bg-[#9B3F3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
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
          )}
        </div>
      </div>
    </div>
  );
};
