import React, { useState } from 'react';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash, FaChevronDown, FaPlus, FaChevronLeft, FaChevronRight, FaMinus, FaTimes } from "react-icons/fa"; // Import icons and pagination icons
import { User, Group } from './types';
import DeleteGroupConfirmation from './DeleteGroupConfirmation';
import { PDFDownloadLink } from '@react-pdf/renderer';
import GroupPDFReport from './GroupPDFReport';

// Capstone Title filter options
const CAPSTONE_FILTERS = {
  ALL: "All Capstone Titles",
  WITH_TITLE: "With Capstone Title",
  WITHOUT_TITLE: "Without Capstone Title"
} as const;

const GRADE_FILTERS = {
  ALL: "All Grades",
  NO_GRADE: "No Grade",
  APPROVED: "Approved",
  APPROVED_WITH_REVISIONS: "Approved With Revisions",
  DISAPPROVED: "Disapproved",
  ACCEPTED_WITH_REVISIONS: "Accepted With Revisions",
  REORAL_DEFENSE: "Reoral Defense",
  NOT_ACCEPTED: "Not Accepted"
} as const;

const getGradeDisplay = (grade?: number): { text: string; color: string } => {
  if (grade === undefined || grade === null) return { text: 'No grade', color: 'bg-gray-100 text-gray-800' };
  switch (grade) {
    case 0:
      return { text: 'No grade', color: 'bg-gray-100 text-gray-800' };
    case 1:
      return { text: 'Approved', color: 'bg-green-100 text-green-800' };
    case 2:
      return { text: 'Approved With Revisions', color: 'bg-yellow-100 text-yellow-800' };
    case 3:
      return { text: 'Disapproved', color: 'bg-red-100 text-red-800' };
    case 4:
      return { text: 'Accepted With Revisions', color: 'bg-green-100 text-green-800' };
    case 5:
      return { text: 'Reoral Defense', color: 'bg-yellow-100 text-yellow-800' };
    case 6:
      return { text: 'Not Accepted', color: 'bg-red-100 text-red-800' };
    default:
      return { text: 'No grade', color: 'bg-gray-100 text-gray-800' };
  }
};

interface GroupsTableProps {
  groups: Group[];
  advisers: User[];
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
  status: 'idle' | 'loading' | 'error';
  hasResults: boolean;
  onCapstoneFilterChange: (filter: typeof CAPSTONE_FILTERS[keyof typeof CAPSTONE_FILTERS]) => void;
  onAdviserFilterChange: (filter: string) => void;
  onGradeFilterChange: (filter: typeof GRADE_FILTERS[keyof typeof GRADE_FILTERS]) => void;
  isDeleting?: boolean;
}

const GroupsTable: React.FC<GroupsTableProps> = ({
  groups,
  advisers,
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
  onCapstoneFilterChange,
  onAdviserFilterChange,
  onGradeFilterChange,
  isDeleting = false,
}) => {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [adviserFilter, setAdviserFilter] = useState<string>("");
  const [showAdviserDropdown, setShowAdviserDropdown] = useState(false);
  const [adviserSearch, setAdviserSearch] = useState("");
  const [capstoneFilter, setCapstoneFilter] = useState<typeof CAPSTONE_FILTERS[keyof typeof CAPSTONE_FILTERS]>(CAPSTONE_FILTERS.ALL);
  const [showCapstoneDropdown, setShowCapstoneDropdown] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<typeof GRADE_FILTERS[keyof typeof GRADE_FILTERS]>(GRADE_FILTERS.ALL);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [gradeSearch, setGradeSearch] = useState("");
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const toggleExpand = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  const getFullName = (user: User) => {
    return `${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`;
  };

  // Get unique advisers for filter dropdown
  const uniqueAdvisers = Array.from(new Set(
    advisers.map(adviser => getFullName(adviser))
  )).sort();

  const getSortIcon = (field: string) => {
       if (field !== sortField) return <FaSort />;
       return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  // Update filter handlers to call parent component handlers
  const handleCapstoneFilter = (filter: typeof CAPSTONE_FILTERS[keyof typeof CAPSTONE_FILTERS]) => {
    setCapstoneFilter(filter);
    setShowCapstoneDropdown(false);
    onPageChange(1);
    onCapstoneFilterChange(filter);
  };

  const handleAdviserFilter = (filter: string) => {
    setAdviserFilter(filter);
    setShowAdviserDropdown(false);
    onPageChange(1);
    onAdviserFilterChange(filter);
  };

  const handleGradeFilter = (filter: typeof GRADE_FILTERS[keyof typeof GRADE_FILTERS]) => {
    setGradeFilter(filter);
    setShowGradeDropdown(false);
    onPageChange(1);
    onGradeFilterChange(filter);
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

        {/* Capstone Title Filter */}
        <div className="relative">
          <div 
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10 cursor-pointer min-w-[200px]"
            onClick={() => {
              setShowCapstoneDropdown(!showCapstoneDropdown);
              setShowAdviserDropdown(false);
              setShowGradeDropdown(false);
            }}
          >
            {capstoneFilter === CAPSTONE_FILTERS.ALL ? "All Capstone Titles" : capstoneFilter}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <FaChevronDown color="#6B7280" />
            </div>
          </div>
          
          {showCapstoneDropdown && (
            <div className="absolute z-10 w-[300px] mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="max-h-48 overflow-y-auto">
                {Object.values(CAPSTONE_FILTERS).map((filter) => (
                  <div
                    key={filter}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleCapstoneFilter(filter)}
                  >
                    {filter}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Adviser Filter */}
        <div className="relative">
          <div 
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10 cursor-pointer min-w-[200px]"
            onClick={() => {
              setShowAdviserDropdown(!showAdviserDropdown);
              setShowCapstoneDropdown(false);
              setShowGradeDropdown(false);
            }}
          >
            {adviserFilter || "All Advisers"}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <FaChevronDown color="#6B7280" />
            </div>
          </div>
          
          {showAdviserDropdown && (
            <div className="absolute z-10 w-[300px] mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-2 border-b">
                <div className="relative">
                  <input
                    type="text"
                    value={adviserSearch}
                    onChange={(e) => setAdviserSearch(e.target.value)}
                    placeholder="Search advisers..."
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoFocus
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaSearch />
                  </div>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <div
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleAdviserFilter("")}
                >
                  All Advisers
                </div>
                <div
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleAdviserFilter("No Adviser")}
                >
                  No Adviser
                </div>
                {uniqueAdvisers
                  .filter(adviser => 
                    adviser.toLowerCase().includes(adviserSearch.toLowerCase())
                  )
                  .map(adviser => (
                    <div
                      key={adviser}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
                      onClick={() => handleAdviserFilter(adviser)}
                    >
                      {adviser}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Grade Filter */}
        <div className="relative">
          <div 
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10 cursor-pointer min-w-[150px]"
            onClick={() => {
              setShowGradeDropdown(!showGradeDropdown);
              setShowCapstoneDropdown(false);
              setShowAdviserDropdown(false);
            }}
          >
            {gradeFilter}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <FaChevronDown color="#6B7280" />
            </div>
          </div>
          
          {showGradeDropdown && (
            <div className="absolute z-10 w-[300px] mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="p-2 border-b">
                <div className="relative">
                  <input
                    type="text"
                    value={gradeSearch}
                    onChange={(e) => setGradeSearch(e.target.value)}
                    placeholder="Search grades..."
                    className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoFocus
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaSearch />
                  </div>
                  {gradeSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGradeSearch('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {Object.values(GRADE_FILTERS)
                  .filter(grade => 
                    grade.toLowerCase().includes(gradeSearch.toLowerCase())
                  )
                  .map((filter) => (
                  <div
                    key={filter}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        handleGradeFilter(filter);
                        setGradeSearch('');
                      }}
                  >
                    {filter}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <button className="px-4 py-2 bg-[#B54A4A] text-white rounded-lg hover:bg-[#9a3d3d] flex items-center gap-2" onClick={onAdd}>
          <FaPlus /> Add Group
        </button>
      </div>

      {/* Table content */}
      <div className="relative">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#B54A4A] text-white">
            <tr>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer" onClick={() => onSort("name")}>
                <div className="flex items-center justify-center">
                  Group Name
                  <span className="ml-1">{getSortIcon("name")}</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer" onClick={() => onSort("capstoneTitle")}>
                <div className="flex items-center justify-center">
                  Capstone Title
                  <span className="ml-1">{getSortIcon("capstoneTitle")}</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer" onClick={() => onSort("projectManager")}>
                <div className="flex items-center justify-center">
                  Project Manager
                  <span className="ml-1">{getSortIcon("projectManager")}</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Members</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                <div className="flex items-center justify-center">
                  Adviser
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer" onClick={() => onSort("grade")}>
                <div className="flex items-center justify-center">
                  Grade
                  <span className="ml-1">{getSortIcon("grade")}</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {status === 'loading' && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {status === 'error' && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-red-500">
                  An error occurred while loading groups. Please try again.
                </td>
              </tr>
            )}
            {status === 'idle' && !hasResults && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm ? 'No groups found matching your search criteria.' : 'No groups available. Click "Add Group" to create a new group.'}
                </td>
              </tr>
            )}
            {groups.map((group) => (
              <tr key={group._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {group.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{group.capstone_title || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {group.projectManager ? getFullName(group.projectManager) : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleExpand(group._id)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                        disabled={!group.members || group.members.length === 0}
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
                          `${group.members.length} member${group.members.length === 1 ? '' : 's'}`
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {group.members && group.members.length > 0 && expandedGroupId === group._id && (
                    <div className="mt-2 pl-6">
                      <ul className="list-disc list-inside">
                        {group.members
                          ?.slice()
                          .sort((a, b) => {
                            const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
                            const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
                            return aName.localeCompare(bName);
                          })
                          .map((member) => (
                            <li key={member._id} className="text-sm text-gray-600">
                              {getFullName(member)}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {group.adviser ? getFullName(group.adviser) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  {(() => {
                    const { text, color } = getGradeDisplay(group.grade);
                    return (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                        {text}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onEdit(group)} className="p-2 text-blue-600 hover:text-blue-800" title="Edit Group">
                      <FaEdit />
                    </button>
                    <button onClick={() => setGroupToDelete(group)} className="p-2 text-red-600 hover:text-red-800" title="Delete Group">
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
            Showing{' '}
            <span className="font-medium">
              {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>
            {' - '}
            <span className="font-medium">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>
            {' of '}
            <span className="font-medium">{totalCount}</span>
            {' entries'}
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
            {(!isDeleting && groups.length > 0 && status === 'idle') && (
              <>
              <div className="h-6 w-px bg-gray-300"></div>
                <PDFDownloadLink
                  document={
                    <GroupPDFReport
                      groups={groups}
                      title="Groups Report"
                      filters={{
                        searchTerm,
                        capstoneFilter,
                        adviserFilter,
                        gradeFilter,
                      }}
                    />
                  }
                  fileName={`GroupsReport-${capstoneFilter}_${adviserFilter}_${gradeFilter}_${new Date().toISOString().slice(0,10)}.pdf`}
                >
                  {({ loading }) => (
                    <span
                      className="text-blue-600 cursor-pointer hover:underline text-sm font-medium ml-2"
                      title="Download Report"
                      style={{ minWidth: 90, display: 'inline-block' }}
                    >
                      {loading ? 'Generating...' : 'Download Report'}
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
    </>
  );
};

export default GroupsTable; 