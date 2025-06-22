import React, { useState, useEffect } from "react";
import { FaExclamationTriangle, FaPlus, FaTimes } from "react-icons/fa";

interface AdviserCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  isSubmitting?: boolean;
  error?: string | null;
  clearInputRef?: React.MutableRefObject<() => void>;
}

export const AdviserCodePopup: React.FC<AdviserCodePopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  error = null,
  clearInputRef,
}) => {
  const [code, setCode] = useState("");

  // Expose a clear function to parent
  useEffect(() => {
    if (clearInputRef) {
      clearInputRef.current = () => setCode("");
    }
  }, [clearInputRef]);

  // Format input as XXXX-XXXX-XXXX
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    value = value.slice(0, 12);
    value = value.replace(/(.{4})(.{0,4})(.{0,4})/, (m, g1, g2, g3) => {
      let out = g1;
      if (g2) out += "-" + g2;
      if (g3) out += "-" + g3;
      return out;
    });
    setCode(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/-/g, "").length === 12) {
      onSubmit(code);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <FaPlus size={24} className="text-blue-600" />
          Enter Adviser Code
        </h2>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaExclamationTriangle />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="adviser-code"
            className="block text-gray-700 mb-2 font-medium"
          >
            Adviser Code
          </label>
          <input
            id="adviser-code"
            type="text"
            value={code}
            onChange={handleInputChange}
            maxLength={14}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg tracking-widest mb-6 text-center uppercase"
            autoFocus
            disabled={isSubmitting}
          />
          <div className="flex justify-end gap-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300 flex items-center gap-2"
              disabled={isSubmitting}
            >
              <FaTimes />
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              disabled={isSubmitting || code.replace(/-/g, "").length !== 12}
            >
              <FaPlus />
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
