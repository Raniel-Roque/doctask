"use client";

import React, { useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import { Group } from "./types";
import GroupMembersModal from "./GroupMembersModal";

interface GroupsTableProps {
  groups: Group[];
  onAccept: (group: Group) => void;
  onReject: (group: Group) => void;
  sortField: "name" | "capstoneTitle";
  sortDirection: "asc" | "desc";
  onSort: (field: "name" | "capstoneTitle") => void;
  getSortIcon: (field: "name" | "capstoneTitle") => React.ReactNode;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  status: "idle" | "loading" | "error";
  hasResults: boolean;
}

const GroupsTable: React.FC<GroupsTableProps> = ({
  groups,
  onAccept,
  onReject,
  onSort,
  getSortIcon,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  status,
  hasResults,
}) => {
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Add state for expanded capstone titles
  const [expandedCapstoneTitles, setExpandedCapstoneTitles] = useState<
    Set<string>
  >(new Set());

  const handleViewMembers = (group: Group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
    setSelectedGroup(null);
  };

  // =========================================
  // Collapsible Text Component
  // =========================================
  const CollapsibleText = ({
    text,
    maxLength = 50,
    groupId,
  }: {
    text: string | null | undefined;
    maxLength?: number;
    groupId: string;
  }) => {
    if (!text) return <span>-</span>;
    if (text.length <= maxLength) return <span>{text}</span>;

    const isExpanded = expandedCapstoneTitles.has(groupId);

    return (
      <button
        onClick={() => {
          setExpandedCapstoneTitles((prev) => {
            const newSet = new Set(prev);
            if (isExpanded) {
              newSet.delete(groupId);
            } else {
              newSet.add(groupId);
            }
            return newSet;
          });
        }}
        className="w-full text-left hover:bg-gray-50 rounded px-1 py-1 transition-colors"
        title={isExpanded ? "Click to collapse" : "Click to expand"}
      >
        {isExpanded ? (
          <span>{text}</span>
        ) : (
          <span>{text.slice(0, maxLength)}...</span>
        )}
      </button>
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#B54A4A] text-white">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                  onClick={() => onSort("name")}
                >
                  <div className="flex items-center justify-center">
                    Group Name
                    <span className="ml-1">{getSortIcon("name")}</span>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                  onClick={() => onSort("capstoneTitle")}
                >
                  <div className="flex items-center justify-center">
                    Capstone Title
                    <span className="ml-1">{getSortIcon("capstoneTitle")}</span>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
                >
                  Group Members
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {status === "loading" && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {status === "error" && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-red-500"
                  >
                    An error occurred while loading groups. Please try again.
                  </td>
                </tr>
              )}
              {status === "idle" && !hasResults && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No group requests available at this time.
                  </td>
                </tr>
              )}
              {groups.map((group) => (
                <tr key={group._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {group.name || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <CollapsibleText
                      text={group.capstone_title}
                      groupId={group._id}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleViewMembers(group)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      disabled={!group.members && !group.projectManager}
                    >
                      <FaUser className="mr-1" size={12} />
                      {(() => {
                        const memberCount =
                          (group.members?.length || 0) +
                          (group.projectManager ? 1 : 0);
                        return memberCount > 0
                          ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
                          : "No members";
                      })()}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onAccept(group)}
                        className="p-2 text-green-600 hover:text-green-800 transition-colors"
                        title="Accept"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={() => onReject(group)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        title="Reject"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="min-w-full flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </span>
              {" - "}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>
              {" of "}
              <span className="font-medium">{totalCount}</span>
              {" entries"}
            </p>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-700">entries per page</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-md ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FaChevronLeft />
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-md ${
                currentPage === totalPages
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Group Members Modal */}
      <GroupMembersModal
        isOpen={showMembersModal}
        onClose={handleCloseMembersModal}
        group={selectedGroup}
      />
    </div>
  );
};

export default GroupsTable;
