import React from 'react';
import { FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

interface PasswordInputProps {
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ password, setPassword, showPassword, setShowPassword, disabled = false, loading = false, placeholder = 'Password' }) => (
  <div className="relative">
    <label htmlFor="password" className="sr-only">
      Password
    </label>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
      <FaLock color="#B54A4A" />
    </div>
    <input
      id="password"
      name="password"
      type={showPassword ? 'text' : 'password'}
      autoComplete="current-password"
      required
      value={password}
      onChange={(e) => setPassword(sanitizeInput(e.target.value, { trim: true, removeHtml: true, escapeSpecialChars: true }))}
      className="appearance-none rounded-lg relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
      placeholder={placeholder}
      disabled={disabled || loading}
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-20"
      tabIndex={-1}
    >
      {showPassword ? <FaEye color="#9CA3AF" /> : <FaEyeSlash color="#9CA3AF" />}
    </button>
  </div>
);

export default PasswordInput; 