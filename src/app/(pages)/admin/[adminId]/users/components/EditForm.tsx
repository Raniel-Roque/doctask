import React from "react";
import { FaEdit, FaTimes, FaExclamationTriangle } from "react-icons/fa";
import { User, EditFormData } from "./types";
import { sanitizeInput, validateUserForm } from "../../utils/validation";

// =========================================
// Types
// =========================================
interface EditFormProps {
  user: User | null;
  formData: EditFormData;
  isSubmitting: boolean;
  networkError: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onFormDataChange: (data: EditFormData) => void;
  className?: string;
  isStudent?: boolean;
}

// =========================================
// Component
// =========================================
export const EditForm = ({
  user,
  formData,
  isSubmitting,
  networkError,
  onClose,
  onSubmit,
  onFormDataChange,
  className = "",
  isStudent = false,
}: EditFormProps) => {
  // =========================================
  // State
  // =========================================
  const [validationErrors, setValidationErrors] = React.useState<{ [key: string]: string }>({});

  // =========================================
  // Event Handlers
  // =========================================
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    
    if (name === 'subrole') {
      onFormDataChange({
        ...formData,
        [name]: parseInt(value),
      });
    } else {
      onFormDataChange({
        ...formData,
        [name]: sanitizedValue,
      });
    }

    // Clear validation error for this field when user types
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateUserForm(formData);
    if (errors) {
      setValidationErrors(errors);
      return;
    }

    onSubmit();
  };

  if (!user) return null;

  // =========================================
  // Render
  // =========================================
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaEdit />
            Edit User
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Error Messages */}
        {networkError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <div className="text-red-700">
                <FaExclamationTriangle />
              </div>
              <span>{networkError}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Enter first name"
              className={`w-full px-4 py-2 rounded-lg border-2 ${
                validationErrors.first_name ? 'border-red-500' : 'border-gray-300'
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
              required
              disabled={isSubmitting}
            />
            {validationErrors.first_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.first_name}</p>
            )}
          </div>

          {/* Middle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Middle Name
            </label>
            <input
              type="text"
              id="middle_name"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleChange}
              placeholder="Enter middle name (optional)"
              className={`w-full px-4 py-2 rounded-lg border-2 ${
                validationErrors.middle_name ? 'border-red-500' : 'border-gray-300'
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
              disabled={isSubmitting}
            />
            {validationErrors.middle_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.middle_name}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Enter last name"
              className={`w-full px-4 py-2 rounded-lg border-2 ${
                validationErrors.last_name ? 'border-red-500' : 'border-gray-300'
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
              required
              disabled={isSubmitting}
            />
            {validationErrors.last_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.last_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              className={`w-full px-4 py-2 rounded-lg border-2 ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
              required
              disabled={isSubmitting}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          {/* Role Selection (for students only) */}
          {isStudent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="subrole"
                value={formData.subrole}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B54A4A]"
                required
              >
                <option value={0}>Member</option>
                <option value={1}>Manager</option>
              </select>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 