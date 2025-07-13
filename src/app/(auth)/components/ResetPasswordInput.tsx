import React from "react";
import { FaLock, FaEye, FaEyeSlash, FaCheck, FaTimes } from "react-icons/fa";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

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
}) => {
  // Password validation checks
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/.test(newPassword);
  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;

  return (
    <form className="mt-8 space-y-6" onSubmit={onSubmit}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-20">
          <FaLock color="#B54A4A" />
        </div>
        <input
          type={showPassword ? "text" : "password"}
          required
          value={newPassword}
          onChange={(e) =>
            setNewPassword(
              sanitizeInput(e.target.value, {
                trim: true,
                removeHtml: true,
                escapeSpecialChars: true,
              }),
            )
          }
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
          required
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(
              sanitizeInput(e.target.value, {
                trim: true,
                removeHtml: true,
                escapeSpecialChars: true,
              }),
            )
          }
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
          disabled={loading}
          className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>

      {/* Password Requirements */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Password Requirements:
        </h4>
        <div className="space-y-1 text-xs">
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
        </div>
      </div>
    </form>
  );
};

export default ResetPasswordInput;
