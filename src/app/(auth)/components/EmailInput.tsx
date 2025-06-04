import React from 'react';
import { FaEnvelope } from 'react-icons/fa';

interface EmailInputProps {
  email: string;
  setEmail: (email: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

const EmailInput: React.FC<EmailInputProps> = ({ email, setEmail, disabled = false, loading = false, placeholder = 'Email' }) => (
  <div className="relative">
    <label htmlFor="email" className="sr-only">
      Email address
    </label>
    <div className="absolute left-0 top-0 bottom-0 flex items-center h-full pl-3 pointer-events-none z-20">
      <FaEnvelope color="#B54A4A" size={18} />
    </div>
    <input
      id="email"
      name="email"
      type="email"
      autoComplete="email"
      required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="appearance-none rounded-lg relative block w-full pl-10 pr-3 h-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-white focus:border-white focus:z-10 text-sm shadow-sm bg-white"
      placeholder={placeholder}
      disabled={disabled || loading}
    />
  </div>
);

export default EmailInput; 