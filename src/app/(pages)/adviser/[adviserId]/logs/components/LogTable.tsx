import { format } from "date-fns";
import {
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFilter,
} from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";

// =========================================
// Types
// =========================================
interface Log {
  _id: Id<"LogsTable">;
  user_id: Id<"users">;
  user_role: number;
  user?: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
  } | null;
  affected_entity_type: string;
  affected_entity_id: Id<"users"> | Id<"groupsTable">;
  affectedEntity?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    email?: string;
    capstone_title?: string;
  } | null;
  action: string;
  details: string;
  _creationTime: number;
}

type SortField = "_creationTime" | "affectedEntity" | "action";
type SortDirection = "asc" | "desc";

// =========================================
// Constants
// =========================================
const LOG_ACTIONS = {
  ALL: "All actions",
  ACCEPT_GROUP: "Accept Group Request",
  REJECT_GROUP: "Reject Group Request",
} as const;

const ACTION_COLORS = {
  [LOG_ACTIONS.ACCEPT_GROUP]: {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  [LOG_ACTIONS.REJECT_GROUP]: {
    bg: "bg-red-100",
    text: "text-red-800",
  },
  // Default colors for any new actions
  default: {
    bg: "bg-gray-100",
    text: "text-gray-800",
  },
} as const;

// Add entity type constants
const ENTITY_TYPES = {
  ALL: "All Entities",
  GROUP: "Group",
} as const;

// =========================================
// Component
// =========================================
interface LogTableProps {
  adviserId: string;
}

export const LogTable = ({ adviserId }: LogTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("_creationTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    // Get saved page size from localStorage or default to 5
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adviserLogsPageSize");
      return saved ? parseInt(saved, 10) : 5;
    }
    return 5;
  });
  const [tempActionFilters, setTempActionFilters] = useState<
    (typeof LOG_ACTIONS)[keyof typeof LOG_ACTIONS][]
  >([]);
  const [appliedActionFilters, setAppliedActionFilters] = useState<
    (typeof LOG_ACTIONS)[keyof typeof LOG_ACTIONS][]
  >([]);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const actionDropdownRef = useRef<HTMLDivElement>(null);

  const [entityTypeFilter, setEntityTypeFilter] = useState<
    (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES]
  >(ENTITY_TYPES.ALL);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const entityDropdownRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Update the state to track column-level expansion
  type ExpandedColumns = {
    affectedEntity: boolean;
    details: boolean;
  };

  const [expandedColumns, setExpandedColumns] = useState<ExpandedColumns>({
    affectedEntity: false,
    details: false,
  });

  // Add refs for button elements
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const entityButtonRef = useRef<HTMLButtonElement>(null);

  // Add after state declarations
  const [tempEntityTypeFilter, setTempEntityTypeFilter] =
    useState(entityTypeFilter);

  // Sync temporary state with applied state when dropdowns open
  useEffect(() => {
    if (showActionDropdown) {
      setTempActionFilters(appliedActionFilters);
    }
  }, [showActionDropdown, appliedActionFilters]);

  // Sync temp state when dropdown opens
  useEffect(() => {
    if (showEntityDropdown) setTempEntityTypeFilter(entityTypeFilter);
  }, [showEntityDropdown, entityTypeFilter]);

  // Click outside handlers
  useEffect(() => {
    if (!showActionDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        actionDropdownRef.current &&
        !actionDropdownRef.current.contains(event.target as Node) &&
        actionButtonRef.current &&
        !actionButtonRef.current.contains(event.target as Node)
      ) {
        setShowActionDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionDropdown]);

  useEffect(() => {
    if (!showEntityDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        entityDropdownRef.current &&
        !entityDropdownRef.current.contains(event.target as Node) &&
        entityButtonRef.current &&
        !entityButtonRef.current.contains(event.target as Node)
      ) {
        setShowEntityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEntityDropdown]);

  // Fetch logs with backend multi-select filtering for action and entity type
  const logsData = useQuery(api.fetch.getLogsWithDetails, {
    userRole: 1, // Adviser role
    userId: adviserId as Id<"users">,
    pageSize,
    pageNumber: currentPage,
    action: appliedActionFilters.length > 0 ? appliedActionFilters : undefined,
    entityType:
      entityTypeFilter !== ENTITY_TYPES.ALL
        ? [entityTypeFilter.toLowerCase()]
        : undefined,
  });

  const logs: Log[] =
    logsData && "logs" in logsData
      ? logsData.logs
      : Array.isArray(logsData)
        ? logsData
        : [];

  const getAffectedEntityName = (log: Log) => {
    if (log.affected_entity_type === "user") {
      if (log.affectedEntity?.first_name && log.affectedEntity?.last_name) {
        const shortId = log.affected_entity_id.toString().slice(-4);
        return {
          display: `${log.affectedEntity.first_name} ${log.affectedEntity.middle_name ? log.affectedEntity.middle_name + " " : ""}${log.affectedEntity.last_name}`,
          id: shortId,
        };
      }
      return { display: "-", id: null };
    }
    // For groups, show the capstone title and include the ID
    if (log.affectedEntity?.capstone_title) {
      const shortId = log.affected_entity_id.toString().slice(-4);
      return {
        display: `${log.affectedEntity.capstone_title}`,
        id: shortId,
      };
    }
    return { display: "-", id: null };
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <FaSort />;
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleActionFilter = (
    filter: (typeof LOG_ACTIONS)[keyof typeof LOG_ACTIONS],
  ) => {
    let newFilters;
    if (tempActionFilters.includes(filter)) {
      newFilters = tempActionFilters.filter((f) => f !== filter);
    } else {
      newFilters = [...tempActionFilters, filter];
    }
    setTempActionFilters(newFilters);
  };

  const handleSaveActionFilters = () => {
    setAppliedActionFilters(tempActionFilters);
    setShowActionDropdown(false);
    setCurrentPage(1);
  };

  const handleResetActionFilters = () => {
    setTempActionFilters([]);
    setAppliedActionFilters([]);
    setCurrentPage(1);
  };

  const getActionColors = (action: string) => {
    // Check if the action exists in our predefined colors
    const actionKey = Object.values(LOG_ACTIONS).find(
      (logAction) => logAction === action,
    ) as keyof typeof ACTION_COLORS | undefined;

    if (actionKey && ACTION_COLORS[actionKey]) {
      const { bg, text } = ACTION_COLORS[actionKey];
      return `${bg} ${text}`;
    }

    // Use default colors for any action not in our predefined list
    const { bg, text } = ACTION_COLORS.default;
    return `${bg} ${text}`;
  };

  // Get available actions for advisers
  const getAvailableActions = () => {
    return [LOG_ACTIONS.ACCEPT_GROUP, LOG_ACTIONS.REJECT_GROUP];
  };

  // =========================================
  // Collapsible Text Component
  // =========================================
  const CollapsibleText = ({
    text,
    maxLength = 10,
    column,
    id,
  }: {
    text: string | null;
    maxLength?: number;
    column: keyof ExpandedColumns;
    id?: string | null;
  }) => {
    if (!text) return <span>-</span>;
    if (text.length <= maxLength && !id) return <span>{text}</span>;

    const isExpanded = expandedColumns[column];

    return (
      <button
        onClick={() =>
          setExpandedColumns((prev) => ({
            ...prev,
            [column]: !prev[column],
          }))
        }
        className="w-full text-left"
      >
        {isExpanded ? (
          <span>
            {text}
            {id && <span className="text-gray-500 ml-1">(ID: {id})</span>}
          </span>
        ) : (
          <span>
            {text.length > maxLength ? `${text.slice(0, maxLength)}...` : text}
          </span>
        )}
      </button>
    );
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    localStorage.setItem("adviserLogsPageSize", size.toString());
  };

  function getLocalDateString() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split("T")[0];
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <FaSearch />
          </div>
          <input
            type="text"
            placeholder="Search logs..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <div
            className="relative flex flex-col items-start"
            style={{ minWidth: "10rem" }}
          >
            {startDate && (
              <button
                type="button"
                className="absolute -top-1 right-0 text-blue-600 hover:text-blue-800 text-xs z-20 bg-white px-1"
                onClick={() => setStartDate("")}
                tabIndex={-1}
                style={{ transform: "translateY(-100%)" }}
              >
                Clear
              </button>
            )}
            <input
              type="date"
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              max={getLocalDateString()}
            />
          </div>
          <span className="self-center text-gray-500">to</span>
          <div
            className="relative flex flex-col items-start"
            style={{ minWidth: "10rem" }}
          >
            {endDate && (
              <button
                type="button"
                className="absolute -top-2 right-0 text-blue-600 hover:text-blue-800 text-xs z-20 bg-white px-1"
                onClick={() => setEndDate("")}
                tabIndex={-1}
                style={{ transform: "translateY(-100%)" }}
              >
                Clear
              </button>
            )}
            <input
              type="date"
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              min={startDate || undefined}
              max={getLocalDateString()}
            />
          </div>
        </div>
      </div>
      <div className="relative">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-[#B54A4A]">
              <th
                className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer w-32 whitespace-nowrap"
                onClick={() => handleSort("_creationTime")}
              >
                <div className="flex items-center justify-center text-xs">
                  Date & Time
                  <span className="ml-1">{getSortIcon("_creationTime")}</span>
                </div>
              </th>
              <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider w-24">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">ACTION</span>
                  <button
                    type="button"
                    className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActionDropdown(!showActionDropdown);
                      setShowEntityDropdown(false);
                    }}
                    title="Filter actions"
                    ref={actionButtonRef}
                    style={{ boxShadow: "none" }}
                  >
                    <FaFilter
                      className={
                        `w-4 h-4 transition-colors ` +
                        (showActionDropdown || appliedActionFilters.length > 0
                          ? "text-blue-500"
                          : "text-white")
                      }
                    />
                  </button>
                </div>
                {showActionDropdown && (
                  <div
                    ref={actionDropdownRef}
                    className="absolute left-0 top-full z-20 mt-2 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="max-h-48 overflow-y-auto px-3 py-2 flex flex-col gap-1">
                      {getAvailableActions().map((action) => (
                        <label
                          key={action}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            checked={tempActionFilters.includes(action)}
                            onChange={() => handleActionFilter(action)}
                            className="accent-blue-600"
                          />
                          <span
                            className="text-left"
                            style={{ textTransform: "none" }}
                          >
                            {action}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={handleSaveActionFilters}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleResetActionFilters}
                        className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm font-medium"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </th>
              <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider w-40">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">ENTITY</span>
                  <button
                    type="button"
                    className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEntityDropdown(!showEntityDropdown);
                      setShowActionDropdown(false);
                    }}
                    title="Filter entity type"
                    ref={entityButtonRef}
                    style={{ boxShadow: "none" }}
                  >
                    <FaFilter
                      className={
                        `w-4 h-4 transition-colors ` +
                        (showEntityDropdown ||
                        entityTypeFilter !== ENTITY_TYPES.ALL
                          ? "text-blue-500"
                          : "text-white")
                      }
                    />
                  </button>
                </div>
                {showEntityDropdown && (
                  <div
                    ref={entityDropdownRef}
                    className="absolute left-0 top-full z-20 mt-2 min-w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="max-h-48 overflow-y-auto px-3 py-2 flex flex-col gap-1">
                      {Object.values(ENTITY_TYPES).map((type) => (
                        <label
                          key={type}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                        >
                          <input
                            type="radio"
                            name="entityTypeFilter"
                            checked={tempEntityTypeFilter === type}
                            onChange={() => setTempEntityTypeFilter(type)}
                            className="accent-blue-600"
                          />
                          <span className="text-left">
                            {type === ENTITY_TYPES.ALL
                              ? "All Entities"
                              : "Groups"}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => {
                          setShowEntityDropdown(false);
                          setEntityTypeFilter(tempEntityTypeFilter);
                          setCurrentPage(1);
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </th>
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider flex-1">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {!logsData ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No logs available
                </td>
              </tr>
            ) : (
              logs.map((log: Log, index: number) => {
                const affectedEntity = getAffectedEntityName(log);
                return (
                  <tr
                    key={log._id}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-200"}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-left w-32">
                      {format(
                        new Date(log._creationTime),
                        "MMM dd, yyyy hh:mm a",
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center w-24">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColors(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left w-40">
                      <CollapsibleText
                        text={affectedEntity.display}
                        maxLength={20}
                        column="affectedEntity"
                        id={affectedEntity.id}
                      />
                    </td>
                    <td className="px-6 py-4 text-left cursor-pointer whitespace-pre-line flex-1">
                      <CollapsibleText
                        text={log.details}
                        maxLength={20}
                        column="details"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="min-w-full flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {logs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </span>
              {" - "}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, logs.length)}
              </span>
              {" of "}
              <span className="font-medium">{logs.length}</span>
              {" entries"}
            </p>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
              onClick={() => setCurrentPage(currentPage - 1)}
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
              Page {currentPage} of{" "}
              {Math.max(Math.ceil(logs.length / pageSize), 1)}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === Math.ceil(logs.length / pageSize)}
              className={`p-2 rounded-md ${
                currentPage === Math.ceil(logs.length / pageSize)
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
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
