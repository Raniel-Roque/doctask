import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import { useUser } from "@clerk/clerk-react";

import { useBannerManager } from "./BannerManager";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import PasswordVerification from "./PasswordVerification";
import { calculatePasswordStrength } from "@/utils/passwordStrength";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { apiRequest } from "@/lib/utils";
import { encryptData, generateEncryptionKey } from "@/utils/encryption";

interface ChangePasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePassword({
  isOpen,
  onClose,
}: ChangePasswordProps) {
  const { user, isLoaded } = useUser();
  const { addBanner } = useBannerManager();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle error messages
  useEffect(() => {
    if (error) {
      addBanner({
        message: error,
        type: "error",
        onClose: () => setError(null),
        autoClose: true,
      });
    }
  }, [error, addBanner]);

  // Handle success messages
  useEffect(() => {
    if (success) {
      addBanner({
        message: success,
        type: "success",
        onClose: () => setSuccess(null),
        autoClose: true,
      });
    }
  }, [success, addBanner]);

  const resetForm = () => {
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
    setIsVerified(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVerifyPassword = async (
    password: string,
    signal?: AbortSignal,
  ) => {
    if (!isLoaded || !user) {
      throw new Error("User not loaded");
    }

    // Encrypt password before sending
    const key = await generateEncryptionKey();
    const encryptedPassword = await encryptData(password, key);

    // Verify password with enhanced retry logic
    await apiRequest("/api/clerk/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        currentPassword: encryptedPassword,
        encryptionKey: await crypto.subtle
          .exportKey("raw", key)
          .then((buffer) => Array.from(new Uint8Array(buffer))),
      }),
      signal, // Add the AbortSignal to the fetch request
    });

    setIsVerified(true);
    setSuccess("Password verified. Please enter your new password.");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !user) return;

    // Calculate password strength using NIST guidelines
    const passwordStrength = calculatePasswordStrength(newPassword);

    if (newPassword !== confirmPassword) {
      setError(
        "Passwords do not match. Please make sure both passwords are identical.",
      );
      return;
    }

    // Validate password using NIST standards
    if (!passwordStrength.isAcceptable) {
      setError(passwordStrength.feedback);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Encrypt new password before sending
      const key = await generateEncryptionKey();
      const encryptedPassword = await encryptData(newPassword, key);

      // Update the password using our API endpoint with enhanced retry logic
      await apiRequest("/api/clerk/user-reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: user.id,
          newPassword: encryptedPassword,
          encryptionKey: await crypto.subtle
            .exportKey("raw", key)
            .then((buffer) => Array.from(new Uint8Array(buffer))),
        }),
      });

      setSuccess("Password updated successfully");
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      const errorMessage = getErrorMessage(err, ErrorContexts.resetPassword());
      setError(errorMessage);
      // Don't reset form on failure - let user retry with same new password
      // Keep them in the new password form without requiring re-verification
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
        <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Change Password</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="h-6 w-6" />
            </button>
          </div>

          {!isVerified ? (
            <PasswordVerification
              isOpen={true}
              onClose={handleClose}
              onVerify={handleVerifyPassword}
              title="Verify Current Password"
              description="Please enter your current password to proceed with changing your password."
              buttonText="Verify Password"
              loading={isLoading}
              userEmail={user?.emailAddresses?.[0]?.emailAddress}
            />
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Hidden username field for accessibility and password managers */}
              {user?.emailAddresses?.[0]?.emailAddress && (
                <input
                  type="email"
                  name="username"
                  value={user.emailAddresses[0].emailAddress.toLowerCase()}
                  readOnly
                  style={{ display: "none" }}
                  autoComplete="username"
                />
              )}
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={8}
                    placeholder="Enter your new password"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={8}
                    placeholder="Confirm your new password"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>

              {/* Password Strength Meter */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Password Strength:
                </h4>
                <PasswordStrengthMeter
                  strength={calculatePasswordStrength(newPassword)}
                  showLabel={false}
                  showFeedback={true}
                />

                {/* Password Match Indicator */}
                {confirmPassword.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div
                      className={`flex items-center text-xs ${
                        newPassword === confirmPassword
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <span className="mr-2">
                        {newPassword === confirmPassword ? "✓" : "✗"}
                      </span>
                      {newPassword === confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  isLoading ||
                  !calculatePasswordStrength(newPassword).isAcceptable ||
                  newPassword !== confirmPassword
                }
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
