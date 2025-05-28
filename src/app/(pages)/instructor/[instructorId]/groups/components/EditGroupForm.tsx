import React, { useState } from 'react';
import { FaEdit, FaTimes, FaExclamationTriangle, FaChevronDown, FaSearch, FaSpinner } from "react-icons/fa";

interface Group {
  name: string;
  projectManager: string;
  members: string[];
  adviser: string;
  grade?: string;
}

interface EditGroupFormProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  networkError?: string | null;
}

const EditGroupForm: React.FC<EditGroupFormProps> = ({ 
  group, 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting = false,
  networkError = null
}) => {
  const [formData, setFormData] = useState({
    members: [] as string[],
    adviser: '',
    grade: ''
  });

  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [adviserSearch, setAdviserSearch] = useState('');
  const [showAdviserSearch, setShowAdviserSearch] = useState(false);

  // Placeholder data - replace with actual data later
  const students = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Bob Johnson' },
    { id: '4', name: 'Alice Williams' },
    { id: '5', name: 'Michael Brown' },
    { id: '6', name: 'Sarah Davis' },
    { id: '7', name: 'David Wilson' },
    { id: '8', name: 'Emily Taylor' },
    { id: '9', name: 'James Anderson' },
    { id: '10', name: 'Lisa Martinez' },
    { id: '11', name: 'Robert Garcia' },
    { id: '12', name: 'Jennifer Robinson' },
    { id: '13', name: 'William Clark' },
    { id: '14', name: 'Mary Rodriguez' },
    { id: '15', name: 'Thomas Lewis' }
  ];

  const advisers = [
    { id: '1', name: 'Dr. Smith' },
    { id: '2', name: 'Prof. Johnson' },
    { id: '3', name: 'Dr. Williams' },
    { id: '4', name: 'Dr. Brown' },
    { id: '5', name: 'Prof. Davis' },
    { id: '6', name: 'Dr. Wilson' },
    { id: '7', name: 'Prof. Taylor' },
    { id: '8', name: 'Dr. Anderson' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberSearch(e.target.value);
  };

  const handleAdviserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdviserSearch(e.target.value);
  };

  const handleMemberSelect = (member: { id: string, name: string }) => {
    if (!formData.members.includes(member.name)) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, member.name]
      }));
    }
    setMemberSearch('');
    setShowMemberSearch(false);
  };

  const handleAdviserSelect = (adviser: { id: string, name: string }) => {
    setFormData(prev => ({
      ...prev,
      adviser: adviser.name
    }));
    setAdviserSearch('');
    setShowAdviserSearch(false);
  };

  const handleMemberRemove = (memberToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(member => member !== memberToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const closeAllDropdowns = () => {
    setShowMemberSearch(false);
    setShowAdviserSearch(false);
  };

  const handleMemberClick = () => {
    closeAllDropdowns();
    setShowMemberSearch(!showMemberSearch);
  };

  const handleAdviserClick = () => {
    closeAllDropdowns();
    setShowAdviserSearch(!showAdviserSearch);
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaEdit />
            Edit Group
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
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={group.name || ""}
              readOnly
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 bg-gray-50"
            />
          </div>

          {/* Project Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Manager <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={group.projectManager || ""}
              readOnly
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 bg-gray-50"
            />
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Members <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div 
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
                onClick={handleMemberClick}
              >
                {formData.members.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.members.map((member, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {member}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberRemove(member);
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">Select members...</span>
                )}
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <FaChevronDown color="#6B7280" />
              </div>
              
              {showMemberSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
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
                    {students
                      .filter(student => 
                        student.name.toLowerCase().includes(memberSearch.toLowerCase()) &&
                        !formData.members.includes(student.name)
                      )
                      .map(student => (
                        <div
                          key={student.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleMemberSelect(student)}
                        >
                          {student.name}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Adviser */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adviser <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div 
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
                onClick={handleAdviserClick}
              >
                {formData.adviser || (
                  <span className="text-gray-500">Select Adviser</span>
                )}
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <FaChevronDown color="#6B7280" />
              </div>
              
              {showAdviserSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
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
                      .filter(adviser => 
                        adviser.name.toLowerCase().includes(adviserSearch.toLowerCase())
                      )
                      .map(adviser => (
                        <div
                          key={adviser.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleAdviserSelect(adviser)}
                        >
                          {adviser.name}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade
            </label>
            <input
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              placeholder="Enter grade"
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-8">
            <button
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
                  <FaEdit />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGroupForm; 