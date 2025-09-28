import {
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaEdit,
  FaTrash,
  FaKey,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaLock,
  FaFilter,
  FaSync,
} from "react-icons/fa";
import { User, SortField, SortDirection, TABLE_CONSTANTS } from "./types";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { ResetCodeConfirmation } from "./ResetCodeConfirmation";
// Using jsPDF for better performance - no React re-rendering
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}
import { api } from "../../../../../../../convex/_generated/api";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";

// =========================================
// Performance Optimization: Limit Rendered Items
// =========================================
const MAX_VISIBLE_ITEMS = 50; // Only render 50 items at a time for better performance

// =========================================
// Types
// =========================================
interface UserTableProps {
  users: User[];
  searchTerm: string;
  statusFilter: (typeof TABLE_CONSTANTS.STATUS_FILTERS)[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS];
  roleFilter?: (typeof TABLE_CONSTANTS.ROLE_FILTERS)[keyof typeof TABLE_CONSTANTS.ROLE_FILTERS];
  sortField: SortField;
  sortDirection: SortDirection;
  currentPage: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (
    value: (typeof TABLE_CONSTANTS.STATUS_FILTERS)[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS],
  ) => void;
  onRoleFilterChange?: (
    value: (typeof TABLE_CONSTANTS.ROLE_FILTERS)[keyof typeof TABLE_CONSTANTS.ROLE_FILTERS],
  ) => void;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onAdd: () => void;
  onResetPassword: (user: User) => void;
  onLockAccount: (user: User) => void;
  onResetCode?: (user: User) => void;
  showRoleColumn?: boolean;
  showCodeColumn?: boolean;
  totalPages: number;
  totalCount: number;
  isLoading: boolean;
  hasResults: boolean;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  isStudent?: boolean;
  isDeleting?: boolean;
  onExcelUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  isModalOpen?: boolean; // New prop to indicate if any modal is open
}

// =========================================
// Component
// =========================================
export const UserTable = ({
  users,
  searchTerm,
  statusFilter,
  roleFilter = TABLE_CONSTANTS.ROLE_FILTERS.ALL,
  sortField,
  sortDirection,
  currentPage,
  onSearchChange,
  onStatusFilterChange,
  onRoleFilterChange,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
  onAdd,
  onResetPassword,
  onLockAccount,
  onResetCode,
  showRoleColumn = false,
  showCodeColumn = false,
  totalPages,
  totalCount,
  isLoading,
  hasResults,
  pageSize,
  onPageSizeChange,
  // isStudent, // Removed - no longer needed with jsPDF
  isDeleting = false,
  onExcelUpload,
  isUploading = false,
  uploadProgress = 0,
  isModalOpen = false,
}: UserTableProps) => {
  const { addBanner } = useBannerManager();

  // Per-column expansion state for collapsible content
  const [expandedColumns, setExpandedColumns] = useState<{
    email: boolean;
    code: boolean;
    firstName: boolean;
    middleName: boolean;
    lastName: boolean;
  }>({
    email: false,
    code: false,
    firstName: false,
    middleName: false,
    lastName: false,
  });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState(statusFilter);
  const [tempRoleFilter, setTempRoleFilter] = useState(roleFilter);
  const [resetCodeUser, setResetCodeUser] = useState<User | null>(null);
  const [isResettingCode, setIsResettingCode] = useState(false);
  const [resetCodeError, setResetCodeError] = useState<string | null>(null);

  // Add refs for dropdown elements
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const roleButtonRef = useRef<HTMLButtonElement>(null);

  // Click outside handlers
  useEffect(() => {
    if (!showStatusDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node) &&
        statusButtonRef.current &&
        !statusButtonRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showStatusDropdown]);

  useEffect(() => {
    if (!showRoleDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node) &&
        roleButtonRef.current &&
        !roleButtonRef.current.contains(event.target as Node)
      ) {
        setShowRoleDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRoleDropdown]);

  useEffect(() => {
    if (showStatusDropdown) setTempStatusFilter(statusFilter);
  }, [showStatusDropdown, statusFilter]);
  useEffect(() => {
    if (showRoleDropdown) setTempRoleFilter(roleFilter);
  }, [showRoleDropdown, roleFilter]);

  // Fetch adviser codes - memoize to prevent unnecessary re-renders
  const adviserCodesQuery = useQuery(api.fetch.getAdviserCodes);
  const adviserCodes = useMemo(
    () => adviserCodesQuery || {},
    [adviserCodesQuery],
  );

  // Fetch all filtered users for PDF export
  const allFilteredUsersQuery = useQuery(api.fetch.searchUsers, {
    searchTerm,
    role: showRoleColumn ? 0 : 1,
    emailVerified:
      statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED
        ? true
        : statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.UNVERIFIED
          ? false
          : undefined,
    ...(showRoleColumn &&
      (roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MANAGER
        ? { subrole: 1 }
        : roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MEMBER
          ? { subrole: 0 }
          : {})),
    pageSize: 10000,
    pageNumber: 1,
    sortField,
    sortDirection,
  });

  // Export readiness and key strengthening - memoize to prevent unnecessary re-renders
  const exportUsers = useMemo(
    () =>
      Array.isArray(allFilteredUsersQuery?.users)
        ? (allFilteredUsersQuery?.users as User[])
        : [],
    [allFilteredUsersQuery?.users],
  );
  // Removed exportReady and stableExportKey - no longer needed with jsPDF

  // Efficient PDF generation function - no React re-rendering
  const generatePDF = () => {
    try {
      const doc = new jsPDF("landscape", "mm", "a4");

      // Add title
      const title = showRoleColumn ? "Students Report" : "Advisers Report";
      doc.setFontSize(16);
      doc.text(title, 14, 20);

      // Add filters info
      doc.setFontSize(10);
      let yPos = 30;
      const filterParts = [];
      if (searchTerm) filterParts.push(`Search: ${searchTerm.slice(0, 20)}...`);
      filterParts.push(`Status: ${statusFilter}`);
      if (showRoleColumn) {
        const role =
          roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MANAGER
            ? "MANAGER"
            : roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MEMBER
              ? "MEMBER"
              : "ALL";
        filterParts.push(`Role: ${role}`);
      }

      if (filterParts.length > 0) {
        doc.text(`Filters: ${filterParts.join(" | ")}`, 14, yPos);
        yPos += 8;
      }

      // Add generation date
      const now = new Date();
      doc.text(`Generated: ${now.toLocaleString()}`, 14, yPos);
      yPos += 15;

      // Use current users data instead of exportUsers if it's empty
      const dataToUse = exportUsers.length > 0 ? exportUsers : users;

      // Prepare table data
      const tableData = dataToUse.map((user) => {
        const firstName = user.first_name || "";
        const middleName = user.middle_name || "-";
        const lastName = user.last_name || "";
        const email = user.email || "N/A";
        const status = user.email_verified ? "Verified" : "Unverified";

        // Get adviser code if showCodeColumn is true
        const code = showCodeColumn
          ? adviserCodes[user._id]?.code || "Loading..."
          : "";

        // Get role if showRoleColumn is true
        const role = showRoleColumn
          ? user.subrole === 1
            ? "Project Manager"
            : "Project Member"
          : "";

        // Build row based on which columns are shown
        const row = [firstName, middleName, lastName, email, status];
        if (showCodeColumn) row.push(code);
        if (showRoleColumn) row.push(role);

        return row;
      });

      // Build headers based on which columns are shown
      const headers = [
        "First Name",
        "Middle Name",
        "Last Name",
        "Email",
        "Status",
      ];
      if (showCodeColumn) headers.push("Code");
      if (showRoleColumn) headers.push("Role");

      // Build column styles based on which columns are shown
      const columnStyles: Record<number, { cellWidth: number }> = {
        0: { cellWidth: 30 }, // First Name
        1: { cellWidth: 25 }, // Middle Name
        2: { cellWidth: 30 }, // Last Name
        3: { cellWidth: 50 }, // Email
        4: { cellWidth: 20 }, // Status
      };

      let colIndex = 5;
      if (showCodeColumn) {
        columnStyles[colIndex] = { cellWidth: 35 }; // Code
        colIndex++;
      }
      if (showRoleColumn) {
        columnStyles[colIndex] = { cellWidth: 30 }; // Role
      }

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [181, 74, 74] },
        margin: { left: 14, right: 14 },
        tableWidth: "auto",
        columnStyles,
      });

      // Save the PDF
      const date = new Date();
      const dateTime = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}`;
      const role = showRoleColumn ? "Students" : "Advisers";
      const fileName = `${role}_Report_${dateTime}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      addBanner({
        message: "Error generating PDF. Please try again.",
        type: "error",
        onClose: () => {},
        autoClose: true,
      });
    }
  };

  // =========================================
  // Helper Functions
  // =========================================
  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <FaSort />;
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const getRoleLabel = (subrole?: number) => {
    switch (subrole) {
      case 0:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Project Member
          </span>
        );
      case 1:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Project Manager
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            N/A
          </span>
        );
    }
  };

  // =========================================
  // Data Processing
  // =========================================
  // No client-side pagination: users is already paginated from parent
  const paginatedUsers = users;

  // Performance optimization: Limit rendered items to prevent slowdown with large datasets
  // Only apply this limit if we're not searching (to ensure search results are always visible)
  const visibleUsers = searchTerm.trim()
    ? paginatedUsers // Show all results when searching
    : paginatedUsers.slice(0, MAX_VISIBLE_ITEMS); // Limit when not searching

  // =========================================
  // Collapsible Text Component
  // =========================================
  const CollapsibleName = ({
    name,
    type,
    maxLength = 20,
  }: {
    name: string;
    type: "firstName" | "middleName" | "lastName";
    maxLength?: number;
  }) => {
    if (!name) return <span>-</span>;
    if (name.length <= maxLength)
      return <span className="break-words">{name}</span>;

    const isExpanded = expandedColumns[type];

    return (
      <button
        onClick={() => {
          setExpandedColumns((prev) => ({
            ...prev,
            [type]: !prev[type],
          }));
        }}
        className="w-full text-left hover:bg-gray-50 rounded px-1 py-1 transition-colors break-words"
        title={isExpanded ? "Click to collapse" : "Click to expand"}
      >
        {isExpanded ? (
          <span className="break-words">{name}</span>
        ) : (
          <span className="break-words">{name.slice(0, maxLength)}...</span>
        )}
      </button>
    );
  };

  const CollapsibleCode = ({ userId }: { userId: string }) => {
    const code = adviserCodes[userId]?.code || "Loading...";
    const isExpanded = expandedColumns.code;

    return (
      <button
        onClick={() =>
          setExpandedColumns((prev) => ({ ...prev, code: !prev.code }))
        }
        className="w-full text-center break-words"
        title={isExpanded ? "Click to collapse" : "Click to expand"}
      >
        {isExpanded ? code : `${code.slice(0, 4)}...`}
      </button>
    );
  };

  const CollapsibleEmail = ({ email }: { email: string }) => {
    const isExpanded = expandedColumns.email;

    return (
      <button
        onClick={() =>
          setExpandedColumns((prev) => ({ ...prev, email: !prev.email }))
        }
        className="w-full text-left break-words"
        title={isExpanded ? "Click to collapse" : "Click to expand"}
      >
        {isExpanded ? email : `${email.slice(0, 10)}...`}
      </button>
    );
  };

  // =========================================
  // Render
  // =========================================
  return (
    <div className="mt-4">
      {/* Search and Filters */}
      <div className="mb-4 flex gap-4">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <FaSearch />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-[#B54A4A] text-white rounded-lg hover:bg-[#9a3d3d] flex items-center gap-2"
          >
            <FaPlus /> Add User
          </button>

          {onExcelUpload && (
            <label
              htmlFor="excel-upload"
              title={
                isModalOpen
                  ? "Please close all forms before uploading"
                  : "Upload Excel (.xlsx)"
              }
              className={`relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white transition-all duration-200 select-none ${
                isUploading || isModalOpen
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 active:bg-green-800"
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={onExcelUpload}
                disabled={isUploading || isModalOpen}
                className="absolute inset-0 w-full h-full opacity-0 disabled:cursor-not-allowed z-10"
                id="excel-upload"
                style={{ width: "100%", height: "100%" }}
              />
              {isUploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading... {uploadProgress}%
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Upload
                </>
              )}
            </label>
          )}

          {/* Download Options Dropdown */}
          <div className="relative group">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              title="Download Options"
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
              Download
              <svg
                className="w-3 h-3 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-2">
                <div className="text-xs text-gray-500 font-medium mb-2 px-2">
                  Download Options:
                </div>

                {/* Template Download */}
                <a
                  href={`/templates/${showRoleColumn ? "Student Template.xlsx" : "Adviser Template.xlsx"}`}
                  download={`${showRoleColumn ? "Student" : "Adviser"} Template.xlsx`}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-150 flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {showRoleColumn ? "Student" : "Adviser"} Template (.xlsx)
                </a>

                {/* Report Download */}
                {!isDeleting && users.length > 0 && !isLoading && (
                  <button
                    onClick={generatePDF}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-150 flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-blue-600"
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
                    {showRoleColumn ? "Students" : "Advisers"} Report (.pdf)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="mb-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Processing Excel file... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[800px] bg-white border border-gray-200">
          <thead>
            <tr className="bg-[#B54A4A]">
              <th
                className="px-6 py-3 border-b text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("first_name")}
              >
                <div className="flex items-center">
                  First Name
                  <span className="ml-1">{getSortIcon("first_name")}</span>
                </div>
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-white uppercase tracking-wider">
                Middle Name
              </th>
              <th
                className="px-6 py-3 border-b text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("last_name")}
              >
                <div className="flex items-center">
                  Last Name
                  <span className="ml-1">{getSortIcon("last_name")}</span>
                </div>
              </th>
              <th
                className="px-6 py-3 border-b text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("email")}
              >
                <div className="flex items-center">
                  Email
                  <span className="ml-1">{getSortIcon("email")}</span>
                </div>
              </th>
              <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">STATUS</span>
                  <button
                    type="button"
                    className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStatusDropdown(!showStatusDropdown);
                      setShowRoleDropdown(false);
                    }}
                    title="Filter status"
                    ref={statusButtonRef}
                    style={{ boxShadow: "none" }}
                  >
                    <FaFilter
                      className={
                        `w-4 h-4 transition-colors ` +
                        (showStatusDropdown ||
                        statusFilter !== TABLE_CONSTANTS.STATUS_FILTERS.ALL
                          ? "text-blue-500"
                          : "text-white")
                      }
                    />
                  </button>
                </div>
                {showStatusDropdown && (
                  <div
                    ref={statusDropdownRef}
                    className="fixed z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    style={{
                      left:
                        statusButtonRef.current?.getBoundingClientRect().left ||
                        0,
                      top:
                        (statusButtonRef.current?.getBoundingClientRect()
                          .bottom || 0) + 8,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="max-h-48 overflow-y-auto px-3 py-2 flex flex-col gap-1">
                      {Object.values(TABLE_CONSTANTS.STATUS_FILTERS).map(
                        (filter) => (
                          <label
                            key={filter}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                          >
                            <input
                              type="radio"
                              name="statusFilter"
                              checked={tempStatusFilter === filter}
                              onChange={() => setTempStatusFilter(filter)}
                              className="accent-blue-600"
                            />
                            <span className="text-left">{filter}</span>
                          </label>
                        ),
                      )}
                    </div>
                    <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => {
                          setShowStatusDropdown(false);
                          onStatusFilterChange(tempStatusFilter);
                          onPageChange(1);
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </th>
              {showCodeColumn && (
                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                  Code
                </th>
              )}
              {showRoleColumn && (
                <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium uppercase">ROLE</span>
                    <button
                      type="button"
                      className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRoleDropdown(!showRoleDropdown);
                        setShowStatusDropdown(false);
                      }}
                      title="Filter role"
                      ref={roleButtonRef}
                      style={{ boxShadow: "none" }}
                    >
                      <FaFilter
                        className={
                          `w-4 h-4 transition-colors ` +
                          (showRoleDropdown ||
                          roleFilter !== TABLE_CONSTANTS.ROLE_FILTERS.ALL
                            ? "text-blue-500"
                            : "text-white")
                        }
                      />
                    </button>
                  </div>
                  {showRoleDropdown && onRoleFilterChange && (
                    <div
                      ref={roleDropdownRef}
                      className="fixed z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                      style={{
                        left:
                          roleButtonRef.current?.getBoundingClientRect().left ||
                          0,
                        top:
                          (roleButtonRef.current?.getBoundingClientRect()
                            .bottom || 0) + 8,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="max-h-48 overflow-y-auto px-3 py-2 flex flex-col gap-1">
                        {Object.values(TABLE_CONSTANTS.ROLE_FILTERS).map(
                          (filter) => (
                            <label
                              key={filter}
                              className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                            >
                              <input
                                type="radio"
                                name="roleFilter"
                                checked={tempRoleFilter === filter}
                                onChange={() => setTempRoleFilter(filter)}
                                className="accent-blue-600"
                              />
                              <span className="text-left">{filter}</span>
                            </label>
                          ),
                        )}
                      </div>
                      <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                        <button
                          onClick={() => {
                            setShowRoleDropdown(false);
                            if (onRoleFilterChange)
                              onRoleFilterChange(tempRoleFilter);
                            onPageChange(1);
                          }}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </th>
              )}
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : !hasResults ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  {showRoleColumn
                    ? 'No students available. Click "Add User" to create a new student.'
                    : 'No advisers available. Click "Add User" to create a new adviser.'}
                </td>
              </tr>
            ) : (
              visibleUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 border-b text-left max-w-xs">
                    <CollapsibleName name={user.first_name} type="firstName" />
                  </td>
                  <td
                    className={`px-6 py-4 border-b max-w-xs ${!user.middle_name ? "text-center" : "text-left"}`}
                  >
                    {user.middle_name ? (
                      <CollapsibleName
                        name={user.middle_name}
                        type="middleName"
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 border-b text-left max-w-xs">
                    <CollapsibleName name={user.last_name} type="lastName" />
                  </td>
                  <td className="px-6 py-4 border-b text-left max-w-xs">
                    <CollapsibleEmail email={user.email} />
                  </td>
                  <td className="px-6 py-4 border-b text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.email_verified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {user.email_verified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  {showCodeColumn && (
                    <td className="px-6 py-4 border-b text-center">
                      <CollapsibleCode userId={user._id} />
                    </td>
                  )}
                  {showRoleColumn && (
                    <td className="px-6 py-4 border-b text-center">
                      {getRoleLabel(user.subrole)}
                    </td>
                  )}
                  <td className="px-6 py-4 border-b text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => onEdit(user)}
                        className="p-2 text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <span className="mx-1 text-gray-300 select-none">|</span>
                      <button
                        onClick={() => onResetPassword(user)}
                        className="p-2 text-yellow-600 hover:text-yellow-800"
                        title="Reset Password"
                      >
                        <FaKey />
                      </button>
                      <span className="mx-1 text-gray-300 select-none">|</span>
                      <button
                        onClick={() => onLockAccount(user)}
                        className="p-2 text-purple-600 hover:text-purple-800"
                        title="Lock/Unlock Account"
                      >
                        <FaLock />
                      </button>
                      {showCodeColumn && onResetCode && (
                        <>
                          <span className="mx-1 text-gray-300 select-none">
                            |
                          </span>
                          <button
                            onClick={() => setResetCodeUser(user)}
                            className="p-2 text-orange-600 hover:text-orange-800"
                            title="Reset Adviser Code"
                          >
                            <FaSync />
                          </button>
                        </>
                      )}
                      <span className="mx-1 text-gray-300 select-none">|</span>
                      <button
                        onClick={() => onDelete(user)}
                        className="p-2 text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Performance Warning */}
        {!searchTerm.trim() && paginatedUsers.length > MAX_VISIBLE_ITEMS && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Performance Notice:</strong> Showing first{" "}
                  {MAX_VISIBLE_ITEMS} of {paginatedUsers.length} items on this
                  page for optimal performance. Use search to find specific
                  users.
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

      {/* Reset Code Confirmation Modal */}
      {resetCodeUser && onResetCode && (
        <ResetCodeConfirmation
          user={resetCodeUser}
          onCancel={() => {
            setResetCodeUser(null);
            setResetCodeError(null);
            setIsResettingCode(false);
          }}
          onConfirm={async () => {
            setIsResettingCode(true);
            setResetCodeError(null);
            try {
              await onResetCode(resetCodeUser);
              setResetCodeUser(null);
            } catch (error) {
              setResetCodeError(
                error instanceof Error
                  ? error.message
                  : "Failed to reset adviser code",
              );
            } finally {
              setIsResettingCode(false);
            }
          }}
          isSubmitting={isResettingCode}
          networkError={resetCodeError}
        />
      )}
    </div>
  );
};
