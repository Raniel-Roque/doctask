import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  FaTimes,
  FaEdit,
  FaExclamationTriangle,
  FaUsers,
  FaUserTie,
  FaBook,
  FaSearch,
  FaChevronDown,
  FaSave,
  FaSpinner,
} from "react-icons/fa";
import { Group } from "./types";
import { UnsavedChangesConfirmation } from "../../../../components/UnsavedChangesConfirmation";
import {
  validateInput,
  sanitizeInput,
} from "../../../../components/SanitizeInput";
import { useModalFocus } from "@/hooks/use-modal-focus";

// Shared error messages
const ERROR_MESSAGES = {
  INVALID_CAPSTONE_TITLE: "Capstone Title validation failed",
} as const;

interface User {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
}

interface EditGroupFormProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    projectManager: string;
    members: string[];
    adviser: string | null;
    capstoneTitle: string;
    capstoneType: number;
    grade: number;
  }) => void;
  members: User[];
  advisers: User[];
  group: Group | null;
}

export default function EditGroupForm({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  members,
  advisers,
  group,
}: EditGroupFormProps) {
  // State
  const [formData, setFormData] = useState({
    projectManager: "",
    members: [] as string[],
    adviser: null as string | null,
    capstoneTitle: "",
    capstoneType: 0, // 0 = CP1, 1 = CP2
    grade: 0,
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);

  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  const [dropdownPositions, setDropdownPositions] = useState<
    Record<string, "top" | "bottom">
  >({});
  const [showMembersSearch, setShowMembersSearch] = useState(false);
  const [showAdviserSearch, setShowAdviserSearch] = useState(false);
  const [membersSearch, setMembersSearch] = useState("");
  const [adviserSearch, setAdviserSearch] = useState("");

  const adviserTriggerRef = useRef<HTMLDivElement>(null);
  const membersTriggerRef = useRef<HTMLDivElement>(null);
  const adviserDropdownRef = useRef<HTMLDivElement>(null);
  const membersDropdownRef = useRef<HTMLDivElement>(null);

  // Use modal focus management hook
  const modalRef = useModalFocus({
    isOpen,
    onClose: () => {
      // Check for unsaved changes when ESC is pressed
      if (hasUnsavedChanges) {
        setShowUnsavedChanges(true);
      } else {
        onClose();
      }
    },
    focusFirstInput: false,
  });

  // Clear validation errors when form is opened
  React.useEffect(() => {
    if (isOpen) {
      setValidationErrors({});
    }
  }, [isOpen]);

  // Update form data when group changes
  useEffect(() => {
    if (group) {
      const newFormData = {
        projectManager: group.project_manager_id,
        members: group.member_ids || [],
        adviser: group.adviser_id || null,
        capstoneTitle: group.capstone_title || "",
        capstoneType: group.capstone_type || 0, // Default to CP1 if not set
        grade: group.grade || 0,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setHasUnsavedChanges(false);
    }
  }, [group]);

  // Check for unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(
      JSON.stringify(formData) !== JSON.stringify(initialFormData),
    );
  }, [formData, initialFormData]);

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setShowMembersSearch(false);
    setShowAdviserSearch(false);
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        closeAllDropdowns();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    let activeTriggerRef: React.RefObject<HTMLDivElement> | null = null;
    let activeDropdownRef: React.RefObject<HTMLDivElement> | null = null;
    let dropdownKey: string | null = null;

    if (showAdviserSearch) {
      activeTriggerRef = adviserTriggerRef;
      activeDropdownRef = adviserDropdownRef;
      dropdownKey = "adviser";
    } else if (showMembersSearch) {
      activeTriggerRef = membersTriggerRef;
      activeDropdownRef = membersDropdownRef;
      dropdownKey = "members";
    }

    if (
      activeTriggerRef?.current &&
      activeDropdownRef?.current &&
      dropdownKey
    ) {
      const button = activeTriggerRef.current;
      const dropdown = activeDropdownRef.current;

      const buttonRect = button.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      let position: "top" | "bottom" = "bottom";
      if (
        spaceBelow < dropdownRect.height &&
        spaceAbove > dropdownRect.height
      ) {
        position = "top";
      }
      const key = dropdownKey;
      setDropdownPositions((prev) => ({ ...prev, [key]: position }));
    }
  }, [showAdviserSearch, showMembersSearch]);

  // Handle opening dropdowns
  const handleOpenMembersSearch = () => {
    setShowAdviserSearch(false);
    setShowMembersSearch(!showMembersSearch);
  };

  const handleOpenAdviserSearch = () => {
    setShowMembersSearch(false);
    setShowAdviserSearch(!showAdviserSearch);
  };

  // Filter functions
  const filterMembers = (member: User) => {
    const fullName =
      `${member.first_name} ${member.middle_name ? member.middle_name + " " : ""}${member.last_name}`.toLowerCase();
    const lastNameFirst =
      `${member.last_name} ${member.first_name} ${member.middle_name ? member.middle_name : ""}`.toLowerCase();
    const searchTerm = membersSearch.toLowerCase();
    return (
      fullName.includes(searchTerm) ||
      lastNameFirst.includes(searchTerm) ||
      member.email?.toLowerCase().includes(searchTerm)
    );
  };

  const filterAdvisers = (adviser: User) => {
    const fullName =
      `${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + " " : ""}${adviser.last_name}`.toLowerCase();
    const lastNameFirst =
      `${adviser.last_name} ${adviser.first_name} ${adviser.middle_name ? adviser.middle_name : ""}`.toLowerCase();
    const searchTerm = adviserSearch.toLowerCase();
    return (
      fullName.includes(searchTerm) ||
      lastNameFirst.includes(searchTerm) ||
      adviser.email?.toLowerCase().includes(searchTerm)
    );
  };

  // Handle close with unsaved changes check
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasUnsavedChanges) {
      setShowUnsavedChanges(true);
    } else {
      closeForm();
    }
  };

  const closeForm = () => {
    closeAllDropdowns();
    setValidationErrors({});
    onClose();
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value, // Don't trim during typing - allow spaces
    }));
  };

  const handleMembersSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMembersSearch(e.target.value);
  };

  const handleAdviserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdviserSearch(e.target.value);
  };

  // Handle member selection
  const handleMemberSelect = (member: User) => {
    if (!formData.members.includes(member._id)) {
      setFormData((prev) => ({
        ...prev,
        members: [...prev.members, member._id],
      }));
    }
    setMembersSearch("");
    setShowMembersSearch(false);
  };

  // Handle member removal
  const handleMemberRemove = (memberId: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((id) => id !== memberId),
    }));
  };

  // Handle clear members
  const handleClearMembers = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData((prev) => ({ ...prev, members: [] }));
  };

  // Handle clear adviser
  const handleClearAdviser = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData((prev) => ({ ...prev, adviser: null }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    closeAllDropdowns();
    setValidationErrors({});

    // Sanitize and validate capstone title if provided
    if (formData.capstoneTitle) {
      const sanitizedTitle = sanitizeInput(formData.capstoneTitle, {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true,
        maxLength: 255,
      });

      const { isValid, message } = validateInput(
        sanitizedTitle,
        "capstoneTitle",
      );
      if (!isValid) {
        setValidationErrors((prev) => ({
          ...prev,
          capstoneTitle: message || ERROR_MESSAGES.INVALID_CAPSTONE_TITLE,
        }));
        return;
      } else {
        // Update form data with sanitized value
        setFormData((prev) => ({
          ...prev,
          capstoneTitle: sanitizedTitle,
        }));
      }
    }

    try {
      await onSubmit({
        ...formData,
        grade: Number(formData.grade), // Ensure grade is a number
      });
      setHasUnsavedChanges(false);
      setInitialFormData(formData);
      closeForm();
    } catch (error) {
      setValidationErrors({
        general:
          error instanceof Error ? error.message : "Failed to update group",
      });
    }
  };

  if (!isOpen || !group) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${isOpen ? "" : "hidden"}`}
      >
        <div
          ref={modalRef}
          className="bg-white rounded-lg p-8 w-full max-w-4xl shadow-2xl border-2 border-gray-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2
              id="edit-modal-title"
              className="text-2xl font-bold text-gray-800 flex items-center gap-2"
            >
              <FaEdit />
              Edit Group
            </h2>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setValidationErrors({});
                handleClose(e);
              }}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              <FaTimes size={24} />
            </button>
          </div>

          {/* Error Messages */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <FaExclamationTriangle />
                <div className="flex flex-col gap-1">
                  {Object.entries(validationErrors).map(([field, message]) => (
                    <span key={field}>{message}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Capstone Title and Type Row */}
            <div className="flex gap-4">
              {/* Capstone Title - 80% */}
              <div className="flex-[4]">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaBook color="#6B7280" />
                  Capstone Title
                </label>
                <input
                  type="text"
                  id="capstoneTitle"
                  name="capstoneTitle"
                  value={formData.capstoneTitle}
                  onChange={handleInputChange}
                  placeholder="Enter Capstone Title"
                  className={`w-full px-4 py-2 rounded-lg border-2 ${
                    validationErrors.capstoneTitle
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                  disabled={isSubmitting}
                />
              </div>

              {/* Capstone Type - 20% */}
              <div className="flex-[1]">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaBook color="#6B7280" />
                  Capstone <span className="text-red-500">*</span>
                </label>
                <select
                  name="capstoneType"
                  value={formData.capstoneType}
                  onChange={(e) => setFormData(prev => ({ ...prev, capstoneType: Number(e.target.value) }))}
                  className={`w-full px-4 py-2 rounded-lg border-2 ${
                    validationErrors.capstoneType
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                  disabled={isSubmitting}
                >
                  <option value={0}>CP1</option>
                  <option value={1}>CP2</option>
                </select>
              </div>
            </div>

            {/* Adviser and Grade */}
            <div className="flex gap-4">
              {/* Adviser */}
              <div className="dropdown-container w-[70%]">
                <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaUserTie color="#6B7280" />
                    Adviser
                  </div>
                  {formData.adviser && (
                    <button
                      type="button"
                      onClick={handleClearAdviser}
                      className="text-blue-600 hover:text-blue-800 text-sm inline-block"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div
                    ref={adviserTriggerRef}
                    className={`w-full px-4 py-2 rounded-lg border-2 ${
                      validationErrors.adviser
                        ? "border-red-500"
                        : "border-gray-300"
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer`}
                    onClick={handleOpenAdviserSearch}
                  >
                    {formData.adviser ? (
                      advisers.find((a) => a._id === formData.adviser)
                        ?.first_name +
                      " " +
                      (advisers.find((a) => a._id === formData.adviser)
                        ?.middle_name
                        ? advisers.find((a) => a._id === formData.adviser)
                            ?.middle_name + " "
                        : "") +
                      advisers.find((a) => a._id === formData.adviser)
                        ?.last_name
                    ) : (
                      <span className="text-gray-500">Select Adviser</span>
                    )}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <FaChevronDown color="#6B7280" />
                  </div>

                  {showAdviserSearch && (
                    <div
                      ref={adviserDropdownRef}
                      className={`absolute z-10 w-full bg-white rounded-lg shadow-lg border border-gray-200 ${
                        dropdownPositions.adviser === "top"
                          ? "bottom-full mb-1"
                          : "top-full mt-1"
                      }`}
                    >
                      <div className="p-2 border-b">
                        <div className="relative">
                          <input
                            type="text"
                            value={adviserSearch}
                            onChange={handleAdviserSearch}
                            placeholder="Search advisers..."
                            className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            autoFocus
                          />
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                            <FaSearch />
                          </div>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {advisers.filter(filterAdvisers).map((adviser) => (
                          <div
                            key={adviser._id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                adviser: adviser._id,
                              }));
                              setShowAdviserSearch(false);
                            }}
                          >
                            <div>
                              <div>
                                {adviser.first_name}{" "}
                                {adviser.middle_name
                                  ? adviser.middle_name + " "
                                  : ""}
                                {adviser.last_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {adviser.email}
                              </div>
                            </div>
                          </div>
                        ))}
                        {advisers.filter(filterAdvisers).length === 0 && (
                          <div className="px-4 py-3 text-gray-500 text-sm text-center cursor-not-allowed">
                            No more advisers available. Please register more
                            users with adviser role.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remark */}
              <div className="w-[30%]">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaBook color="#6B7280" />
                  Remark
                </label>
                <div className="relative">
                  <select
                    value={formData.grade}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        grade: Number(e.target.value),
                      }))
                    }
                    className={`w-full px-4 py-2 rounded-lg border-2 ${
                      validationErrors.grade
                        ? "border-red-500"
                        : "border-gray-300"
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white`}
                    disabled={isSubmitting}
                  >
                    <option value={0}>No remark</option>
                    {formData.capstoneType === 0 ? (
                      // CP1 options
                      <>
                        <option value={1}>Approved</option>
                        <option value={2}>Approved With Revisions</option>
                        <option value={3}>Disapproved</option>
                      </>
                    ) : (
                      // CP2 options
                      <>
                        <option value={4}>Accepted With Revisions</option>
                        <option value={5}>Reoral Defense</option>
                        <option value={6}>Not Accepted</option>
                      </>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <FaChevronDown color="#6B7280" />
                  </div>
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="dropdown-container">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaUsers color="#6B7280" />
                  Members
                </div>
                {formData.members.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMembers}
                    className="text-blue-600 hover:text-blue-800 text-sm inline-block"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="relative">
                <div
                  ref={membersTriggerRef}
                  className={`w-full min-h-[42px] px-4 py-2 rounded-lg border-2 ${
                    validationErrors.members
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer flex flex-wrap gap-2`}
                  onClick={handleOpenMembersSearch}
                >
                  {formData.members.length > 0 ? (
                    formData.members.map((memberId) => {
                      const member = members.find((m) => m._id === memberId);
                      return (
                        <div
                          key={memberId}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 text-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberRemove(memberId);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {member?.first_name}{" "}
                              {member?.middle_name
                                ? member.middle_name + " "
                                : ""}
                              {member?.last_name}
                            </span>
                          </div>
                          <FaTimes color="#2563EB" size={12} />
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-gray-500">Select Members</span>
                  )}
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FaChevronDown color="#6B7280" />
                </div>

                {showMembersSearch && (
                  <div
                    ref={membersDropdownRef}
                    className={`absolute z-10 w-full bg-white rounded-lg shadow-lg border border-gray-200 ${
                      dropdownPositions.members === "top"
                        ? "bottom-full mb-1"
                        : "top-full mt-1"
                    }`}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <input
                          type="text"
                          value={membersSearch}
                          onChange={handleMembersSearch}
                          placeholder="Search members..."
                          className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          autoFocus
                        />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                          <FaSearch />
                        </div>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {members
                        .filter((member) => {
                          const isSelected = formData.members.includes(
                            member._id,
                          );
                          return !isSelected && filterMembers(member);
                        })
                        .sort((a, b) => {
                          const aName =
                            `${a.last_name} ${a.first_name}`.toLowerCase();
                          const bName =
                            `${b.last_name} ${b.first_name}`.toLowerCase();
                          return aName.localeCompare(bName);
                        })
                        .map((member) => (
                          <div
                            key={member._id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleMemberSelect(member)}
                          >
                            <div>
                              <div>
                                {member.first_name}{" "}
                                {member.middle_name
                                  ? member.middle_name + " "
                                  : ""}
                                {member.last_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        ))}
                      {members.filter((member) => {
                        const isSelected = formData.members.includes(
                          member._id,
                        );
                        return !isSelected && filterMembers(member);
                      }).length === 0 && (
                        <div className="px-4 py-3 text-gray-500 text-sm text-center cursor-not-allowed">
                          No more members available. Please register more users
                          with member role.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

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

      {/* Notifications */}
      <UnsavedChangesConfirmation
        isOpen={showUnsavedChanges}
        onContinue={() => {
          setShowUnsavedChanges(false);
          onClose();
        }}
        onCancel={() => setShowUnsavedChanges(false)}
      />
    </>
  );
}
