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
} from "react-icons/fa";
import { User, SortField, SortDirection, TABLE_CONSTANTS } from "./types";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFReport from "./PDFReport";
import { api } from "../../../../../../../convex/_generated/api";

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
  showRoleColumn = false,
  showCodeColumn = false,
  totalPages,
  totalCount,
  isLoading,
  hasResults,
  pageSize,
  onPageSizeChange,
  isStudent,
  isDeleting = false,
}: UserTableProps) => {
  const [expandedCode, setExpandedCode] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [expandedEmail, setExpandedEmail] = useState<{
    [key: string]: boolean;
  }>({});
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState(statusFilter);
  const [tempRoleFilter, setTempRoleFilter] = useState(roleFilter);

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

  // Fetch adviser codes
  const adviserCodes = useQuery(api.fetch.getAdviserCodes) || {};

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

  // =========================================
  // Collapsible Text Component
  // =========================================
  const CollapsibleCode = ({ userId }: { userId: string }) => {
    const code = adviserCodes[userId]?.code || "Loading...";
    const isExpanded = expandedCode[userId] || false;

    return (
      <button
        onClick={() =>
          setExpandedCode((prev) => ({ ...prev, [userId]: !prev[userId] }))
        }
        className="w-full text-center"
      >
        {isExpanded ? code : `${code.slice(0, 4)}...`}
      </button>
    );
  };

  const CollapsibleEmail = ({
    email,
    userId,
  }: {
    email: string;
    userId: string;
  }) => {
    const isExpanded = expandedEmail[userId] || false;

    return (
      <button
        onClick={() =>
          setExpandedEmail((prev) => ({ ...prev, [userId]: !prev[userId] }))
        }
        className="w-full text-left"
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
        </div>
      </div>

      {/* Table */}
      <div className="relative">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-[#B54A4A]">
              <th
                className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("first_name")}
              >
                <div className="flex items-center justify-center">
                  First Name
                  <span className="ml-1">{getSortIcon("first_name")}</span>
                </div>
              </th>
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                Middle Name
              </th>
              <th
                className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("last_name")}
              >
                <div className="flex items-center justify-center">
                  Last Name
                  <span className="ml-1">{getSortIcon("last_name")}</span>
                </div>
              </th>
              <th
                className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("email")}
              >
                <div className="flex items-center justify-center">
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
                      left: statusButtonRef.current?.getBoundingClientRect().left || 0,
                      top: (statusButtonRef.current?.getBoundingClientRect().bottom || 0) + 8
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
                        left: roleButtonRef.current?.getBoundingClientRect().left || 0,
                        top: (roleButtonRef.current?.getBoundingClientRect().bottom || 0) + 8
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
              paginatedUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 border-b text-left">
                    {user.first_name}
                  </td>
                  <td
                    className={`px-6 py-4 border-b ${!user.middle_name ? "text-center" : "text-left"}`}
                  >
                    {user.middle_name || "-"}
                  </td>
                  <td className="px-6 py-4 border-b text-left">
                    {user.last_name}
                  </td>
                  <td className="px-6 py-4 border-b text-center">
                    <CollapsibleEmail email={user.email} userId={user._id} />
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
                      <button
                        onClick={() => onResetPassword(user)}
                        className="p-2 text-yellow-600 hover:text-yellow-800"
                        title="Reset Password"
                      >
                        <FaKey />
                      </button>
                      <button
                        onClick={() => onLockAccount(user)}
                        className="p-2 text-purple-600 hover:text-purple-800"
                        title="Lock/Unlock Account"
                      >
                        <FaLock />
                      </button>
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
            {!isDeleting && users.length > 0 && !isLoading && (
              <>
                <span className="text-gray-300 mx-1">|</span>
                <PDFDownloadLink
                  document={
                    <PDFReport
                      users={allFilteredUsersQuery?.users || []}
                      title={
                        showRoleColumn ? "Students Report" : "Advisers Report"
                      }
                      filters={{
                        status: statusFilter,
                        subrole: showRoleColumn
                          ? roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MANAGER
                            ? "MANAGER"
                            : roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MEMBER
                              ? "MEMBER"
                              : "ALL ROLE"
                          : undefined,
                      }}
                      isStudent={isStudent}
                      adviserCodes={adviserCodes}
                    />
                  }
                  fileName={(() => {
                    const role = showRoleColumn ? "Student" : "Adviser";
                    const filters = [
                      `Status-${statusFilter}`,
                      `Role-${roleFilter}`,
                    ];
                    const date = new Date();
                    const dateTime = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date.getSeconds().toString().padStart(2, "0")}`;
                    return `${role}Report-${filters.join("_")}-${dateTime}.pdf`;
                  })()}
                >
                  {() => (
                    <span
                      className="text-blue-600 cursor-pointer hover:underline text-sm font-medium ml-2"
                      title="Download Report"
                      style={{ minWidth: 90, display: "inline-block" }}
                    >
                      Download Report
                    </span>
                  )}
                </PDFDownloadLink>
              </>
            )}
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
  );
};
