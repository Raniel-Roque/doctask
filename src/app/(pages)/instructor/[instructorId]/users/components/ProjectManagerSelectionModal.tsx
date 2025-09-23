import React, { useState, useEffect, useRef } from "react";
import {
  FaUserTie,
  FaTimes,
  FaSearch,
  FaChevronDown,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import { useModalFocus } from "@/hooks/use-modal-focus";

interface ProjectManagerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newProjectManagerId: string) => void;
  onAddProjectManager?: () => void;
  isSubmitting?: boolean;
  currentProjectManager: {
    _id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    email?: string;
  };
  availableProjectManagers: {
    _id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    email?: string;
  }[];
  groupName?: string;
}

const ProjectManagerSelectionModal: React.FC<ProjectManagerSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  currentProjectManager,
  availableProjectManagers,
  groupName,
}) => {
  const [selectedProjectManager, setSelectedProjectManager] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [validationError, setValidationError] = useState<string>("");

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use modal focus management hook
  const modalRef = useModalFocus({
    isOpen,
    onClose,
    focusFirstInput: false,
  });

  // Clear state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedProjectManager("");
      setSearchTerm("");
      setShowDropdown(false);
      setValidationError("");
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (dropdownRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      
      setShowDropdown(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleTriggerClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleProjectManagerSelect = (projectManager: {
    _id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    email?: string;
  }) => {
    setSelectedProjectManager(projectManager._id);
    setSearchTerm("");
    setShowDropdown(false);
    setValidationError("");
  };

  const handleConfirm = () => {
    if (!selectedProjectManager) {
      setValidationError("Please select a new project manager");
      return;
    }

    onConfirm(selectedProjectManager);
  };

  const filteredProjectManagers = availableProjectManagers.filter(
    (pm) =>
      `${pm.first_name} ${pm.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      pm.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPM = availableProjectManagers.find(
    (pm) => pm._id === selectedProjectManager
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-8 w-full max-w-2xl shadow-2xl border-2 border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2
            id="modal-title"
            className="text-2xl font-bold text-gray-800 flex items-center gap-2"
          >
            <FaUserTie />
            Select New Project Manager
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700">
            <FaExclamationTriangle />
            <div>
              <p className="font-medium">
                You are about to demote the current project manager:
              </p>
              <p className="text-sm mt-1">
                <strong>
                  {currentProjectManager.first_name}{" "}
                  {currentProjectManager.middle_name ? currentProjectManager.middle_name + " " : ""}
                  {currentProjectManager.last_name}
                </strong>
                {groupName && (
                  <span> from group &ldquo;{groupName}&rdquo;</span>
                )}
              </p>
              <p className="text-sm mt-2">
                Please select a new project manager to take over the group. The current project manager will become a regular member.
              </p>
            </div>
          </div>
        </div>

        {/* Project Manager Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <FaUserTie color="#4B5563" />
              New Project Manager <span className="text-red-500">*</span>
            </div>
          </label>
          <div className="relative">
            <div
              ref={triggerRef}
              className={`w-full px-4 py-2 rounded-lg border-2 ${
                validationError
                  ? "border-red-500"
                  : "border-gray-300"
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer flex items-center justify-between`}
              onClick={handleTriggerClick}
            >
              {selectedPM ? (
                <div className="flex items-center justify-between w-full">
                  <span>
                    {selectedPM.first_name}{" "}
                    {selectedPM.middle_name ? selectedPM.middle_name + " " : ""}
                    {selectedPM.last_name}
                  </span>
                </div>
              ) : (
                <span className="text-gray-500">
                  Select New Project Manager
                </span>
              )}
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <FaChevronDown color="#6B7280" />
            </div>

            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute z-10 w-full bg-white rounded-lg shadow-lg border border-gray-200 top-full mt-1"
              >
                <div className="p-2 border-b">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      placeholder="Search project managers..."
                      className="w-full pl-8 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 border-0 shadow-none bg-white"
                      autoFocus
                    />
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaSearch />
                    </div>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredProjectManagers.map((pm) => (
                    <div
                      key={pm._id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleProjectManagerSelect(pm)}
                    >
                      <div>
                        <div>
                          {pm.first_name}{" "}
                          {pm.middle_name ? pm.middle_name + " " : ""}
                          {pm.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {pm.email}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredProjectManagers.length === 0 && (
                    <div className="px-4 py-3 text-gray-500 text-sm text-center">
                      No project managers found matching your search.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}
        </div>

        {/* Available Project Managers Count */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>{availableProjectManagers.length}</strong> project manager{availableProjectManagers.length !== 1 ? 's' : ''} available for selection
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
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
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isSubmitting || !selectedProjectManager}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin">
                  <FaSpinner />
                </div>
                Updating...
              </>
            ) : (
              <>
                <FaUserTie />
                Confirm Change
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectManagerSelectionModal;
