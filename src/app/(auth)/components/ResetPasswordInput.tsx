import React, { useState } from "react";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { calculatePasswordStrength } from "@/utils/passwordStrength";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";

interface ResetPasswordInputProps {
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  loading?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  email?: string; // Add email prop for accessibility
}

const ResetPasswordInput: React.FC<ResetPasswordInputProps> = ({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  loading = false,
  onSubmit,
  email,
}) => {
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "warning" | "info";
  } | null>(null);

  // Calculate password strength using NIST guidelines
  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  
  // Form is valid if password is acceptable and passwords match
  const isFormValid = passwordStrength.isAcceptable && passwordsMatch;

  // Show helpful notifications based on password state
  React.useEffect(() => {
    if (newPassword.length > 0 && !passwordStrength.isAcceptable) {
      setNotification({
        message: passwordStrength.feedback,
        type: "warning"
      });
    } else if (confirmPassword.length > 0 && !passwordsMatch) {
      setNotification({
        message: "Passwords do not match. Please ensure both passwords are identical.",
        type: "error"
      });
    } else if (isFormValid) {
      setNotification({
        message: "Password meets requirements and matches confirmation.",
        type: "success"
      });
    } else {
      setNotification(null);
    }
  }, [newPassword, confirmPassword, passwordStrength, passwordsMatch, isFormValid]);

  return (
    <form className="mt-8 space-y-6" onSubmit={onSubmit}>
      {/* Hidden username field for accessibility and password managers */}
      {email && (
        <input
          type="email"
          name="username"
          value={email.toLowerCase()}
          readOnly
          style={{ display: "none" }}
          autoComplete="username"
        />
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
          <FaLock color="#B54A4A" />
        </div>
        <input
          type={showPassword ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="appearance-none rounded-lg relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white disabled:bg-gray-50 disabled:opacity-100"
          placeholder="New Password"
          disabled={loading}
          autoComplete={showPassword ? "off" : "new-password"}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-20"
          tabIndex={-1}
          disabled={loading}
        >
          {showPassword ? (
            <FaEye color="#9CA3AF" />
          ) : (
            <FaEyeSlash color="#9CA3AF" />
          )}
        </button>
      </div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
          <FaLock color="#B54A4A" />
        </div>
        <input
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="appearance-none rounded-lg relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white disabled:bg-gray-50 disabled:opacity-100"
          placeholder="Confirm Password"
          disabled={loading}
          autoComplete={showConfirmPassword ? "off" : "new-password"}
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-20"
          tabIndex={-1}
          disabled={loading}
        >
          {showConfirmPassword ? (
            <FaEye color="#9CA3AF" />
          ) : (
            <FaEyeSlash color="#9CA3AF" />
          )}
        </button>
      </div>
      <div>
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>

      {/* Password Strength Meter */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Password Strength:
        </h4>
        <PasswordStrengthMeter 
          strength={passwordStrength} 
          showLabel={false}
          showFeedback={true}
        />
        
        {/* Password Match Indicator */}
        {confirmPassword.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div
              className={`flex items-center text-xs ${
                passwordsMatch ? "text-green-600" : "text-red-600"
              }`}
            >
              <span className="mr-2">
                {passwordsMatch ? "✓" : "✗"}
              </span>
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </div>
          </div>
        )}
      </div>

      {/* Notification Banner */}
      {notification && (
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
          autoClose={notification.type === "success"}
          duration={notification.type === "success" ? 3000 : 5000}
        />
      )}
    </form>
  );
};

export default ResetPasswordInput;
