import React from "react";
import { FaEnvelope } from "react-icons/fa";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

interface EmailInputProps {
  email: string;
  setEmail: (email: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  name?: string;
  onAutocomplete?: (email: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({
  email,
  setEmail,
  disabled = false,
  loading = false,
  placeholder = "Email",
  name = "email",
  onAutocomplete,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize but preserve case for user input
    const sanitizedValue = sanitizeInput(e.target.value, {
      trim: false, // Don't trim during input to allow spaces
      removeHtml: true,
      escapeSpecialChars: true,
      preserveCase: true, // Preserve case for user input
    });
    setEmail(sanitizedValue);

    // If this is an autocomplete event (the input was filled by the browser)
    if (
      e.nativeEvent instanceof InputEvent &&
      e.nativeEvent.inputType === "insertReplacementText"
    ) {
      onAutocomplete?.(sanitizedValue);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={name} className="sr-only">
        Email address
      </label>
      <div className="absolute left-0 top-0 bottom-0 flex items-center h-full pl-3 pointer-events-none z-20">
        <FaEnvelope color="#B54A4A" size={18} />
      </div>
      <input
        id={name}
        name={name}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={handleChange}
        className="appearance-none rounded-lg relative block w-full pl-10 pr-3 h-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
        placeholder={placeholder}
        disabled={disabled || loading}
      />
    </div>
  );
};

export default EmailInput;
