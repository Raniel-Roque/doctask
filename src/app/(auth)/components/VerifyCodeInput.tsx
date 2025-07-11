import React, { useEffect } from "react";
import { FaEnvelope } from "react-icons/fa";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

interface VerifyCodeInputProps {
  code: string;
  setCode: (code: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  email: string;
  onResendCode?: () => void;
}

const VerifyCodeInput: React.FC<VerifyCodeInputProps> = ({
  code,
  setCode,
  disabled = false,
  loading = false,
  placeholder = "Enter verification code",
  email,
  onResendCode,
}) => {
  useEffect(() => {
    // Check if we should send code automatically when component loads
    const shouldSendCode = localStorage.getItem(`shouldSendCode_${email}`);
    if (shouldSendCode === "true" && onResendCode) {
      // Clear the flag so we don't send again
      localStorage.removeItem(`shouldSendCode_${email}`);
      // Send the code
      onResendCode();
    }
  }, [email, onResendCode]);

  return (
    <div>
      <div className="relative">
        <input
          id="code"
          name="code"
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
          placeholder={placeholder}
          disabled={disabled || loading}
        />
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 z-10 pointer-events-none">
          <FaEnvelope color="#B54A4A" size={18} />
        </span>
      </div>
    </div>
  );
};

export default VerifyCodeInput;
