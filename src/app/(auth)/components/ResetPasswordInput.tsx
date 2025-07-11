import React from "react";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
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
}) => (
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
  </form>
);

export default ResetPasswordInput;
