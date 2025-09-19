import React, { useState, useRef, useLayoutEffect } from "react";
import {
  FaPlus,
  FaTimes,
  FaExclamationTriangle,
  FaChevronDown,
  FaSearch,
  FaEnvelope,
  FaUserPlus,
  FaSpinner,
  FaUserTag,
  FaUser,
} from "react-icons/fa";
import { AddFormData } from "./types";
import { validateUserForm } from "../../utils/validation";
import { NotificationBanner } from "../../../../components/NotificationBanner";
import { UnsavedChangesConfirmation } from "../../../../components/UnsavedChangesConfirmation";
import { useModalFocus } from "@/hooks/use-modal-focus";

// =========================================
// Types
// =========================================
interface AddFormProps {
  isOpen: boolean;
  isSubmitting: boolean;
  networkError: string | null;
  formData: AddFormData;
  onClose: () => void;
  onSubmit: () => void;
  onFormDataChange: (data: AddFormData) => void;
  className?: string;
  isStudent?: boolean;
}

// =========================================
// Component
// =========================================
export const AddForm = ({
  isOpen,
  isSubmitting,
  networkError,
  formData,
  onClose,
  onSubmit,
  onFormDataChange,
  className = "",
  isStudent = false,
}: AddFormProps) => {
  // =========================================
  // State
  // =========================================
  const [validationErrors, setValidationErrors] = React.useState<{
    [key: string]: string;
  }>({});
  const [roleSearch, setRoleSearch] = useState("");
  const [showRoleSearch, setShowRoleSearch] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"top" | "bottom">(
    "bottom",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);

  const roleTriggerRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Use modal focus management hook
  const modalRef = useModalFocus({
    isOpen,
    onClose: () => onClose(),
  });

  const roles = [
    { value: 0, label: "Project Member" },
    { value: 1, label: "Project Manager" },
  ];

  const closeAllDropdowns = () => {
    setShowRoleSearch(false);
  };

  const handleRoleClick = () => {
    closeAllDropdowns();
    setShowRoleSearch(!showRoleSearch);
  };

  useLayoutEffect(() => {
    if (showRoleSearch) {
      const trigger = roleTriggerRef.current;
      const dropdown = roleDropdownRef.current;

      if (trigger && dropdown) {
        const triggerRect = trigger.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;

        if (
          spaceBelow < dropdownRect.height &&
          spaceAbove > dropdownRect.height
        ) {
          setDropdownPosition("top");
        } else {
          setDropdownPosition("bottom");
        }
      }
    }
  }, [showRoleSearch]);

  // =========================================
  // Event Handlers
  // =========================================
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "subrole") {
      onFormDataChange({
        ...formData,
        [name]: parseInt(value),
      });
    } else {
      onFormDataChange({
        ...formData,
        [name]: value,
      });
    }

    // Clear validation error for this field when user types
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleRoleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoleSearch(e.target.value);
  };

  const handleRoleSelect = (role: { value: number; label: string }) => {
    onFormDataChange({
      ...formData,
      subrole: role.value,
    });
    setRoleSearch("");
    setShowRoleSearch(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Trim data before submission
    const trimmedFormData = {
      ...formData,
      first_name: formData.first_name.trim(),
      middle_name: formData.middle_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
    };

    // Validate form with trimmed data
    const errors = validateUserForm(trimmedFormData);
    if (errors) {
      setValidationErrors(errors);
      return;
    }

    // Update form data with trimmed values before submission
    onFormDataChange(trimmedFormData);
    onSubmit();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Just call onClose and let the parent handle the confirmation
    onClose();
  };

  const closeForm = () => {
    onClose();
  };

  if (!isOpen) return null;

  // =========================================
  // Render
  // =========================================
  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${className}`}
      >
        <div
          ref={modalRef}
          className="bg-white rounded-lg p-8 w-full max-w-4xl shadow-2xl border-2 border-gray-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-modal-title"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2
              id="add-user-modal-title"
              className="text-2xl font-bold text-gray-800 flex items-center gap-2"
            >
              <FaPlus />
              Add New User
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
          {(networkError || Object.keys(validationErrors).length > 0) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <FaExclamationTriangle />
                <div className="flex flex-col gap-1">
                  {networkError && <span>{networkError}</span>}
                  {Object.entries(validationErrors).map(([field, message]) => (
                    <span key={field}>{message}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields - Horizontal Layout */}
            <div className="grid grid-cols-3 gap-4">
              {/* First Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaUser color="#6B7280" />
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Enter First Name"
                  className={`w-full px-4 py-2 rounded-lg border-2 ${
                    validationErrors.first_name
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                  disabled={isSubmitting}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
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
                  placeholder="Enter Middle Name (Optional)"
                  className={`w-full px-4 py-2 rounded-lg border-2 ${
                    validationErrors.middle_name
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                  disabled={isSubmitting}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
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
                  placeholder="Enter Last Name"
                  className={`w-full px-4 py-2 rounded-lg border-2 ${
                    validationErrors.last_name
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                  disabled={isSubmitting}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FaEnvelope color="#6B7280" />
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter Email Address"
                className={`w-full px-4 py-2 rounded-lg border-2 ${
                  validationErrors.email ? "border-red-500" : "border-gray-300"
                } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                disabled={isSubmitting}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* Role Selection (for students only) */}
            {isStudent && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaUserTag color="#6B7280" />
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div
                    ref={roleTriggerRef}
                    className={`w-full px-4 py-2 rounded-lg border-2 ${
                      validationErrors.subrole
                        ? "border-red-500"
                        : "border-gray-300"
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer`}
                    onClick={handleRoleClick}
                  >
                    {roles.find((role) => role.value === formData.subrole)
                      ?.label || (
                      <span className="text-gray-500">Select Role</span>
                    )}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <FaChevronDown color="#6B7280" />
                  </div>

                  {showRoleSearch && (
                    <div
                      ref={roleDropdownRef}
                      className={`absolute z-10 w-full bg-white rounded-lg shadow-lg border border-gray-200 ${
                        dropdownPosition === "top"
                          ? "bottom-full mb-1"
                          : "top-full mt-1"
                      }`}
                    >
                      <div className="p-2 border-b">
                        <div className="relative">
                          <input
                            type="text"
                            value={roleSearch}
                            onChange={handleRoleSearch}
                            placeholder="Search role..."
                            className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            autoFocus
                          />
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                            <FaSearch />
                          </div>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {roles
                          .filter((role) =>
                            role.label
                              .toLowerCase()
                              .includes(roleSearch.toLowerCase()),
                          )
                          .map((role) => (
                            <div
                              key={role.value}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleRoleSelect(role)}
                            >
                              {role.label}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300 flex items-center gap-2"
                disabled={isSubmitting}
              >
                <FaTimes />
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin">
                      <FaSpinner />
                    </div>
                    Adding...
                  </>
                ) : (
                  <>
                    <FaUserPlus />
                    Add User
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notifications */}
      <NotificationBanner
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
        type="error"
      />
      <NotificationBanner
        message={successMessage}
        onClose={() => setSuccessMessage(null)}
        type="success"
      />
      <UnsavedChangesConfirmation
        isOpen={showUnsavedChangesDialog}
        onContinue={() => {
          setShowUnsavedChangesDialog(false);
          closeForm();
        }}
        onCancel={() => setShowUnsavedChangesDialog(false)}
      />
    </>
  );
};
