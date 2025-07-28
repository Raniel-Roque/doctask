import React, { useState, useRef } from "react";
import { FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import { sanitizeInput } from "./SanitizeInput";
import { NotificationBanner } from "./NotificationBanner";

interface PasswordVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string, signal?: AbortSignal) => Promise<void>;
  title?: string;
  description?: string;
  buttonText?: string;
  loading?: boolean;
  userEmail?: string;
}

const PasswordVerification: React.FC<PasswordVerificationProps> = ({
  isOpen,
  onClose,
  onVerify,
  title = "Verify Password",
  description = "Please enter your current password to continue.",
  buttonText = "Verify Password",
  loading = false,
  userEmail,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setIsVerifying(true);
    setError(null);

    // Create new AbortController for this verification
    abortControllerRef.current = new AbortController();

    try {
      await onVerify(password, abortControllerRef.current.signal);
      // If successful, close the modal
      handleClose();
    } catch (err) {
      // Only set error if the request wasn't aborted
      if (err instanceof Error && err.name !== "AbortError") {
        setError(
          err instanceof Error ? err.message : "Failed to verify password",
        );
      }
    } finally {
      setIsVerifying(false);
      abortControllerRef.current = null;
    }
  };

  const handleClose = () => {
    // Abort any ongoing verification
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setPassword("");
    setShowPassword(false);
    setError(null);
    setIsVerifying(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden username field for accessibility and password managers */}
          {userEmail && (
            <input
              type="email"
              name="username"
              value={userEmail.toLowerCase()}
              readOnly
              style={{ display: "none" }}
              autoComplete="username"
            />
          )}

          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="currentPassword"
                value={password}
                onChange={(e) => {
                  const sanitizedValue = sanitizeInput(e.target.value, {
                    trim: false,
                    removeHtml: true,
                    escapeSpecialChars: true,
                  });
                  setPassword(sanitizedValue);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter your current password"
                autoComplete={showPassword ? "off" : "current-password"}
                autoCorrect="off"
                spellCheck={false}
                disabled={isVerifying || loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isVerifying || loading}
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isVerifying || loading}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || loading || !password.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isVerifying || loading ? "Verifying..." : buttonText}
            </button>
          </div>
        </form>

        <NotificationBanner
          message={error}
          type="error"
          onClose={() => setError(null)}
          autoClose={false}
        />
      </div>
    </div>
  );
};

export default PasswordVerification;
