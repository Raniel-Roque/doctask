"use client";

import React from "react";
import { FaTimes, FaUser } from "react-icons/fa";

interface User {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
}

interface Group {
  _id: string;
  capstone_title?: string;
  projectManager?: User;
  members?: User[];
  adviser?: User;
}

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
}

const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  if (!isOpen || !group) return null;

  const allMembers = group.members || [];
  const projectManager = group.projectManager;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Group Members
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {group.capstone_title || "Untitled Group"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Project Manager */}
          {projectManager && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <FaUser className="mr-2 text-blue-600" />
                Project Manager
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {projectManager.last_name}, {projectManager.first_name}
                      {projectManager.middle_name
                        ? ` ${projectManager.middle_name}`
                        : ""}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {projectManager.email}
                    </div>
                  </div>
                  <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    Manager
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <FaUser className="mr-2 text-green-600" />
              Group Members ({allMembers.length})
            </h3>
            {allMembers.length > 0 ? (
              <div className="space-y-3">
                {allMembers
                  .slice()
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
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.last_name}, {member.first_name}
                            {member.middle_name ? ` ${member.middle_name}` : ""}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {member.email}
                          </div>
                        </div>
                        <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                          Member
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaUser className="mx-auto mb-2 text-gray-300" size={32} />
                <p>No members assigned to this group</p>
              </div>
            )}
          </div>

          {/* Adviser */}
          {group.adviser && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <FaUser className="mr-2 text-purple-600" />
                Adviser
              </h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {group.adviser.last_name}, {group.adviser.first_name}
                      {group.adviser.middle_name
                        ? ` ${group.adviser.middle_name}`
                        : ""}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {group.adviser.email}
                    </div>
                  </div>
                  <div className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                    Adviser
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupMembersModal;
