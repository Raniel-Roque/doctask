import React from 'react';
import { FaEnvelope } from 'react-icons/fa';

interface VerifyCodeInputProps {
  code: string;
  setCode: (code: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  resentSuccess?: boolean;
}

const VerifyCodeInput: React.FC<VerifyCodeInputProps> = ({ code, setCode, disabled = false, loading = false, placeholder = 'Enter verification code', resentSuccess }) => (
  <div className="relative">
    {resentSuccess && (
      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 text-sm text-center font-medium shadow-sm">
        A new code has been sent to your email. Please check your inbox and spam folder.
      </div>
    )}
    <label htmlFor="code" className="sr-only">
      Verification Code
    </label>
    <div className="absolute left-0 top-0 bottom-0 flex items-center h-full pl-3 pointer-events-none z-20">
      <FaEnvelope color="#B54A4A" size={18} />
    </div>
    <input
      id="code"
      name="code"
      type="text"
      required
      value={code}
      onChange={(e) => setCode(e.target.value)}
      className="appearance-none rounded-lg relative block w-full pl-10 pr-3 h-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
      placeholder={placeholder}
      disabled={disabled || loading}
    />
  </div>
);

export default VerifyCodeInput; 