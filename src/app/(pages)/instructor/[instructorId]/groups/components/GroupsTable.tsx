import React, { useState, useRef, useEffect } from "react";
import {
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEdit,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaUser,
  FaPlus,
} from "react-icons/fa"; // Import icons and pagination icons
import { User, Group } from "./types";
import DeleteGroupConfirmation from "./DeleteGroupConfirmation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import GroupPDFReport from "./GroupPDFReport";
import GroupMembersModal from "./GroupMembersModal";

// Capstone Title filter options
const CAPSTONE_FILTERS = {
  ALL: "All Capstone Titles",
  WITH_TITLE: "With Capstone Title",
  WITHOUT_TITLE: "Without Capstone Title",
} as const;

export const GRADE_FILTERS = {
  NO_GRADE: "NO REMARK",
  APPROVED: "APPROVED",
  APPROVED_WITH_REVISIONS: "APPROVED WITH REVISIONS",
  DISAPPROVED: "DISAPPROVED",
  ACCEPTED_WITH_REVISIONS: "ACCEPTED WITH REVISIONS",
  REORAL_DEFENSE: "REORAL DEFENSE",
  NOT_ACCEPTED: "NOT ACCEPTED",
} as const;

const getGradeDisplay = (grade?: number): { text: string; color: string } => {
  if (grade === undefined || grade === null)
    return { text: "No remark", color: "bg-gray-100 text-gray-800" };
  switch (grade) {
    case 0:
      return { text: "No remark", color: "bg-gray-100 text-gray-800" };
    case 1:
      return { text: "Approved", color: "bg-green-100 text-green-800" };
    case 2:
      return {
        text: "Approved With Revisions",
        color: "bg-yellow-100 text-yellow-800",
      };
    case 3:
      return { text: "Disapproved", color: "bg-red-100 text-red-800" };
    case 4:
      return {
        text: "Accepted With Revisions",
        color: "bg-green-100 text-green-800",
      };
    case 5:
      return { text: "Reoral Defense", color: "bg-yellow-100 text-yellow-800" };
    case 6:
      return { text: "Not Accepted", color: "bg-red-100 text-red-800" };
    default:
      return { text: "No remark", color: "bg-gray-100 text-gray-800" };
  }
};

interface GroupsTableProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onAdd: () => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (field: string) => void;
  sortField: string;
  sortDirection: "asc" | "desc";
  searchTerm: string;
  onSearchChange: (term: string) => void;
  status: "idle" | "loading" | "error";
  hasResults: boolean;
  onGradeFilterChange: (
    filters: (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][],
  ) => void;
  isDeleting?: boolean;
  capstoneFilter: (typeof CAPSTONE_FILTERS)[keyof typeof CAPSTONE_FILTERS];
  setCapstoneFilter: React.Dispatch<
    React.SetStateAction<
      (typeof CAPSTONE_FILTERS)[keyof typeof CAPSTONE_FILTERS]
    >
  >;
  capstoneSortDirection: "asc" | "desc" | "none";
  setCapstoneSortDirection?: React.Dispatch<
    React.SetStateAction<"asc" | "desc" | "none">
  >;
  onCapstoneSortApply: (direction: "asc" | "desc" | "none") => void;
  isModalOpen?: boolean; // New prop to indicate if any modal is open
}

const GroupsTable: React.FC<GroupsTableProps> = ({
  groups,
  onEdit,
  onDelete,
  onAdd,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortField,
  sortDirection,
  searchTerm,
  onSearchChange,
  status,
  hasResults,
  onGradeFilterChange,
  isDeleting = false,
  capstoneFilter,
  setCapstoneFilter,
  capstoneSortDirection,
  onCapstoneSortApply,
  isModalOpen = false,
}) => {
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [gradeFilters, setGradeFilters] = useState<
    (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][]
  >([]);
  const [tempGradeFilters, setTempGradeFilters] = useState<
    (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][]
  >([]);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const gradeThRef = useRef<HTMLTableCellElement>(null);
  const gradeButtonRef = useRef<HTMLButtonElement>(null);
  const capstoneThRef = useRef<HTMLTableCellElement>(null);
  const capstoneButtonRef = useRef<HTMLButtonElement>(null);
  const [showCapstoneDropdown, setShowCapstoneDropdown] = useState(false);
  const capstoneDropdownRef = useRef<HTMLDivElement>(null);
  const [tempCapstoneFilter, setTempCapstoneFilter] = useState(capstoneFilter);

  // Add state for expanded capstone titles
  const [expandedCapstoneTitles, setExpandedCapstoneTitles] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    if (showGradeDropdown) {
      setTempGradeFilters(gradeFilters);
    }
  }, [showGradeDropdown, gradeFilters]);

  useEffect(() => {
    if (!showGradeDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        gradeDropdownRef.current &&
        !gradeDropdownRef.current.contains(event.target as Node) &&
        gradeButtonRef.current &&
        !gradeButtonRef.current.contains(event.target as Node)
      ) {
        setShowGradeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showGradeDropdown]);

  useEffect(() => {
    if (!showCapstoneDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        capstoneDropdownRef.current &&
        !capstoneDropdownRef.current.contains(event.target as Node) &&
        capstoneButtonRef.current &&
        !capstoneButtonRef.current.contains(event.target as Node)
      ) {
        setShowCapstoneDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCapstoneDropdown]);

  useEffect(() => {
    if (showCapstoneDropdown) {
      setTempCapstoneFilter(capstoneFilter);
    }
  }, [showCapstoneDropdown, capstoneFilter]);

  const handleViewMembers = (group: Group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
    setSelectedGroup(null);
  };

  // Function to display adviser with email under name
  const getAdviserDisplay = (user: User) => (
    <div>
      <div>
        {user.last_name}, {user.first_name}
        {user.middle_name ? ` ${user.middle_name}` : ""}
      </div>
      <div className="text-xs text-gray-500">{user.email}</div>
    </div>
  );

  // Strengthen key with group IDs checksum
  const exportReady = Array.isArray(groups) && groups.length >= 0;
  const exportIdsChecksum = groups.length
    ? `${groups[0]._id}-${groups[groups.length - 1]._id}-${groups.length}`
    : `empty-${totalCount}`;

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

  const getSortIcon = (field: string) => {
    // If capstone sort is active, show it as the active sort for capstoneTitle field
    if (capstoneSortDirection !== "none" && field === "capstoneTitle") {
      return capstoneSortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
    }

    if (field !== sortField) return <FaSort />;
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const getCapstoneSortIcon = () => {
    if (capstoneSortDirection === "none") return <FaSort />;
    return capstoneSortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  // Update filter handlers to call parent component handlers

  const handleGradeFilter = (
    filter: (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS],
  ) => {
    let newFilters;
    if (tempGradeFilters.includes(filter)) {
      newFilters = tempGradeFilters.filter((f) => f !== filter);
    } else {
      newFilters = [...tempGradeFilters, filter];
    }
    setTempGradeFilters(newFilters);
  };

  const handleSaveGradeFilters = () => {
    setGradeFilters(tempGradeFilters);
    onGradeFilterChange(tempGradeFilters);
    setShowGradeDropdown(false);
    onPageChange(1);
  };

  const handleResetGradeFilters = () => {
    setTempGradeFilters([]);
  };

  return (
    <>
      {/* Search and Add Button */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <FaSearch />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1);
            }}
          />
        </div>

        <button
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
            isModalOpen
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#B54A4A] text-white hover:bg-[#9a3d3d]"
          }`}
          onClick={onAdd}
          disabled={isModalOpen}
          title={isModalOpen ? "Please close all forms before adding a group" : "Add Group"}
        >
          <FaPlus /> Add Group
        </button>
        {!isDeleting &&
          groups.length > 0 &&
          status === "idle" &&
          exportReady && (
            <PDFDownloadLink
              key={`pdf-groups-${searchTerm}-${gradeFilters.join(",")}-${groups.length}-${totalCount}-${exportIdsChecksum}`}
              document={
                <GroupPDFReport
                  groups={groups}
                  title="Groups Report"
                  filters={{
                    searchTerm,
                    gradeFilters,
                  }}
                />
              }
              fileName={`GroupsReport-${gradeFilters.join(",")}_${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`}
            >
              {({ loading }) => (
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={loading}
                  title="Download Report"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {loading ? "Preparing..." : "Download Report"}
                </button>
              )}
            </PDFDownloadLink>
          )}
      </div>

      {/* Table content */}
      <div className="relative">
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
                ref={capstoneThRef}
                scope="col"
                className="relative px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">CAPSTONE TITLE</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1 bg-transparent border-none outline-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCapstoneDropdown(!showCapstoneDropdown);
                        setShowGradeDropdown(false);
                      }}
                      title="Filter capstone titles"
                      ref={capstoneButtonRef}
                      style={{
                        boxShadow: "none",
                        marginLeft: 0,
                        marginRight: 0,
                        paddingRight: 0,
                      }}
                    >
                      <FaFilter
                        className={
                          `w-4 h-4 transition-colors ` +
                          (showCapstoneDropdown ||
                          capstoneFilter !== CAPSTONE_FILTERS.ALL
                            ? "text-blue-500"
                            : "text-white")
                        }
                      />
                    </button>
                    <button
                      type="button"
                      className="p-1 bg-transparent border-none outline-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (capstoneSortDirection === "asc") {
                          onCapstoneSortApply("desc");
                        } else if (capstoneSortDirection === "desc") {
                          onCapstoneSortApply("none");
                        } else {
                          onCapstoneSortApply("asc");
                        }
                      }}
                      title="Sort capstone titles"
                      style={{
                        boxShadow: "none",
                        marginLeft: 0,
                        marginRight: 0,
                        paddingRight: 0,
                      }}
                    >
                      {getCapstoneSortIcon()}
                    </button>
                  </div>
                </div>
                {showCapstoneDropdown && (
                  <div
                    ref={capstoneDropdownRef}
                    className="fixed z-50 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    style={{
                      minWidth: 220,
                      left:
                        capstoneButtonRef.current?.getBoundingClientRect()
                          .left || 0,
                      top:
                        (capstoneButtonRef.current?.getBoundingClientRect()
                          .bottom || 0) + 8,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-2 flex flex-col gap-1">
                      {Object.values(CAPSTONE_FILTERS).map((filter) => (
                        <label
                          key={filter}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                        >
                          <input
                            type="radio"
                            name="capstoneFilter"
                            checked={tempCapstoneFilter === filter}
                            onChange={() => setTempCapstoneFilter(filter)}
                            className="accent-blue-600"
                          />
                          <span className="text-left">{filter}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCapstoneFilter(tempCapstoneFilter);
                          setShowCapstoneDropdown(false);
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Apply Filter
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
                className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("adviser")}
              >
                <div className="flex items-center justify-center">
                  ADVISER
                  <span className="ml-1">{getSortIcon("adviser")}</span>
                </div>
              </th>
              <th
                ref={gradeThRef}
                scope="col"
                className="relative px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">REMARK</span>
                  <button
                    type="button"
                    className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGradeDropdown(!showGradeDropdown);
                    }}
                    title="Filter grades"
                    ref={gradeButtonRef}
                    style={{ boxShadow: "none" }}
                  >
                    <FaFilter
                      className={
                        `w-4 h-4 transition-colors ` +
                        (showGradeDropdown || gradeFilters.length > 0
                          ? "text-blue-500"
                          : "text-white")
                      }
                    />
                  </button>
                </div>
                {showGradeDropdown && (
                  <div
                    ref={gradeDropdownRef}
                    className="fixed z-50 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    style={{
                      minWidth: 220,
                      left:
                        gradeButtonRef.current?.getBoundingClientRect().left ||
                        0,
                      top:
                        (gradeButtonRef.current?.getBoundingClientRect()
                          .bottom || 0) + 8,
                    }}
                  >
                    <div
                      className="max-h-52 overflow-y-auto px-3 py-2 flex flex-col gap-1"
                      style={{ maxHeight: 220 }}
                    >
                      {Object.values(GRADE_FILTERS).map((filter) => (
                        <label
                          key={filter}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                        >
                          <input
                            type="checkbox"
                            checked={tempGradeFilters.includes(filter)}
                            onChange={() => handleGradeFilter(filter)}
                            className="accent-blue-600"
                          />
                          <span className="text-left">{filter}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={handleSaveGradeFilters}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleResetGradeFilters}
                        className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm font-medium"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
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
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {status === "error" && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-red-500">
                  An error occurred while loading groups. Please try again.
                </td>
              </tr>
            )}
            {status === "idle" && !hasResults && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm
                    ? "No groups found matching your search criteria."
                    : 'No groups available. Click "Add Group" to create a new group.'}
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {group.adviser ? getAdviserDisplay(group.adviser) : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {(() => {
                    const { text, color } = getGradeDisplay(group.grade);
                    return (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}
                      >
                        {text}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onEdit(group)}
                      className="p-2 text-blue-600 hover:text-blue-800"
                      title="Edit Group"
                    >
                      <FaEdit />
                    </button>
                    <span className="mx-1 text-gray-300 select-none">|</span>
                    <button
                      onClick={() => setGroupToDelete(group)}
                      className="p-2 text-red-600 hover:text-red-800"
                      title="Delete Group"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteGroupConfirmation
        group={groupToDelete}
        isOpen={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={() => {
          if (groupToDelete) {
            onDelete(groupToDelete);
            setGroupToDelete(null);
          }
        }}
      />

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

      {/* Group Members Modal */}
      <GroupMembersModal
        isOpen={showMembersModal}
        onClose={handleCloseMembersModal}
        group={selectedGroup}
      />
    </>
  );
};

export default GroupsTable;
