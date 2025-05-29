import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaTimes, FaExclamationTriangle, FaChevronDown, FaSearch, FaSpinner, FaBook, FaUserTie, FaUserGraduate, FaUsers } from "react-icons/fa";

interface AddGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    projectManager: string;
    members: string[];
    adviser: string | null;
    capstoneTitle: string;
  }) => void;
  isSubmitting?: boolean;
  networkError?: string | null;
  setNetworkError?: React.Dispatch<React.SetStateAction<string | null>>;
  projectManagers: { _id: string; first_name: string; last_name: string; }[];
  members: { _id: string; first_name: string; last_name: string; }[];
  advisers: { _id: string; first_name: string; last_name: string; }[];
}

const AddGroupForm: React.FC<AddGroupFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting = false,
  networkError = null,
  setNetworkError,
  projectManagers,
  members,
  advisers
}) => {
  const [formData, setFormData] = useState({
    projectManager: '',
    members: [] as string[],
    adviser: '',
    capstoneTitle: ''
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [projectManagerSearch, setProjectManagerSearch] = useState('');
  const [showProjectManagerSearch, setShowProjectManagerSearch] = useState(false);
  const [adviserSearch, setAdviserSearch] = useState('');
  const [showAdviserSearch, setShowAdviserSearch] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const activeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // If clicking inside the active dropdown, don't close
      if (activeDropdownRef.current?.contains(target)) {
        return;
      }

      // If clicking anywhere else in the form or outside, close dropdowns
      if (formRef.current?.contains(target) || !formRef.current?.contains(target)) {
        closeAllDropdowns();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const closeAllDropdowns = () => {
    setShowMemberSearch(false);
    setShowProjectManagerSearch(false);
    setShowAdviserSearch(false);
  };

  const handleProjectManagerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showProjectManagerSearch) {
      setShowProjectManagerSearch(false);
    } else {
      setShowProjectManagerSearch(true);
      setShowMemberSearch(false);
      setShowAdviserSearch(false);
    }
  };

  const handleMemberClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showMemberSearch) {
      setShowMemberSearch(false);
    } else {
      setShowMemberSearch(true);
      setShowProjectManagerSearch(false);
      setShowAdviserSearch(false);
    }
  };

  const handleAdviserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showAdviserSearch) {
      setShowAdviserSearch(false);
    } else {
      setShowAdviserSearch(true);
      setShowProjectManagerSearch(false);
      setShowMemberSearch(false);
    }
  };

  const handleProjectManagerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectManagerSearch(e.target.value);
  };

  const handleMemberSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberSearch(e.target.value);
  };

  const handleAdviserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdviserSearch(e.target.value);
  };

  const handleProjectManagerSelect = (user: { _id: string; first_name: string; last_name: string }) => {
    setFormData(prev => ({ ...prev, projectManager: user._id }));
    setProjectManagerSearch('');
    setShowProjectManagerSearch(false);
  };

  const handleMemberSelect = (user: { _id: string; first_name: string; last_name: string }) => {
    if (!formData.members.includes(user._id)) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, user._id]
      }));
    }
    setMemberSearch('');
    setShowMemberSearch(false);
  };

  const handleAdviserSelect = (user: { _id: string; first_name: string; last_name: string }) => {
    setFormData(prev => ({
      ...prev,
      adviser: user._id
    }));
    setAdviserSearch('');
    setShowAdviserSearch(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberRemove = (memberToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(member => member !== memberToRemove)
    }));
  };

  const handleClearProjectManager = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, projectManager: '' }));
  };

  const handleClearAdviser = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, adviser: '' }));
  };

  const handleClearMembers = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, members: [] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const errors: { [key: string]: string } = {};
    
    if (!formData.projectManager) {
      errors.projectManager = "Please select a Project Manager";
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    onSubmit({
      projectManager: formData.projectManager,
      members: formData.members,
      adviser: formData.adviser || null,
      capstoneTitle: formData.capstoneTitle,
    });
  };

  // Function to format error message
  const formatErrorMessage = (error: string | null): string => {
    if (!error) return "";
    
    // Handle network-specific errors
    if (error.includes("Network error")) {
      return "Network error - please check your internet connection";
    }
    if (error.includes("timeout") || error.includes("timed out")) {
      return "Request timed out. Please try again.";
    }
    
    // Handle common Convex error patterns
    if (error.includes("ArgumentValidationError")) {
      if (error.includes("projectManagerId")) {
        return "Please select a valid Project Manager";
      }
      if (error.includes("memberIds")) {
        return "Please select valid group members";
      }
      if (error.includes("adviserId")) {
        return "Please select a valid Adviser";
      }
    }
    
    // Handle other common error patterns
    if (error.includes("already exists")) {
      return "This group already exists";
    }
    if (error.includes("not found")) {
      return "One or more selected users could not be found";
    }
    if (error.includes("permission denied")) {
      return "You don't have permission to create this group";
    }
    
    // Default error message
    return "An error occurred while creating the group. Please try again.";
  };

  const handleClose = () => {
    // Reset form data
    setFormData({
      projectManager: '',
      members: [],
      adviser: '',
      capstoneTitle: ''
    });
    // Reset search states
    setMemberSearch('');
    setProjectManagerSearch('');
    setAdviserSearch('');
    closeAllDropdowns();
    setValidationErrors({});
    // Clear network error if possible
    if (typeof setNetworkError === 'function') setNetworkError(null);
    // Call the original onClose
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={formRef} className="bg-white rounded-lg p-8 w-full max-w-2xl shadow-2xl border-2 border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaPlus />
            Add New Group
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
        {networkError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaExclamationTriangle />
              <span>{formatErrorMessage(networkError)}</span>
            </div>
          </div>
        )}

        {/* Validation Errors */}
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
          {/* Capstone Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <FaBook color="#4B5563" />
                Capstone Title
              </div>
            </label>
            <input
              type="text"
              name="capstoneTitle"
              value={formData.capstoneTitle}
              onChange={handleChange}
              placeholder="Enter Capstone Title (Optional)"
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              disabled={isSubmitting}
            />
          </div>

          {/* Project Manager and Adviser Row */}
          <div className="flex gap-4">
            {/* Project Manager */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaUserTie color="#4B5563" />
                    Project Manager <span className="text-red-500">*</span>
                  </div>
                  {formData.projectManager && (
                    <button
                      type="button"
                      onClick={handleClearProjectManager}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </label>
              <div className="relative">
                <div 
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer flex items-center justify-between"
                  onClick={handleProjectManagerClick}
                >
                  {formData.projectManager ? (
                    <div className="flex items-center justify-between w-full">
                      {(() => {
                        const user = projectManagers.find(u => u._id === formData.projectManager);
                        return user ? `${user.first_name} ${user.last_name}` : formData.projectManager;
                      })()}
                    </div>
                  ) : (
                    <span className="text-gray-500">Select Project Manager</span>
                  )}
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FaChevronDown color="#6B7280" />
                </div>
                
                {showProjectManagerSearch && (
                  <div ref={activeDropdownRef} className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <input
                          type="text"
                          value={projectManagerSearch}
                          onChange={handleProjectManagerSearch}
                          placeholder="Search project manager..."
                          className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          autoFocus
                        />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                          <FaSearch />
                        </div>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {projectManagers
                        .filter(user =>
                          `${user.first_name} ${user.last_name}`.toLowerCase().includes(projectManagerSearch.toLowerCase())
                        )
                        .map(user => (
                          <div
                            key={user._id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleProjectManagerSelect(user)}
                          >
                            {user.first_name} {user.last_name}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Adviser */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaUserGraduate color="#4B5563" />
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
                </div>
              </label>
              <div className="relative">
                <div 
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer flex items-center justify-between"
                  onClick={handleAdviserClick}
                >
                  {formData.adviser ? (
                    <div className="flex items-center justify-between w-full">
                      {(() => {
                        const user = advisers.find(u => u._id === formData.adviser);
                        return user ? `${user.first_name} ${user.last_name}` : formData.adviser;
                      })()}
                    </div>
                  ) : (
                    <span className="text-gray-500">Select Adviser (Optional)</span>
                  )}
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FaChevronDown color="#6B7280" />
                </div>
                
                {showAdviserSearch && (
                  <div ref={activeDropdownRef} className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <input
                          type="text"
                          value={adviserSearch}
                          onChange={handleAdviserSearch}
                          placeholder="Search adviser..."
                          className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          autoFocus
                        />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                          <FaSearch />
                        </div>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {advisers
                        .filter(user =>
                          `${user.first_name} ${user.last_name}`.toLowerCase().includes(adviserSearch.toLowerCase())
                        )
                        .map(user => (
                          <div
                            key={user._id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleAdviserSelect(user)}
                          >
                            {user.first_name} {user.last_name}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaUsers color="#4B5563" />
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
              </div>
            </label>
            <div className="relative">
              <div 
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer min-h-[42px]"
                onClick={handleMemberClick}
              >
                {formData.members.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.members.map((memberId, index) => {
                      const user = members.find(u => u._id === memberId);
                      return (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                          {user ? `${user.first_name} ${user.last_name}` : memberId}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                              handleMemberRemove(memberId);
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-gray-500">Select members (Optional)</span>
                )}
              </div>
              
              {showMemberSearch && (
                <div ref={activeDropdownRef} className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={handleMemberSearch}
                        placeholder="Search members..."
                        className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoFocus
                      />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                        <FaSearch />
                      </div>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {members
                      .filter(user =>
                        `${user.first_name} ${user.last_name}`.toLowerCase().includes(memberSearch.toLowerCase()) &&
                        !formData.members.includes(user._id)
                      )
                      .map(user => (
                        <div
                          key={user._id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                          onClick={() => handleMemberSelect(user)}
                        >
                          <div className="w-4 h-4 border-2 border-gray-300 rounded flex items-center justify-center">
                            <FaPlus size={10} color="#4B5563" />
                          </div>
                          {user.first_name} {user.last_name}
                        </div>
                      ))}
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
                  Adding...
                </>
              ) : (
                <>
                  <FaPlus />
                  Add Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGroupForm; 