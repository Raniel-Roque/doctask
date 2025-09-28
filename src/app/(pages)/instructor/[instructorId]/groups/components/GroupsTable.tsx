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
// Using jsPDF for better performance - no React re-rendering
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}
import GroupMembersModal from "./GroupMembersModal";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";

// =========================================
// Performance Optimization: Limit Rendered Items
// =========================================
const MAX_VISIBLE_ITEMS = 50; // Only render 50 items at a time for better performance

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
  const { addBanner } = useBannerManager();

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

  // Per-column expansion state for collapsible content
  const [expandedColumns, setExpandedColumns] = useState<{
    capstoneTitle: boolean;
  }>({
    capstoneTitle: false,
  });

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

  // Removed exportReady and stableExportKey - no longer needed with jsPDF

  // Efficient PDF generation function - no React re-rendering
  const generatePDF = () => {
    try {
      const doc = new jsPDF("landscape", "mm", "a4");

      // Add title
      doc.setFontSize(16);
      doc.text("Groups Report", 14, 20);

      // Add filters info
      doc.setFontSize(10);
      let yPos = 30;
      const filterParts = [];
      if (searchTerm) filterParts.push(`Search: ${searchTerm.slice(0, 20)}...`);
      if (gradeFilters.length > 0)
        filterParts.push(`Grades: ${gradeFilters.join(", ")}`);
      if (capstoneFilter !== CAPSTONE_FILTERS.ALL)
        filterParts.push(`Capstone: ${capstoneFilter}`);

      if (filterParts.length > 0) {
        doc.text(`Filters: ${filterParts.join(" | ")}`, 14, yPos);
        yPos += 8;
      }

      // Add generation date
      const now = new Date();
      doc.text(`Generated: ${now.toLocaleString()}`, 14, yPos);
      yPos += 15;

      // Prepare table data
      const tableData = groups.map((group) => {
        const name = group.name || "N/A";
        const capstoneTitle = group.capstone_title || "No title";

        // Project Manager
        const projectManager = group.projectManager
          ? `${group.projectManager.first_name} ${group.projectManager.last_name}`
          : "No manager";

        // Members list
        const members =
          group.members
            ?.map((member) => `${member.first_name} ${member.last_name}`)
            .join("\n") || "No members";

        const memberCount =
          (group.members?.length || 0) + (group.projectManager ? 1 : 0);
        const createdAt = new Date(group._creationTime).toLocaleDateString();

        return [
          name,
          capstoneTitle,
          projectManager,
          members,
          memberCount.toString(),
          createdAt,
        ];
      });

      // Add table
      autoTable(doc, {
        head: [
          [
            "Group Name",
            "Capstone Title",
            "Project Manager",
            "Members",
            "Group Members",
            "Created",
          ],
        ],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [181, 74, 74] },
        margin: { left: 14, right: 14 },
        tableWidth: "auto",
        columnStyles: {
          0: { cellWidth: 25 }, // Group Name
          1: { cellWidth: 40 }, // Capstone Title
          2: { cellWidth: 30 }, // Project Manager
          3: { cellWidth: 30 }, // Members
          4: { cellWidth: 20 }, // Group Members count
          5: { cellWidth: 20 }, // Created
        },
      });

      // Save the PDF
      const date = new Date();
      const dateTime = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}`;
      const fileName = `Groups_Report_${dateTime}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating Groups PDF:", error);
      addBanner({
        message: "Error generating PDF. Please try again.",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    }
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
    if (text.length <= maxLength)
      return <span className="break-words">{text}</span>;

    const isExpanded = expandedColumns.capstoneTitle;

    return (
      <button
        onClick={() => {
          setExpandedColumns((prev) => ({
            ...prev,
            capstoneTitle: !prev.capstoneTitle,
          }));
        }}
        className="w-full text-left hover:bg-gray-50 rounded px-1 py-1 transition-colors break-words"
        title={isExpanded ? "Click to collapse" : "Click to expand"}
      >
        {isExpanded ? (
          <span className="break-words">{text}</span>
        ) : (
          <span className="break-words">{text.slice(0, maxLength)}...</span>
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
          title={
            isModalOpen
              ? "Please close all forms before adding a group"
              : "Add Group"
          }
        >
          <FaPlus /> Add Group
        </button>
        {!isDeleting && groups.length > 0 && (
          <button
            onClick={generatePDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
            Download Report
          </button>
        )}
      </div>

      {/* Table content */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[900px] divide-y divide-gray-200">
          <thead className="bg-[#B54A4A] text-white">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("name")}
              >
                <div className="flex items-center">
                  Group Name
                  <span className="ml-1">{getSortIcon("name")}</span>
                </div>
              </th>
              <th
                ref={capstoneThRef}
                scope="col"
                className="relative px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
              >
                <div className="flex items-center gap-2">
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
                          onPageChange(1);
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
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("adviser")}
              >
                <div className="flex items-center">
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
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {status === "error" && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-red-500">
                  An error occurred while loading groups. Please try again.
                </td>
              </tr>
            )}
            {status === "idle" && !hasResults && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm
                    ? "No groups found matching your search criteria."
                    : 'No groups available. Click "Add Group" to create a new group.'}
                </td>
              </tr>
            )}
            {(searchTerm.trim()
              ? groups // Show all results when searching
              : groups.slice(0, MAX_VISIBLE_ITEMS)
            ) // Limit when not searching
              .map((group) => (
                <tr key={group._id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-left max-w-xs">
                    <div className="break-words">{group.name || "-"}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs text-left">
                    <CollapsibleText text={group.capstone_title} />
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">
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

        {/* Performance Warning */}
        {!searchTerm.trim() && groups.length > MAX_VISIBLE_ITEMS && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Performance Notice:</strong> Showing first{" "}
                  {MAX_VISIBLE_ITEMS} of {groups.length} items on this page for
                  optimal performance. Use search to find specific groups.
                </p>
              </div>
            </div>
          </div>
        )}
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
