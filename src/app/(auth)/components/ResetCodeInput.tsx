import React from 'react';
import { FaEnvelope } from 'react-icons/fa';
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

interface ResetCodeInputProps {
  code: string;
  setCode: (code: string) => void;
  loading?: boolean;
  error?: string;
  onResendCode?: () => void;
  onSubmit: (e: React.FormEvent) => void;
  resentSuccess?: boolean;
}

const ResetCodeInput: React.FC<ResetCodeInputProps> = ({
  code,
  setCode,
  loading = false,
  error,
  onResendCode,
  onSubmit,
  resentSuccess,
}) => (
  <form className="mt-8 space-y-6" onSubmit={onSubmit}>
    {resentSuccess && (
      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 text-sm text-center font-medium shadow-sm">
        A new code has been sent to your email. Please check your inbox and spam folder.
      </div>
    )}
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 flex items-center h-full pl-3 pointer-events-none z-20">
        <FaEnvelope color="#B54A4A" size={18} />
      </div>
      <input
        type="text"
        required
        value={code}
        onChange={(e) => setCode(sanitizeInput(e.target.value, { trim: true, removeHtml: true, escapeSpecialChars: true }))}
        className="appearance-none rounded-lg relative block w-full pl-10 pr-3 h-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
        placeholder="Enter verification code"
        disabled={loading}
      />
    </div>
    {error && <div className="text-red-300 text-sm text-center">{error}</div>}
    <div>
      <button
        type="submit"
        disabled={loading}
        className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {loading ? "Verifying..." : "Verify Code"}
      </button>
    </div>
    <div className="text-sm text-center">
      <button
        type="button"
        onClick={onResendCode}
        disabled={loading}
        className="font-medium text-red-200 hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Didn&apos;t receive a code? Click here to resend
      </button>
    </div>
  </form>
);

export default ResetCodeInput; 