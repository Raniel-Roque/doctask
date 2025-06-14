import React, { useState } from 'react';
import { FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useUser } from '@clerk/clerk-react';
import { NotificationBanner } from './NotificationBanner';
import { sanitizeInput } from './SanitizeInput';

interface ChangePasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePassword({ isOpen, onClose }: ChangePasswordProps) {
  const { user, isLoaded } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setIsVerified(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const sanitizedPassword = sanitizeInput(currentPassword, {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true
      });

      const response = await fetch('/api/clerk/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user.id,
          currentPassword: sanitizedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify password');
      }

      setIsVerified(true);
      setSuccess("Password verified. Please enter your new password.");
    } catch {
      setError("Current password is incorrect");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !user) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sanitizedNewPassword = sanitizeInput(newPassword, {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true
      });

      // Update the password using our API endpoint
      const updateResponse = await fetch('/api/clerk/user-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user.id,
          newPassword: sanitizedNewPassword,
        }),
      });

      const data = await updateResponse.json();

      if (!updateResponse.ok) {
        // Check for specific Clerk password strength error
        if (data.error?.includes('password_strength') || 
            data.error?.includes('weak_password') || 
            data.error?.includes('password is too weak') ||
            data.error?.includes('password_validation')) {
          throw new Error("Password is too weak. Please use a stronger password with a mix of letters, numbers, and special characters.");
        }
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccess("Password updated successfully");
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <FaTimes />
        </button>

        <h2 className="text-2xl font-bold mb-6">Change Password</h2>

        {!isVerified ? (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify Password"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
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
  );
} 