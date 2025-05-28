import React, { useState } from 'react';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash, FaChevronDown, FaPlus } from "react-icons/fa"; // Import icons

interface GroupsTableProps {
  groups: any[]; // Placeholder type
  onEdit: (group: any) => void; // Placeholder type
  onDelete: (group: any) => void; // Placeholder type
  onAdd: () => void;
}

type SortField = "name" | "projectManager" | "adviser" | "grade" | "status"; // Define sortable fields
type SortDirection = "asc" | "desc";

// Capstone Title filter options
const CAPSTONE_FILTERS = {
  ALL: "All Groups",
  WITH_TITLE: "With Capstone Title",
  WITHOUT_TITLE: "Without Capstone Title"
} as const;

// Static list of advisers (replace with fetched data later)
const staticAdvisers = ["Dr. Smith", "Prof. Johnson", "Dr. Williams", "Prof. Brown"];

// Placeholder for filter options if needed later
// const GROUP_STATUS_FILTERS = { ALL: "All Statuses", ACTIVE: "Active", INACTIVE: "Inactive" } as const;

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

  const toggleExpand = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  const getLastName = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : name;
  };

  // Update the filtering logic
  const filteredAndSortedGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.projectManager?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (group.adviser?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (adviserFilter === "" || group.adviser === adviserFilter) &&
    (capstoneFilter === CAPSTONE_FILTERS.ALL ||
     (capstoneFilter === CAPSTONE_FILTERS.WITH_TITLE && group.capstoneTitle) ||
     (capstoneFilter === CAPSTONE_FILTERS.WITHOUT_TITLE && !group.capstoneTitle))
  ).sort((a, b) => {
    // Add sorting logic here based on sortField and sortDirection
    let comparison = 0;
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === "projectManager" && a.projectManager && b.projectManager) {
       comparison = a.projectManager.localeCompare(b.projectManager);
    } else if (sortField === "adviser" && a.adviser && b.adviser) {
       comparison = a.adviser.localeCompare(b.adviser);
    } else if (sortField === "grade" && a.grade && b.grade) {
       comparison = a.grade.localeCompare(b.grade);
    } else if (sortField === "status" && a.status && b.status) {
       comparison = a.status.localeCompare(b.status);
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
            onClick={() => setShowCapstoneDropdown(!showCapstoneDropdown)}
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
          {/* Adviser Sort/Filter Dropdown */}
          <div 
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10 cursor-pointer min-w-[200px]"
            onClick={() => setShowAdviserDropdown(!showAdviserDropdown)}
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
                {staticAdvisers
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
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Capstone Title</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Project Manager</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Members</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Adviser</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Grade</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAndSortedGroups.map((group) => (
            <tr key={group._id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.capstoneTitle || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.projectManager}</td>
              <td className="px-6 py-4 text-sm text-gray-500 align-top">
                {expandedGroupId === group._id ? (
                  // Expanded view
                  <div onClick={() => toggleExpand(group._id)} className="cursor-pointer">
                    <ul>
                      {group.members.map((member: string, index: number) => (
                        <li key={index}>{member}</li>
                      ))}
                    </ul>
                    {group.members.length > 3 && ( // Show collapse if more than 3 members
                        <button onClick={() => toggleExpand(group._id)} className="mt-2 text-blue-600 hover:underline text-xs">Show Less</button>
                    )}
                  </div>
                ) : (
                  // Collapsed view
                  <div onClick={() => toggleExpand(group._id)} className="cursor-pointer">
                    {group.members.length > 0 ? (
                      <>
                        {group.members
                          .map((member: string) => getLastName(member)) // Get last names
                          .sort() // Sort alphabetically
                          .slice(0, 3) // Take first 3
                          .join(', ')}
                        {group.members.length > 3 && '...'} {/* Add ellipsis if more than 3 */}
                         {group.members.length > 3 && ( // Show expand if more than 3 members
                            <button onClick={() => toggleExpand(group._id)} className="ml-2 text-blue-600 hover:underline text-xs">Show More</button>
                         )}
                      </>
                    ) : (
                      "No members"
                    )}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.adviser} {/* Static adviser */}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.grade}</td>
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
    </>
  );
};

export default GroupsTable; 