import { FaChevronLeft, FaChevronRight, FaPlus, FaEdit, FaTrash, FaKey, FaSearch, FaSort, FaSortUp, FaSortDown, FaChevronDown } from "react-icons/fa";
import { User, SortField, SortDirection, TABLE_CONSTANTS } from "./types";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";

// =========================================
// Types
// =========================================
interface UserTableProps {
  users: User[];
  searchTerm: string;
  statusFilter: typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS];
  roleFilter?: typeof TABLE_CONSTANTS.ROLE_FILTERS[keyof typeof TABLE_CONSTANTS.ROLE_FILTERS];
  sortField: SortField;
  sortDirection: SortDirection;
  currentPage: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS]) => void;
  onRoleFilterChange?: (value: typeof TABLE_CONSTANTS.ROLE_FILTERS[keyof typeof TABLE_CONSTANTS.ROLE_FILTERS]) => void;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onAdd: () => void;
  onResetPassword: (user: User) => void;
  showRoleColumn?: boolean;
  showCodeColumn?: boolean;
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
  showRoleColumn = false,
  showCodeColumn = false,
}: UserTableProps) => {
  const [expandedCode, setExpandedCode] = useState<{ [key: string]: boolean }>({});
  const [expandedEmail, setExpandedEmail] = useState<{ [key: string]: boolean }>({});

  // Fetch adviser codes
  const adviserCodes = useQuery(api.documents.getAdviserCodes) || {};

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
        return "Member";
      case 1:
        return "Manager";
      default:
        return "N/A";
    }
  };

  // =========================================
  // Data Processing
  // =========================================
  const filterAndSortUsers = () => {
    const filtered = users.filter((user) => {
      const matchesSearch = searchTerm === "" ||
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.ALL ||
        (statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED && user.email_verified) ||
        (statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.UNVERIFIED && !user.email_verified);

      const matchesRole = roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.ALL ||
        (roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MANAGER && user.subrole === 1) ||
        (roleFilter === TABLE_CONSTANTS.ROLE_FILTERS.MEMBER && user.subrole === 0);

      return matchesSearch && matchesStatus && matchesRole;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "_creationTime":
          comparison = a._creationTime - b._creationTime;
          break;
        case "first_name":
          comparison = a.first_name.localeCompare(b.first_name);
          break;
        case "last_name":
          comparison = a.last_name.localeCompare(b.last_name);
          break;
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const getPaginationInfo = (users: User[]) => {
    const entriesPerPage = 5;
    const totalEntries = users.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    const startEntry = (currentPage - 1) * entriesPerPage + 1;
    const endEntry = Math.min(startEntry + entriesPerPage - 1, totalEntries);
    const paginatedUsers = users.slice(startEntry - 1, endEntry);

    return {
      totalEntries,
      totalPages,
      startEntry,
      endEntry,
      paginatedUsers,
    };
  };

  // =========================================
  // Data Processing Results
  // =========================================
  const filteredAndSortedUsers = filterAndSortUsers();
  const { totalEntries, totalPages, startEntry, endEntry, paginatedUsers } = getPaginationInfo(filteredAndSortedUsers);

  // =========================================
  // Collapsible Text Component
  // =========================================
  const CollapsibleCode = ({ userId }: { userId: string }) => {
    const code = adviserCodes[userId]?.code || "Loading...";
    const isExpanded = expandedCode[userId] || false;

    return (
      <button
        onClick={() => setExpandedCode(prev => ({ ...prev, [userId]: !prev[userId] }))}
        className="w-full text-center"
      >
        {isExpanded ? code : `${code.slice(0, 4)}...`}
      </button>
    );
  };

  const CollapsibleEmail = ({ email, userId }: { email: string, userId: string }) => {
    const isExpanded = expandedEmail[userId] || false;

    return (
      <button
        onClick={() => setExpandedEmail(prev => ({ ...prev, [userId]: !prev[userId] }))}
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
        <div className="relative">
          <select 
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS])}
          >
            <option value={TABLE_CONSTANTS.STATUS_FILTERS.ALL}>All Status</option>
            <option value={TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED}>Verified</option>
            <option value={TABLE_CONSTANTS.STATUS_FILTERS.UNVERIFIED}>Unverified</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <FaChevronDown color="#6B7280" />
          </div>
        </div>
        {showRoleColumn && onRoleFilterChange && (
          <div className="relative">
            <select 
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10"
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value as typeof TABLE_CONSTANTS.ROLE_FILTERS[keyof typeof TABLE_CONSTANTS.ROLE_FILTERS])}
            >
              <option value={TABLE_CONSTANTS.ROLE_FILTERS.ALL}>All Roles</option>
              <option value={TABLE_CONSTANTS.ROLE_FILTERS.MANAGER}>Manager</option>
              <option value={TABLE_CONSTANTS.ROLE_FILTERS.MEMBER}>Member</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <FaChevronDown color="#6B7280" />
            </div>
          </div>
        )}
        <button 
          onClick={onAdd}
          className="px-4 py-2 bg-[#B54A4A] text-white rounded-lg hover:bg-[#9a3d3d] flex items-center gap-2"
        >
          <FaPlus /> Add User
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
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
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">Middle Name</th>
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
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                Status
              </th>
              {showCodeColumn && (
                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                  Code
                </th>
              )}
              {showRoleColumn && (
                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                  Role
                </th>
              )}
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 border-b text-center">{user.first_name}</td>
                <td className="px-6 py-4 border-b text-center">{user.middle_name || "-"}</td>
                <td className="px-6 py-4 border-b text-center">{user.last_name}</td>
                <td className="px-6 py-4 border-b text-center">
                  <CollapsibleEmail email={user.email} userId={user._id} />
                </td>
                <td className="px-6 py-4 border-b text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.email_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.email_verified ? 'Verified' : 'Unverified'}
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
                  <div className="flex justify-center gap-2">
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
                      onClick={() => onDelete(user)}
                      className="p-2 text-red-600 hover:text-red-800"
                      title="Delete"
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

      {/* Pagination */}
      <div className="min-w-full flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex items-center">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startEntry}</span> to <span className="font-medium">{endEntry}</span> of{' '}
            <span className="font-medium">{totalEntries}</span> entries
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-md ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FaChevronLeft />
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md ${
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}; 