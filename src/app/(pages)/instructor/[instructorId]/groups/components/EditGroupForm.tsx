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
import { validateInput } from "../../../../components/SanitizeInput";

interface User {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  group_id?: string;
}

interface EditGroupFormProps {
  isOpen: boolean;
  isSubmitting: boolean;
  networkError?: string | null;
  onClose: () => void;
  onSubmit: (formData: {
    projectManager: string;
    members: string[];
    adviser: string | null;
    capstoneTitle: string;
    grade: number;
  }) => void;
  members: User[];
  advisers: User[];
  group: Group | null;
}

export default function EditGroupForm({
  isOpen,
  isSubmitting,
  networkError = null,
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
    grade: 0,
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
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

  // Update form data when group changes
  useEffect(() => {
    if (group) {
      const newFormData = {
        projectManager: group.project_manager_id,
        members: group.member_ids || [],
        adviser: group.adviser_id || null,
        capstoneTitle: group.capstone_title || "",
        grade: group.grade || 0,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setHasUnsavedChanges(false);
    }
  }, [group]);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges =
      JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setHasUnsavedChanges(hasChanges);
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
    return fullName.includes(searchTerm) || lastNameFirst.includes(searchTerm);
  };

  const filterAdvisers = (adviser: User) => {
    const fullName =
      `${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + " " : ""}${adviser.last_name}`.toLowerCase();
    const lastNameFirst =
      `${adviser.last_name} ${adviser.first_name} ${adviser.middle_name ? adviser.middle_name : ""}`.toLowerCase();
    const searchTerm = adviserSearch.toLowerCase();
    return fullName.includes(searchTerm) || lastNameFirst.includes(searchTerm);
  };

  // Handle close with unsaved changes check
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasUnsavedChanges) {
      setShowUnsavedChangesDialog(true);
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
      [name]: value,
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
    e.stopPropagation();
    setFormData((prev) => ({ ...prev, members: [] }));
  };

  // Handle clear adviser
  const handleClearAdviser = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData((prev) => ({ ...prev, adviser: null }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    closeAllDropdowns();
    setValidationErrors({});

    // Validate capstone title if provided
    if (formData.capstoneTitle) {
      const { isValid, message } = validateInput(
        formData.capstoneTitle,
        "text",
      );
      if (!isValid) {
        setValidationErrors((prev) => ({
          ...prev,
          capstoneTitle: message || "Invalid capstone title",
        }));
        return;
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
        <div className="bg-white rounded-lg p-8 w-full max-w-4xl shadow-2xl border-2 border-gray-200">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaEdit />
              Edit Group
            </h2>
            <button
              onClick={handleClose}
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
            {/* Capstone Title */}
            <div>
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

            {/* Adviser and Grade */}
            <div className="flex gap-4">
              {/* Adviser */}
              <div className="dropdown-container w-[70%]">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaUserTie color="#6B7280" />
                    Adviser
                  </div>
                  {formData.adviser && (
                    <button
                      type="button"
                      onClick={handleClearAdviser}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Clear
                    </button>
                  )}
                </label>
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
                          {adviserSearch && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdviserSearch("");
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <FaTimes size={12} />
                            </button>
                          )}
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
                            {`${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + " " : ""}${adviser.last_name}`}
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

              {/* Grade */}
              <div className="w-[30%]">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaBook color="#6B7280" />
                  Grade
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
                    <option value={0}>No grade</option>
                    <option value={1}>Approved</option>
                    <option value={2}>Approved With Revisions</option>
                    <option value={3}>Disapproved</option>
                    <option value={4}>Accepted With Revisions</option>
                    <option value={5}>Reoral Defense</option>
                    <option value={6}>Not Accepted</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <FaChevronDown color="#6B7280" />
                  </div>
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="dropdown-container">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaUsers color="#6B7280" />
                  Members
                </div>
                {formData.members.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMembers}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Clear All
                  </button>
                )}
              </label>
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
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberRemove(memberId);
                          }}
                        >
                          {member
                            ? `${member.first_name} ${member.middle_name ? member.middle_name + " " : ""}${member.last_name}`
                            : memberId}
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
                        {membersSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMembersSearch("");
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <FaTimes size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {members
                        .filter((member) => {
                          const isSelected = formData.members.includes(
                            member._id,
                          );
                          const isInThisGroup =
                            group &&
                            String(member.group_id) === String(group._id);
                          const isUnassigned = !member.group_id;
                          return (
                            !isSelected &&
                            (isUnassigned || isInThisGroup) &&
                            filterMembers(member)
                          );
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
                            {`${member.first_name} ${member.middle_name ? member.middle_name + " " : ""}${member.last_name}`}
                          </div>
                        ))}
                      {members.filter((member) => {
                        const isSelected = formData.members.includes(
                          member._id,
                        );
                        const isInThisGroup =
                          group &&
                          String(member.group_id) === String(group._id);
                        const isUnassigned = !member.group_id;
                        return (
                          !isSelected &&
                          (isUnassigned || isInThisGroup) &&
                          filterMembers(member)
                        );
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
        isOpen={showUnsavedChangesDialog}
        onContinue={() => {
          setShowUnsavedChangesDialog(false);
          closeForm();
        }}
        onCancel={() => setShowUnsavedChangesDialog(false)}
      />
    </>
  );
}
