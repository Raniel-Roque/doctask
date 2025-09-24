import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
} from "react";
import {
  FaEdit,
  FaTimes,
  FaExclamationTriangle,
  FaChevronDown,
  FaSearch,
  FaEnvelope,
  FaSave,
  FaSpinner,
  FaUserTag,
  FaUser,
} from "react-icons/fa";
import { User, EditFormData } from "./types";
import { validateUserForm } from "../../utils/validation";
import { useBannerManager } from "../../../../components/BannerManager";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import { UnsavedChangesConfirmation } from "../../../../components/UnsavedChangesConfirmation";
import { useModalFocus } from "@/hooks/use-modal-focus";
import ProjectManagerSelectionModal from "./ProjectManagerSelectionModal";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";

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
export default function EditForm({
  user,
  formData,
  isSubmitting,
  networkError,
  onClose,
  onSubmit,
  onFormDataChange,
  className = "",
  isStudent = false,
}: EditFormProps) {
  const { addBanner } = useBannerManager();

  // Handle network errors
  useEffect(() => {
    if (networkError) {
      const errorMessage = getErrorMessage(
        new Error(networkError),
        ErrorContexts.editUser(isStudent ? "student" : "adviser"),
      );
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    }
  }, [networkError, addBanner, isStudent]);

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
  const [showRoleChangeConfirmation, setShowRoleChangeConfirmation] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get group information for the user being edited
  const studentGroup = useQuery(
    api.fetch.getStudentGroup,
    user ? { userId: user._id as Id<"users"> } : "skip",
  );

  // Get the actual group information if the student has a group
  const groupInfo = useQuery(
    api.fetch.getGroupById,
    studentGroup?.group_id ? { groupId: studentGroup.group_id } : "skip",
  );

  // Get all users to filter for available project managers
  const allUsers = useQuery(api.fetch.searchUsers, {
    searchTerm: "",
    role: 0, // Students only
    emailVerified: undefined,
    subrole: undefined,
    pageSize: 10000,
    pageNumber: 1,
    sortField: "first_name",
    sortDirection: "asc",
  });

  // Get all groups to check which project managers are already assigned
  const allGroups = useQuery(api.fetch.getGroups, {
    pageSize: 10000,
    pageNumber: 1,
  });

  // Filter available project managers (role 0, subrole 1, not already managing a group)
  const availableProjectManagers = useMemo(() => {
    if (!allUsers?.users || !allGroups?.groups) return [];

    const usedManagerIds = new Set(
      allGroups.groups.map((g) => g.project_manager_id) || [],
    );

    return allUsers.users.filter(
      (u) => u && u.role === 0 && u.subrole === 1 && !usedManagerIds.has(u._id),
    );
  }, [allUsers, allGroups]);

  // Handle error messages
  useEffect(() => {
    if (errorMessage) {
      addBanner({
        message: errorMessage,
        type: "error",
        onClose: () => setErrorMessage(null),
        autoClose: true,
      });
    }
  }, [errorMessage, addBanner]);

  // Handle success messages
  useEffect(() => {
    if (successMessage) {
      addBanner({
        message: successMessage,
        type: "success",
        onClose: () => setSuccessMessage(null),
        autoClose: true,
      });
    }
  }, [successMessage, addBanner]);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
  const [showProjectManagerSelection, setShowProjectManagerSelection] =
    useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    from: number;
    to: number;
  } | null>(null);

  const roleTriggerRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Use modal focus management hook
  const modalRef = useModalFocus({
    isOpen: !!user,
    onClose: () => {
      // Check for unsaved changes when ESC is pressed
      if (hasUnsavedChanges) {
        setShowUnsavedChangesDialog(true);
      } else {
        onClose();
      }
    },
  });

  // Clear validation errors when form is opened
  React.useEffect(() => {
    if (user) {
      setValidationErrors({});
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [user]);

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

  const handleRoleSelect = (role: { value: number; label: string }) => {
    // Check if we're demoting a project manager (subrole 1 -> 0)
    if (user?.subrole === 1 && role.value === 0) {
      // Check if the project manager has a group
      if (
        groupInfo &&
        groupInfo.member_ids &&
        groupInfo.member_ids.length > 0
      ) {
        // Project manager has a group with members - need to select a new project manager
        setPendingRoleChange({ from: user.subrole, to: role.value });
        setShowProjectManagerSelection(true);
        setRoleSearch("");
        setShowRoleSearch(false);
      } else {
        // Project manager doesn't have a group or has no members - can demote directly
        onFormDataChange({
          ...formData,
          subrole: role.value,
        });
        setRoleSearch("");
        setShowRoleSearch(false);
      }
    } else {
      // Normal role change - apply immediately
      onFormDataChange({
        ...formData,
        subrole: role.value,
      });
      setRoleSearch("");
      setShowRoleSearch(false);
    }
  };

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

  // Project Manager Selection Modal Handlers
  const handleProjectManagerSelectionClose = () => {
    setShowProjectManagerSelection(false);
    setPendingRoleChange(null);
  };

  const handleProjectManagerSelectionConfirm = (
    newProjectManagerId: string,
  ) => {
    // Apply the role change with the selected new project manager
    onFormDataChange({
      ...formData,
      subrole: pendingRoleChange?.to || 0,
      newProjectManagerId: newProjectManagerId,
    });
    setShowProjectManagerSelection(false);
    setPendingRoleChange(null);
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

    // Check if role has changed (for students only)
    if (isStudent && user && trimmedFormData.subrole !== user.subrole) {
      setShowRoleChangeConfirmation(true);
      return;
    }

    // Update form data with trimmed values before submission
    onFormDataChange(trimmedFormData);
    onSubmit();
  };

  const confirmAndSubmit = () => {
    setShowRoleChangeConfirmation(false);
    onSubmit();
  };

  const cancelSubmit = () => {
    setShowRoleChangeConfirmation(false);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Clear validation errors when closing
    setValidationErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);
    // Just call onClose and let the parent handle the confirmation
    onClose();
  };

  // Track initial form data and detect unsaved changes
  const [initialFormData, setInitialFormData] =
    useState<EditFormData>(formData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  React.useEffect(() => {
    if (user) {
      setInitialFormData(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  React.useEffect(() => {
    setHasUnsavedChanges(
      JSON.stringify(formData) !== JSON.stringify(initialFormData),
    );
  }, [formData, initialFormData]);

  if (!user) return null;

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
          aria-labelledby="edit-user-modal-title"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2
              id="edit-user-modal-title"
              className="text-2xl font-bold text-gray-800 flex items-center gap-2"
            >
              <FaEdit />
              Edit User
            </h2>
            <button
              onClick={() => {
                setValidationErrors({});
                setErrorMessage(null);
                setSuccessMessage(null);
                onClose();
              }}
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
                  placeholder="Enter first name"
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
                  placeholder="Enter last name"
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
                placeholder="Enter email address"
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
                            className="w-full pl-8 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 border-0 shadow-none bg-white"
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

            {/* Role Change Confirmation Dialog */}
            {showRoleChangeConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <FaExclamationTriangle size={20} color="#EAB308" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Confirm Role Change
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    {user?.subrole === 1 &&
                    groupInfo &&
                    groupInfo.member_ids &&
                    groupInfo.member_ids.length > 0
                      ? "You have already selected a replacement project manager. This user will be removed from their current group. This action cannot be undone. Are you sure you want to proceed?"
                      : user?.subrole === 0 && groupInfo
                        ? "This user will be removed from their current group. This action cannot be undone. Are you sure you want to proceed?"
                        : "Changing this user's role will remove them from any group they are currently in. This action cannot be undone. Are you sure you want to proceed?"}
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={cancelSubmit}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmAndSubmit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Confirm Changes
                    </button>
                  </div>
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
                disabled={isSubmitting || !hasUnsavedChanges}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin">
                      <FaSpinner />
                    </div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <UnsavedChangesConfirmation
        isOpen={showUnsavedChangesDialog}
        onContinue={() => {
          setShowUnsavedChangesDialog(false);
          onClose();
        }}
        onCancel={() => setShowUnsavedChangesDialog(false)}
      />

      {/* Project Manager Selection Modal */}
      {user && (
        <ProjectManagerSelectionModal
          isOpen={showProjectManagerSelection}
          onClose={handleProjectManagerSelectionClose}
          onConfirm={handleProjectManagerSelectionConfirm}
          isSubmitting={isSubmitting}
          currentProjectManager={{
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            middle_name: user.middle_name,
            email: user.email,
          }}
          availableProjectManagers={availableProjectManagers}
          groupName={groupInfo?.capstone_title || "Untitled Group"}
        />
      )}
    </>
  );
}
