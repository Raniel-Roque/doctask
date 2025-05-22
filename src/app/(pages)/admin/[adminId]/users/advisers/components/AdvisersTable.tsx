import { FaChevronLeft, FaChevronRight, FaPlus, FaEdit, FaTrash, FaKey, FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Adviser, SortField, SortDirection, TABLE_CONSTANTS } from "./types";

interface AdvisersTableProps {
  advisers: Adviser[];
  searchTerm: string;
  statusFilter: typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS];
  sortField: SortField;
  sortDirection: SortDirection;
  currentPage: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS]) => void;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onEdit: (adviser: Adviser) => void;
  onDelete: (adviser: Adviser) => void;
  onAdd: () => void;
  onResetPassword: (adviser: Adviser) => void;
}

export const AdvisersTable = ({
  advisers,
  searchTerm,
  statusFilter,
  sortField,
  sortDirection,
  currentPage,
  onSearchChange,
  onStatusFilterChange,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
  onAdd,
  onResetPassword,
}: AdvisersTableProps) => {
  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <FaSort />;
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const filterAndSortAdvisers = () => {
    const filtered = advisers.filter((adviser) => {
      const matchesSearch = searchTerm === "" ||
        adviser.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adviser.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adviser.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.ALL ||
        (statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED && adviser.email_verified) ||
        (statusFilter === TABLE_CONSTANTS.STATUS_FILTERS.PENDING && !adviser.email_verified);

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === "_creationTime") {
        comparison = a[sortField] - b[sortField];
      } else {
        comparison = a[sortField].localeCompare(b[sortField]);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const getPaginationInfo = (advisers: Adviser[]) => {
    const entriesPerPage = 10;
    const totalEntries = advisers.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    const startEntry = (currentPage - 1) * entriesPerPage + 1;
    const endEntry = Math.min(startEntry + entriesPerPage - 1, totalEntries);
    const paginatedAdvisers = advisers.slice(startEntry - 1, endEntry);

    return {
      totalEntries,
      totalPages,
      startEntry,
      endEntry,
      paginatedAdvisers,
    };
  };

  const filteredAndSortedAdvisers = filterAndSortAdvisers();
  const { totalEntries, totalPages, startEntry, endEntry, paginatedAdvisers } = getPaginationInfo(filteredAndSortedAdvisers);

  return (
    <div className="px-6 mt-4">
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
        <select 
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as typeof TABLE_CONSTANTS.STATUS_FILTERS[keyof typeof TABLE_CONSTANTS.STATUS_FILTERS])}
        >
          <option value={TABLE_CONSTANTS.STATUS_FILTERS.ALL}>All Status</option>
          <option value={TABLE_CONSTANTS.STATUS_FILTERS.VERIFIED}>Verified</option>
          <option value={TABLE_CONSTANTS.STATUS_FILTERS.PENDING}>Pending</option>
        </select>
        <button 
          onClick={onAdd}
          className="px-4 py-2 bg-[#B54A4A] text-white rounded-lg hover:bg-[#9a3d3d] flex items-center gap-2"
        >
          <FaPlus /> Add Adviser
        </button>
      </div>
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
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
              <th 
                className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("_creationTime")}
              >
                <div className="flex items-center justify-center">
                  Creation Time
                  <span className="ml-1">{getSortIcon("_creationTime")}</span>
                </div>
              </th>
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAdvisers.map((adviser: Adviser, index: number) => (
              <tr key={adviser._id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {adviser.first_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {adviser.middle_name || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {adviser.last_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {adviser.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {adviser.email_verified ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {new Date(adviser._creationTime).toISOString().split('T')[0]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onEdit(adviser)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full relative group"
                      title="Edit"
                    >
                      <FaEdit />
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Edit
                      </span>
                    </button>
                    <button 
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full relative group"
                      title="Reset Password"
                      onClick={() => onResetPassword(adviser)}
                    >
                      <FaKey />
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Reset Password
                      </span>
                    </button>
                    <button 
                      onClick={() => onDelete(adviser)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full relative group"
                      title="Delete"
                    >
                      <FaTrash />
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Delete
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
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
    </div>
  );
}; 