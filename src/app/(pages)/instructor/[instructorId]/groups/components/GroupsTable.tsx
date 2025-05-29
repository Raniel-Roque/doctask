import React, { useState } from 'react';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash, FaChevronDown, FaPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa"; // Import icons and pagination icons
import { Id } from '../../../../../../../convex/_generated/dataModel';

// Define proper types based on our schema
interface User {
  _id: Id<"users">;
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: number;
  subrole?: number;
}

interface Group {
  _id: Id<"groupsTable">;
  capstone_title?: string;
  grade?: number;
  project_manager_id: Id<"users">;
  member_ids: Id<"users">[];
  adviser_id?: Id<"users">;
  // Additional fields for display
  projectManager?: User;
  members?: User[];
  adviser?: User;
  name?: string;
}

interface GroupsTableProps {
  groups: Group[];
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onAdd: () => void;
}

type SortField = "name" | "projectManager" | "capstoneTitle";
type SortDirection = "asc" | "desc";

// Capstone Title filter options
const CAPSTONE_FILTERS = {
  ALL: "All Groups",
  WITH_TITLE: "With Capstone Title",
  WITHOUT_TITLE: "Without Capstone Title"
} as const;

const getGradeDisplay = (grade?: number): { text: string; color: string } => {
  if (grade === undefined || grade === null) return { text: 'No Grade', color: 'bg-gray-100 text-gray-800' };
  switch (grade) {
    case 1:
      return { text: 'Failed', color: 'bg-red-100 text-red-800' };
    case 2:
      return { text: 'Revision', color: 'bg-yellow-100 text-yellow-800' };
    case 3:
      return { text: 'Passed', color: 'bg-green-100 text-green-800' };
    default:
      return { text: 'No Grade', color: 'bg-gray-100 text-gray-800' };
  }
};

const GroupsTable: React.FC<GroupsTableProps> = ({ groups, onEdit, onDelete, onAdd }) => {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // State for search term
  const [sortField, setSortField] = useState<SortField>("name"); // State for sorting
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc"); // State for sorting direction
  const [adviserFilter, setAdviserFilter] = useState<string>(""); // State for adviser filter
  const [showAdviserDropdown, setShowAdviserDropdown] = useState(false);
  const [adviserSearch, setAdviserSearch] = useState("");
  const [capstoneFilter, setCapstoneFilter] = useState<typeof CAPSTONE_FILTERS[keyof typeof CAPSTONE_FILTERS]>(CAPSTONE_FILTERS.ALL);
  const [showCapstoneDropdown, setShowCapstoneDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const toggleExpand = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  const getFullName = (user: User) => {
    return `${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`;
  };

  const getPaginationInfo = (groups: Group[]) => {
    const entriesPerPage = 5;
    const totalEntries = groups.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    const startEntry = (currentPage - 1) * entriesPerPage + 1;
    const endEntry = Math.min(startEntry + entriesPerPage - 1, totalEntries);
    const paginatedGroups = groups.slice(startEntry - 1, endEntry);

    return {
      totalEntries,
      totalPages,
      startEntry,
      endEntry,
      paginatedGroups,
    };
  };

  // Get unique advisers for filter dropdown
  const uniqueAdvisers = Array.from(new Set(
    groups
      .filter(group => group.adviser)
      .map(group => getFullName(group.adviser!))
  )).sort();

  // Update the filtering logic
  const filteredAndSortedGroups = groups.filter(group => {
    const groupName = group.name || '';
    const adviserName = group.adviser ? getFullName(group.adviser) : '';
    
    return (
      (groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       adviserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (group.capstone_title?.toLowerCase().includes(searchTerm.toLowerCase()) || false)) &&
      (adviserFilter === "" || 
       (adviserFilter === "No Adviser" && !group.adviser) ||
       (group.adviser && getFullName(group.adviser) === adviserFilter)) &&
      (capstoneFilter === CAPSTONE_FILTERS.ALL ||
       (capstoneFilter === CAPSTONE_FILTERS.WITH_TITLE && group.capstone_title) ||
       (capstoneFilter === CAPSTONE_FILTERS.WITHOUT_TITLE && !group.capstone_title))
    );
  }).sort((a, b) => {
    let comparison = 0;
    if (sortField === "name") {
      const aName = a.name || '';
      const bName = b.name || '';
      comparison = aName.localeCompare(bName);
    } else if (sortField === "projectManager" && a.projectManager && b.projectManager) {
      comparison = getFullName(a.projectManager).localeCompare(getFullName(b.projectManager));
    } else if (sortField === "capstoneTitle") {
      const aTitle = a.capstone_title || '';
      const bTitle = b.capstone_title || '';
      comparison = aTitle.localeCompare(bTitle);
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

   const getSortIcon = (field: SortField) => {
       if (field !== sortField) return <FaSort />;
       return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
   };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prevDirection => prevDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const { totalEntries, totalPages, startEntry, endEntry, paginatedGroups } = getPaginationInfo(filteredAndSortedGroups);

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
            placeholder="Search groups..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Capstone Title Filter */}
        <div className="relative">
          <div 
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10 cursor-pointer min-w-[200px]"
            onClick={() => {
              setShowCapstoneDropdown(!showCapstoneDropdown);
              setShowAdviserDropdown(false);
            }}
          >
            {capstoneFilter}
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
                    onClick={() => {
                      setCapstoneFilter(filter);
                      setShowCapstoneDropdown(false);
                    }}
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
                  onClick={() => {
                    setAdviserFilter("");
                    setShowAdviserDropdown(false);
                  }}
                >
                  All Advisers
                </div>
                <div
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setAdviserFilter("No Adviser");
                    setShowAdviserDropdown(false);
                  }}
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
                      onClick={() => {
                        setAdviserFilter(adviser);
                        setShowAdviserDropdown(false);
                      }}
                    >
                      {adviser}
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
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-[#B54A4A] text-white">
          <tr>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer" onClick={() => handleSort("name")}>
              <div className="flex items-center justify-center">
                Group Name
                <span className="ml-1">{getSortIcon("name")}</span>
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer" onClick={() => handleSort("capstoneTitle")}>
              <div className="flex items-center justify-center">
                Capstone Title
                <span className="ml-1">{getSortIcon("capstoneTitle")}</span>
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer" onClick={() => handleSort("projectManager")}>
              <div className="flex items-center justify-center">
                Project Manager
                <span className="ml-1">{getSortIcon("projectManager")}</span>
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Members</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                Adviser
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                Grade
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedGroups.map((group) => (
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
                          <div className="h-4 w-4">
                            <FaChevronDown />
                          </div>
                        ) : (
                          <div className="h-4 w-4">
                            <FaChevronLeft />
                          </div>
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
                      {group.members.map((member) => (
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
                  <button onClick={() => onDelete(group)} className="p-2 text-red-600 hover:text-red-800" title="Delete Group">
                    <FaTrash />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
            onClick={() => setCurrentPage(currentPage - 1)}
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
            onClick={() => setCurrentPage(currentPage + 1)}
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