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
  FaMinus,
  FaPlus,
  FaFilter,
} from "react-icons/fa"; // Import icons and pagination icons
import { User, Group } from "./types";
import DeleteGroupConfirmation from "./DeleteGroupConfirmation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import GroupPDFReport from "./GroupPDFReport";

// Capstone Title filter options
const CAPSTONE_FILTERS = {
  ALL: "All Capstone Titles",
  WITH_TITLE: "With Capstone Title",
  WITHOUT_TITLE: "Without Capstone Title",
} as const;

export const GRADE_FILTERS = {
  NO_GRADE: "NO GRADE",
  APPROVED: "APPROVED",
  APPROVED_WITH_REVISIONS: "APPROVED WITH REVISIONS",
  DISAPPROVED: "DISAPPROVED",
  ACCEPTED_WITH_REVISIONS: "ACCEPTED WITH REVISIONS",
  REORAL_DEFENSE: "REORAL DEFENSE",
  NOT_ACCEPTED: "NOT ACCEPTED",
} as const;

const getGradeDisplay = (grade?: number): { text: string; color: string } => {
  if (grade === undefined || grade === null)
    return { text: "No grade", color: "bg-gray-100 text-gray-800" };
  switch (grade) {
    case 0:
      return { text: "No grade", color: "bg-gray-100 text-gray-800" };
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
      return { text: "No grade", color: "bg-gray-100 text-gray-800" };
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
  status: "idle" | "loading" | "error";
  hasResults: boolean;
  onAdviserFilterChange: (filters: string[]) => void;
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
  onAdviserFilterChange,
  onGradeFilterChange,
  isDeleting = false,
  capstoneFilter,
  setCapstoneFilter,
  capstoneSortDirection,
  onCapstoneSortApply,
}) => {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [adviserFilters, setAdviserFilters] = useState<string[]>([]);
  const [tempAdviserFilters, setTempAdviserFilters] = useState<string[]>([]);
  const [showAdviserDropdown, setShowAdviserDropdown] = useState(false);
  const [adviserSearch, setAdviserSearch] = useState("");
  const [gradeFilters, setGradeFilters] = useState<
    (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][]
  >([]);
  const [tempGradeFilters, setTempGradeFilters] = useState<
    (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][]
  >([]);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const adviserButtonRef = useRef<HTMLButtonElement>(null);
  const adviserDropdownRef = useRef<HTMLDivElement>(null);
  const adviserThRef = useRef<HTMLTableCellElement>(null);
  const gradeThRef = useRef<HTMLTableCellElement>(null);
  const gradeButtonRef = useRef<HTMLButtonElement>(null);
  const capstoneThRef = useRef<HTMLTableCellElement>(null);
  const capstoneButtonRef = useRef<HTMLButtonElement>(null);
  const [showCapstoneDropdown, setShowCapstoneDropdown] = useState(false);
  const capstoneDropdownRef = useRef<HTMLDivElement>(null);
  const [tempCapstoneFilter, setTempCapstoneFilter] = useState(capstoneFilter);
  const [tempCapstoneSortDirection, setTempCapstoneSortDirection] = useState(
    capstoneSortDirection,
  );

  // Add state for expanded capstone titles
  const [expandedCapstoneTitles, setExpandedCapstoneTitles] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    if (showAdviserDropdown) {
      setTempAdviserFilters(adviserFilters);
    }
  }, [showAdviserDropdown, adviserFilters]);

  useEffect(() => {
    if (showGradeDropdown) {
      setTempGradeFilters(gradeFilters);
    }
  }, [showGradeDropdown, gradeFilters]);

  useEffect(() => {
    if (!showAdviserDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        adviserDropdownRef.current &&
        !adviserDropdownRef.current.contains(event.target as Node) &&
        adviserButtonRef.current &&
        !adviserButtonRef.current.contains(event.target as Node)
      ) {
        setShowAdviserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAdviserDropdown]);

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
      setTempCapstoneSortDirection(capstoneSortDirection);
    }
  }, [showCapstoneDropdown, capstoneFilter, capstoneSortDirection]);

  const toggleExpand = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  // Update getFullName to getUserDisplay to include email as subtext
  const getUserDisplay = (user: User) => (
    <span>
      {user.last_name}, {user.first_name}{user.middle_name ? ` ${user.middle_name}` : ""}
      <span className="ml-2 text-xs text-gray-500">{user.email}</span>
    </span>
  );

  // Function to display user name only (without email) for pills
  const getUserNameOnly = (user: User) => (
    <span>
      {user.last_name}, {user.first_name}{user.middle_name ? ` ${user.middle_name}` : ""}
    </span>
  );

  // Replace uniqueAdvisers with a unique list of adviser objects (by _id) for filter dropdown
  const uniqueAdviserObjs = Array.from(
    advisers.reduce((map, adviser) => map.set(adviser._id, adviser), new Map()).values()
  ).sort((a, b) => {
    const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
    const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
    return aName.localeCompare(bName);
  });

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
  const handleAdviserFilter = (filter: string) => {
    let newFilters;
    if (tempAdviserFilters.includes(filter)) {
      newFilters = tempAdviserFilters.filter((f) => f !== filter);
    } else {
      newFilters = [...tempAdviserFilters, filter];
    }
    setTempAdviserFilters(newFilters);
  };

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

  const handleSaveAdviserFilters = () => {
    setAdviserFilters(tempAdviserFilters);
    onAdviserFilterChange(tempAdviserFilters);
    setShowAdviserDropdown(false);
    onPageChange(1);
  };

  const handleResetAdviserFilters = () => {
    setTempAdviserFilters([]);
  };

  const handleSaveGradeFilters = () => {
    setGradeFilters(tempGradeFilters);
    onGradeFilterChange(tempGradeFilters);
    setShowGradeDropdown(false);
    onPageChange(1);
  };

  const handleResetGradeFilters = () => {
    setTempGradeFilters(gradeFilters);
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
          className="px-4 py-2 bg-[#B54A4A] text-white rounded-lg hover:bg-[#9a3d3d] flex items-center gap-2"
          onClick={onAdd}
        >
          <FaPlus /> Add Group
        </button>
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
                className="relative px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCapstoneDropdown(!showCapstoneDropdown);
                  setShowAdviserDropdown(false);
                  setShowGradeDropdown(false);
                }}
              >
                <div className="flex items-center justify-center">
                  <span className="font-medium uppercase">CAPSTONE TITLE</span>
                  <span className="ml-2 flex items-center">
                    <button
                      type="button"
                      className="p-1 bg-transparent border-none outline-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCapstoneDropdown(!showCapstoneDropdown);
                        setShowAdviserDropdown(false);
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
                    <span style={{ marginLeft: 0, paddingLeft: 0 }}>
                      {getCapstoneSortIcon()}
                    </span>
                  </span>
                </div>
                {showCapstoneDropdown && (
                  <div
                    ref={capstoneDropdownRef}
                    className="fixed z-50 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    style={{ 
                      minWidth: 220,
                      left: capstoneButtonRef.current?.getBoundingClientRect().left || 0,
                      top: (capstoneButtonRef.current?.getBoundingClientRect().bottom || 0) + 8
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-2 border-b flex items-center justify-between">
                      <span className="font-semibold text-xs">Sort</span>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (tempCapstoneSortDirection === "asc") {
                            setTempCapstoneSortDirection("desc");
                          } else if (tempCapstoneSortDirection === "desc") {
                            setTempCapstoneSortDirection("none");
                          } else {
                            setTempCapstoneSortDirection("asc");
                          }
                        }}
                      >
                        {tempCapstoneSortDirection === "asc" ? (
                          <FaSortUp className="w-4 h-4 text-blue-500" />
                        ) : tempCapstoneSortDirection === "desc" ? (
                          <FaSortDown className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FaSort className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
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
                          onCapstoneSortApply(tempCapstoneSortDirection);
                          setShowCapstoneDropdown(false);
                        }}
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
                className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                onClick={() => onSort("projectManager")}
              >
                <div className="flex items-center justify-center">
                  Project Manager
                  <span className="ml-1">{getSortIcon("projectManager")}</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
              >
                Members
              </th>
              <th
                ref={adviserThRef}
                scope="col"
                className="relative px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">ADVISER</span>
                  <button
                    type="button"
                    className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdviserDropdown(!showAdviserDropdown);
                    }}
                    title="Filter advisers"
                    ref={adviserButtonRef}
                    style={{ boxShadow: "none" }}
                  >
                    <FaFilter
                      className={
                        `w-4 h-4 transition-colors ` +
                        (showAdviserDropdown || adviserFilters.length > 0
                          ? "text-blue-500"
                          : "text-white")
                      }
                    />
                  </button>
                </div>
                {showAdviserDropdown && (
                  <div
                    ref={adviserDropdownRef}
                    className="fixed z-50 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    style={{ 
                      minWidth: 220,
                      left: adviserButtonRef.current?.getBoundingClientRect().left || 0,
                      top: (adviserButtonRef.current?.getBoundingClientRect().bottom || 0) + 8
                    }}
                  >
                    <div className="p-3 border-b">
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
                    <div
                      className="max-h-52 overflow-y-auto px-3 py-2 flex flex-col gap-1"
                      style={{ maxHeight: 220 }}
                    >
                      <label className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left">
                        <input
                          type="checkbox"
                          checked={tempAdviserFilters.includes("No Adviser")}
                          onChange={() => handleAdviserFilter("No Adviser")}
                          className="accent-blue-600"
                        />
                        <span className="text-left">No Adviser</span>
                      </label>
                      {uniqueAdviserObjs
                        .filter((adviser) =>
                          `${adviser.first_name} ${adviser.last_name}`
                            .toLowerCase()
                            .includes(adviserSearch.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((adviser) => (
                          <label
                            key={adviser._id}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                          >
                            <input
                              type="checkbox"
                              checked={tempAdviserFilters.includes(`${adviser.last_name}, ${adviser.first_name}${adviser.middle_name ? ` ${adviser.middle_name}` : ""}`)}
                              onChange={() => handleAdviserFilter(`${adviser.last_name}, ${adviser.first_name}${adviser.middle_name ? ` ${adviser.middle_name}` : ""}`)}
                              className="accent-blue-600"
                            />
                            <span className="text-left">
                              {adviser.last_name}, {adviser.first_name}{adviser.middle_name ? ` ${adviser.middle_name}` : ""}
                              <span className="ml-2 text-xs text-gray-500">{adviser.email}</span>
                            </span>
                          </label>
                        ))}
                    </div>
                    <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={handleSaveAdviserFilters}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleResetAdviserFilters}
                        className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm font-medium"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </th>
              <th
                ref={gradeThRef}
                scope="col"
                className="relative px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">GRADE</span>
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
                      left: gradeButtonRef.current?.getBoundingClientRect().left || 0,
                      top: (gradeButtonRef.current?.getBoundingClientRect().bottom || 0) + 8
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {group.projectManager ? getUserDisplay(group.projectManager) : "-"}
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
                          expandedGroupId === group._id ? (
                            // Show full names with emails when expanded
                            <div className="text-sm">
                              {group.members
                                ?.slice()
                                .sort((a, b) => {
                                  const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
                                  const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
                                  return aName.localeCompare(bName);
                                })
                                .map((member) => (
                                  <div key={member._id} className="text-gray-600">
                                    {getUserDisplay(member)}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            // Show truncated names when collapsed
                            <div className="text-sm">
                              {group.members
                                ?.slice()
                                .sort((a, b) => {
                                  const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
                                  const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
                                  return aName.localeCompare(bName);
                                })
                                .slice(0, 3) // Show only first 3 members
                                .map((member) => (
                                  <span key={member._id} className="text-gray-600 mr-2">
                                    {getUserNameOnly(member)}
                                  </span>
                                ))}
                              {group.members && group.members.length > 3 && (
                                <span className="text-gray-500">
                                  +{group.members.length - 3} more
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {group.adviser ? getUserDisplay(group.adviser) : "-"}
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
            {!isDeleting && groups.length > 0 && status === "idle" && (
              <>
                <div className="h-6 w-px bg-gray-300"></div>
                {exportReady ? (
                  <PDFDownloadLink
                    key={`pdf-groups-${searchTerm}-${adviserFilters.join(",")}-${gradeFilters.join(",")}-${groups.length}-${totalCount}-${exportIdsChecksum}`}
                    document={
                      <GroupPDFReport
                        groups={groups}
                        title="Groups Report"
                        filters={{
                          searchTerm,
                          adviserFilters,
                          gradeFilters,
                        }}
                      />
                    }
                    fileName={`GroupsReport-${adviserFilters.join(",")}_${gradeFilters.join(",")}_${new Date()
                      .toISOString()
                      .slice(0, 10)}.pdf`}
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
                ) : (
                  <span
                    className="text-gray-400 text-sm font-medium ml-2 cursor-not-allowed"
                    title="Preparing report..."
                    style={{ minWidth: 120, display: "inline-block" }}
                  >
                    Preparing report...
                  </span>
                )}
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
    </>
  );
};

export default GroupsTable;
