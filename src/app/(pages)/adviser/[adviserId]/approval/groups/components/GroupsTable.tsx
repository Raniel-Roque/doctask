"use client";

import React, { useState, useRef } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaTimes,
  FaUser,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import { Group } from "./types";
import GroupMembersModal from "./GroupMembersModal";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";

// =========================================
// Performance Optimization: Limit Rendered Items
// =========================================
const MAX_VISIBLE_ITEMS = 50; // Only render 50 items at a time for better performance

// Capstone Type filter options
const CAPSTONE_TYPE_FILTERS = {
  ALL: "All Capstone Types",
  CP1: "Capstone 1",
  CP2: "Capstone 2",
} as const;

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
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onCapstoneTypeFilterChange: (
    filters: (typeof CAPSTONE_TYPE_FILTERS)[keyof typeof CAPSTONE_TYPE_FILTERS][],
  ) => void;
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
  searchTerm,
  onSearchChange,
  onCapstoneTypeFilterChange,
}) => {
  const { addBanner } = useBannerManager();
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [capstoneTypeFilter, setCapstoneTypeFilter] = useState<
    (typeof CAPSTONE_TYPE_FILTERS)[keyof typeof CAPSTONE_TYPE_FILTERS]
  >(CAPSTONE_TYPE_FILTERS.ALL);
  const [tempCapstoneTypeFilter, setTempCapstoneTypeFilter] = useState<
    (typeof CAPSTONE_TYPE_FILTERS)[keyof typeof CAPSTONE_TYPE_FILTERS]
  >(CAPSTONE_TYPE_FILTERS.ALL);
  const [showCapstoneTypeDropdown, setShowCapstoneTypeDropdown] = useState(false);
  const capstoneTypeDropdownRef = useRef<HTMLDivElement>(null);
  const capstoneTypeButtonRef = useRef<HTMLButtonElement>(null);

  // Per-column expansion state for collapsible content
  const [expandedColumns, setExpandedColumns] = useState<{
    capstoneTitle: boolean;
  }>({
    capstoneTitle: false,
  });

  const handleViewMembers = (group: Group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
    setSelectedGroup(null);
  };

  const handleAccept = (group: Group) => {
    // Check if offline
    if (!navigator.onLine) {
      addBanner({
        message:
          "Cannot approve group while offline. Please check your internet connection.",
        type: "error",
        onClose: () => {},
        autoClose: false,
      });
      return;
    }
    onAccept(group);
  };

  const handleReject = (group: Group) => {
    // Check if offline
    if (!navigator.onLine) {
      addBanner({
        message:
          "Cannot reject group while offline. Please check your internet connection.",
        type: "error",
        onClose: () => {},
        autoClose: false,
      });
      return;
    }
    onReject(group);
  };

  const handleSaveCapstoneTypeFilter = () => {
    setCapstoneTypeFilter(tempCapstoneTypeFilter);
    onCapstoneTypeFilterChange([tempCapstoneTypeFilter]);
    setShowCapstoneTypeDropdown(false);
    onPageChange(1);
  };

  // =========================================
  // Collapsible Text Component
  // =========================================
  const CollapsibleText = ({
    text,
    maxLength = 50,
  }: {
    text: string | null | undefined;
    maxLength?: number;
  }) => {
    if (!text) return <span>-</span>;
    if (text.length <= maxLength) return <span>{text}</span>;

    const isExpanded = expandedColumns.capstoneTitle;

    return (
      <button
        onClick={() => {
          setExpandedColumns((prev) => ({
            ...prev,
            capstoneTitle: !prev.capstoneTitle,
          }));
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
      {/* Search Controls */}
      <div className="mb-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <FaSearch />
          </div>
          <input
            type="text"
            placeholder="Search groups..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1); // Reset to first page when searching
            }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full min-w-[800px] divide-y divide-gray-200">
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
                  className="relative px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium uppercase">CAPSTONE TYPE</span>
                    <button
                      type="button"
                      className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCapstoneTypeDropdown(!showCapstoneTypeDropdown);
                      }}
                      title="Filter capstone types"
                      ref={capstoneTypeButtonRef}
                      style={{ boxShadow: "none" }}
                    >
                      <FaFilter
                        className={
                          `w-4 h-4 transition-colors ` +
                        (showCapstoneTypeDropdown || capstoneTypeFilter !== CAPSTONE_TYPE_FILTERS.ALL
                          ? "text-blue-500"
                          : "text-white")
                        }
                      />
                    </button>
                  </div>
                  {showCapstoneTypeDropdown && (
                    <div
                      ref={capstoneTypeDropdownRef}
                      className="fixed z-50 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                      style={{
                        minWidth: 220,
                        left:
                          capstoneTypeButtonRef.current?.getBoundingClientRect()
                            .left || 0,
                        top:
                          (capstoneTypeButtonRef.current?.getBoundingClientRect()
                            .bottom || 0) + 8,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="max-h-52 overflow-y-auto px-3 py-2 flex flex-col gap-1">
                        {Object.values(CAPSTONE_TYPE_FILTERS).map((filter) => (
                          <label
                            key={filter}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                          >
                            <input
                              type="radio"
                              name="capstoneTypeFilter"
                              checked={tempCapstoneTypeFilter === filter}
                              onChange={() => setTempCapstoneTypeFilter(filter)}
                              className="accent-blue-600"
                            />
                            <span className="text-left">{filter}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                        <button
                          onClick={handleSaveCapstoneTypeFilter}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
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
                    {searchTerm
                      ? "No groups found matching your search criteria."
                      : "No group requests available at this time."}
                  </td>
                </tr>
              )}
              {(searchTerm.trim()
                ? groups // Show all results when searching
                : groups.slice(0, MAX_VISIBLE_ITEMS)
              ) // Limit when not searching
                .map((group) => (
                  <tr key={group._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {group.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <CollapsibleText text={group.capstone_title} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        group.capstone_type === 0 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-green-100 text-green-800"
                      }`}>
                        {group.capstone_type === 0 ? "Capstone 1" : "Capstone 2"}
                      </span>
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
                          onClick={() => handleAccept(group)}
                          className="p-2 text-green-600 hover:text-green-800 transition-colors"
                          title="Accept"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => handleReject(group)}
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

          {/* Performance Warning */}
          {!searchTerm.trim() && groups.length > MAX_VISIBLE_ITEMS && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Performance Notice:</strong> Showing first{" "}
                    {MAX_VISIBLE_ITEMS} of {groups.length} items on this page
                    for optimal performance. Use search to find specific groups.
                  </p>
                </div>
              </div>
            </div>
          )}
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
