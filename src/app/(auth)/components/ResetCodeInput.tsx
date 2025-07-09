import React from "react";
import { FaEnvelope } from "react-icons/fa";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import ResendTimer from "./ResendTimer";

interface ResetCodeInputProps {
  code: string;
  setCode: (code: string) => void;
  loading?: boolean;
  error?: string;
  email: string;
  onResendCode?: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ResetCodeInput: React.FC<ResetCodeInputProps> = ({
  code,
  setCode,
  loading = false,
  error,
  email,
  onResendCode,
  onSubmit,
}) => (
  <form className="mt-8 space-y-6" onSubmit={onSubmit}>
    <div className="relative">
      <input
        type="text"
        required
        value={code}
        onChange={(e) =>
          setCode(
            sanitizeInput(e.target.value, {
              trim: true,
              removeHtml: true,
              escapeSpecialChars: true,
            }),
          )
        }
        className="appearance-none rounded-lg relative block w-full pl-10 pr-3 h-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
        placeholder="Enter verification code"
        disabled={loading}
      />
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 z-10 pointer-events-none">
        <FaEnvelope color="#B54A4A" size={18} />
      </span>
    </div>
    <button
      type="submit"
      disabled={loading}
      className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-[#B54A4A] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
    >
      {loading ? "Verifying..." : "Verify Code"}
    </button>
    {onResendCode && (
      <ResendTimer
        onResend={onResendCode}
        disabled={loading}
        loading={loading}
        email={email}
      />
    )}
    {error && <div className="text-red-300 text-sm text-center">{error}</div>}
  </form>
);

export default ResetCodeInput;
