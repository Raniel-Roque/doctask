"use client";

import React, { useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaTimes,
  FaMinus,
  FaPlus,
} from "react-icons/fa";
import { Group } from "./types";

interface GroupsTableProps {
  groups: Group[];
  onAccept: (group: Group) => void;
  onReject: (group: Group) => void;
  sortField: "name" | "capstoneTitle" | "projectManager";
  sortDirection: "asc" | "desc";
  onSort: (field: "name" | "capstoneTitle" | "projectManager") => void;
  getSortIcon: (
    field: "name" | "capstoneTitle" | "projectManager",
  ) => React.ReactNode;
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
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  // Add state for expanded capstone titles
  const [expandedCapstoneTitles, setExpandedCapstoneTitles] = useState<Set<string>>(new Set());

  const toggleExpand = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  const getFullName = (user: { first_name: string; middle_name?: string; last_name: string }) => {
    return `${user.last_name}, ${user.first_name}${
      user.middle_name ? ` ${user.middle_name}` : ""
    }`;
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
          setExpandedCapstoneTitles(prev => {
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
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                  onClick={() => onSort("projectManager")}
                >
                  <div className="flex items-center justify-center">
                    Project Manager
                    <span className="ml-1">
                      {getSortIcon("projectManager")}
                    </span>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
                >
                  Members
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
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {status === "error" && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-red-500"
                  >
                    An error occurred while loading groups. Please try again.
                  </td>
                </tr>
              )}
              {status === "idle" && !hasResults && (
                <tr>
                  <td
                    colSpan={5}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {group.projectManager
                      ? getFullName(group.projectManager)
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleExpand(group._id)}
                          className="text-gray-500 hover:text-gray-700 focus:outline-none"
                          disabled={
                            !group.members || group.members.length === 0
                          }
                        >
                          {group.members && group.members.length > 0 ? (
                            expandedGroupId === group._id ? (
                              <FaMinus color="#6B7280" />
                            ) : (
                              <FaPlus color="#6B7280" />
                            )
                          ) : null}
                        </button>
                        <span className="ml-2">
                          {group.members && group.members.length > 0 ? (
                            `${group.members.length} member${group.members.length === 1 ? "" : "s"}`
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </span>
                      </div>
                    </div>
                    {group.members &&
                      group.members.length > 0 &&
                      expandedGroupId === group._id && (
                        <div className="mt-2 pl-6">
                          <ul className="list-disc list-inside">
                            {group.members
                              ?.slice()
                              .sort((a, b) => {
                                const aName =
                                  `${a.last_name} ${a.first_name}`.toLowerCase();
                                const bName =
                                  `${b.last_name} ${b.first_name}`.toLowerCase();
                                return aName.localeCompare(bName);
                              })
                              .map((member) => (
                                <li
                                  key={member._id}
                                  className="text-sm text-gray-600"
                                >
                                  {getFullName(member)}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
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
    </div>
  );
};

export default GroupsTable;
