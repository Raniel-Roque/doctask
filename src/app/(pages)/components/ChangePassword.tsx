import React, { useState } from "react";
import { FaEye, FaEyeSlash, FaTimes, FaCheck } from "react-icons/fa";
import { useUser } from "@clerk/clerk-react";

import { NotificationBanner } from "./NotificationBanner";
import PasswordVerification from "./PasswordVerification";

interface ChangePasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePassword({
  isOpen,
  onClose,
}: ChangePasswordProps) {
  const { user, isLoaded } = useUser();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    const response = await fetch("/api/clerk/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        currentPassword: password,
      }),
      signal, // Add the AbortSignal to the fetch request
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to verify password");
    }

    setIsVerified(true);
    setSuccess("Password verified. Please enter your new password.");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !user) return;

    if (newPassword !== confirmPassword) {
      setError(
        "Passwords do not match. Please make sure both passwords are identical.",
      );
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setError("Password is too weak. Please use at least 8 characters.");
      return;
    }

    // Validate password complexity requirements
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/.test(
      newPassword,
    );

    if (!hasLowercase) {
      setError("Password must contain at least 1 lowercase character.");
      return;
    }

    if (!hasUppercase) {
      setError("Password must contain at least 1 uppercase character.");
      return;
    }

    if (!hasNumber) {
      setError("Password must contain at least 1 number.");
      return;
    }

    if (!hasSpecialChar) {
      setError(
        "Password must contain at least 1 special character (!@#$%^&*).",
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update the password using our API endpoint
      const updateResponse = await fetch("/api/clerk/user-reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: user.id,
          newPassword: newPassword,
        }),
      });

      const data = await updateResponse.json();

      if (!updateResponse.ok) {
        // Check for compromised/weak password error
        if (
          data.error?.toLowerCase().includes("compromised") ||
          data.error?.toLowerCase().includes("data breach") ||
          data.error?.toLowerCase().includes("found in breach") ||
          data.error?.toLowerCase().includes("pwned") ||
          data.error?.toLowerCase().includes("weak") ||
          data.error?.toLowerCase().includes("common") ||
          data.error?.includes("password_strength") ||
          data.error?.includes("weak_password") ||
          data.error?.includes("password is too weak") ||
          data.error?.includes("password_validation") ||
          data.error?.toLowerCase().includes("too common") ||
          data.error?.toLowerCase().includes("password is too common")
        ) {
          throw new Error(
            "Password is too weak. Please choose a stronger password.",
          );
        }
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess("Password updated successfully");
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
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
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-chrome-autofill="off"
                    data-chrome-password-manager="off"
                    data-chrome-breach-detection="off"
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
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-chrome-autofill="off"
                    data-chrome-password-manager="off"
                    data-chrome-breach-detection="off"
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

              {/* Password Requirements */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Password Requirements:
                </h4>
                <div className="space-y-1 text-xs">
                  {(() => {
                    const hasLowercase = /[a-z]/.test(newPassword);
                    const hasUppercase = /[A-Z]/.test(newPassword);
                    const hasNumber = /\d/.test(newPassword);
                    const hasSpecialChar =
                      /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/.test(newPassword);
                    const hasMinLength = newPassword.length >= 8;
                    const passwordsMatch =
                      newPassword === confirmPassword &&
                      confirmPassword.length > 0;

                    return (
                      <>
                        <div
                          className={`flex items-center ${hasMinLength ? "text-green-600" : "text-gray-500"}`}
                        >
                          {hasMinLength ? (
                            <FaCheck className="mr-2" />
                          ) : (
                            <FaTimes className="mr-2" />
                          )}
                          At least 8 characters
                        </div>
                        <div
                          className={`flex items-center ${hasLowercase ? "text-green-600" : "text-gray-500"}`}
                        >
                          {hasLowercase ? (
                            <FaCheck className="mr-2" />
                          ) : (
                            <FaTimes className="mr-2" />
                          )}
                          At least 1 lowercase character
                        </div>
                        <div
                          className={`flex items-center ${hasUppercase ? "text-green-600" : "text-gray-500"}`}
                        >
                          {hasUppercase ? (
                            <FaCheck className="mr-2" />
                          ) : (
                            <FaTimes className="mr-2" />
                          )}
                          At least 1 uppercase character
                        </div>
                        <div
                          className={`flex items-center ${hasNumber ? "text-green-600" : "text-gray-500"}`}
                        >
                          {hasNumber ? (
                            <FaCheck className="mr-2" />
                          ) : (
                            <FaTimes className="mr-2" />
                          )}
                          At least 1 number
                        </div>
                        <div
                          className={`flex items-center ${hasSpecialChar ? "text-green-600" : "text-gray-500"}`}
                        >
                          {hasSpecialChar ? (
                            <FaCheck className="mr-2" />
                          ) : (
                            <FaTimes className="mr-2" />
                          )}
                          At least 1 special character (!@#$%^&*)
                        </div>
                        {confirmPassword.length > 0 && (
                          <div
                            className={`flex items-center ${passwordsMatch ? "text-green-600" : "text-red-600"}`}
                          >
                            {passwordsMatch ? (
                              <FaCheck className="mr-2" />
                            ) : (
                              <FaTimes className="mr-2" />
                            )}
                            Passwords match
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          <NotificationBanner
            message={error}
            type="error"
            onClose={() => setError(null)}
            autoClose={false}
          />

          <NotificationBanner
            message={success}
            type="success"
            onClose={() => setSuccess(null)}
            autoClose={true}
            duration={2000}
          />
        </div>
      </div>
    </>
  );
}
