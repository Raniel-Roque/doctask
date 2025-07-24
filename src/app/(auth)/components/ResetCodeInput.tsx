import React, { useEffect } from "react";
import { FaEnvelope } from "react-icons/fa";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import ForgotPasswordResendTimer from "./ForgotPasswordResendTimer";

interface ResetCodeInputProps {
  code: string;
  setCode: (code: string) => void;
  loading?: boolean;
  sendingCode?: boolean;
  email: string;
  onResendCode?: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ResetCodeInput: React.FC<ResetCodeInputProps> = ({
  code,
  setCode,
  loading = false,
  sendingCode = false,
  email,
  onResendCode,
  onSubmit,
}) => {
  useEffect(() => {
    // Check if we should send code automatically when component loads
    const shouldSendCode = localStorage.getItem(
      `shouldSendForgotPasswordCode_${email}`,
    );
    if (shouldSendCode === "true" && onResendCode) {
      // Clear the flag so we don't send again
      localStorage.removeItem(`shouldSendForgotPasswordCode_${email}`);
      // Send the code
      onResendCode();
    }
  }, [email, onResendCode]);

  return (
    <form className="mt-8 space-y-6" onSubmit={onSubmit}>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          value={code}
          onChange={(e) =>
            setCode(
              sanitizeInput(e.target.value, {
                trim: false, // Don't trim during input to allow spaces
                removeHtml: true,
                escapeSpecialChars: true,
                maxLength: 6, // Limit to 6 characters
                allowedPattern: /^[0-9]*$/, // Only allow numbers 0-9
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
        <ForgotPasswordResendTimer
          onResend={onResendCode}
          disabled={sendingCode}
          loading={sendingCode}
          email={email}
        />
      )}
    </form>
  );
};

export default ResetCodeInput;
