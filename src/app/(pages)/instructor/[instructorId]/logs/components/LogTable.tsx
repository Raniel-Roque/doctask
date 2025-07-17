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
    projectManager?: {
      last_name: string;
    };
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
  CREATE: "Create",
  EDIT: "Edit",
  DELETE: "Delete",
  RESET_PASSWORD: "Reset password",
  LOCK_ACCOUNT: "Lock account",
  UNLOCK_ACCOUNT: "Unlock account",
  ACCEPT_GROUP: "Accept Group Request",
  REJECT_GROUP: "Reject Group Request",
  BACKUP: "Backup",
  RESTORE: "Restore",
} as const;

const ACTION_COLORS = {
  [LOG_ACTIONS.CREATE]: {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  [LOG_ACTIONS.EDIT]: {
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
  [LOG_ACTIONS.DELETE]: {
    bg: "bg-red-100",
    text: "text-red-800",
  },
  [LOG_ACTIONS.RESET_PASSWORD]: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  [LOG_ACTIONS.LOCK_ACCOUNT]: {
    bg: "bg-red-100",
    text: "text-red-800",
  },
  [LOG_ACTIONS.UNLOCK_ACCOUNT]: {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  [LOG_ACTIONS.ACCEPT_GROUP]: {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  [LOG_ACTIONS.REJECT_GROUP]: {
    bg: "bg-red-100",
    text: "text-red-800",
  },
  [LOG_ACTIONS.BACKUP]: {
    bg: "bg-purple-100",
    text: "text-purple-800",
  },
  [LOG_ACTIONS.RESTORE]: {
    bg: "bg-orange-100",
    text: "text-orange-800",
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
  USER: "User",
  GROUP: "Group",
  DATABASE: "Database",
} as const;

// =========================================
// Component
// =========================================
interface LogTableProps {
  userRole?: number; // 0 = instructor, 1 = adviser
}

export const LogTable = ({ userRole = 0 }: LogTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("_creationTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    // Get saved page size from localStorage or default to 5
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("logsPageSize");
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

  const [appliedEntityTypeFilters, setAppliedEntityTypeFilters] = useState<
    (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES][]
  >([]);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const entityDropdownRef = useRef<HTMLDivElement>(null);
  const [tempEntityTypeFilters, setTempEntityTypeFilters] = useState<
    (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES][]
  >([]);

  // Instructor filter state
  const [instructorFilters, setInstructorFilters] = useState<string[]>([]);
  const [tempInstructorFilters, setTempInstructorFilters] = useState<string[]>(
    [],
  );
  const [showInstructorDropdown, setShowInstructorDropdown] = useState(false);
  const [instructorSearch, setInstructorSearch] = useState("");
  const instructorButtonRef = useRef<HTMLButtonElement>(null);
  const instructorDropdownRef = useRef<HTMLDivElement>(null);

  // Adviser filter state
  const [adviserFilters, setAdviserFilters] = useState<string[]>([]);
  const [tempAdviserFilters, setTempAdviserFilters] = useState<string[]>([]);
  const [showAdviserDropdown, setShowAdviserDropdown] = useState(false);
  const [adviserSearch, setAdviserSearch] = useState("");
  const adviserButtonRef = useRef<HTMLButtonElement>(null);
  const adviserDropdownRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Update the state to track column-level expansion
  type ExpandedColumns = {
    instructor: boolean;
    affectedEntity: boolean;
    details: boolean;
  };

  const [expandedColumns, setExpandedColumns] = useState<ExpandedColumns>({
    instructor: false,
    affectedEntity: false,
    details: false,
  });

  // Add refs for button elements
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const entityButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showActionDropdown) {
      setTempActionFilters(appliedActionFilters);
    }
  }, [showActionDropdown, appliedActionFilters]);

  useEffect(() => {
    if (showInstructorDropdown) {
      setTempInstructorFilters(instructorFilters);
    }
  }, [showInstructorDropdown, instructorFilters]);

  useEffect(() => {
    if (showAdviserDropdown) {
      setTempAdviserFilters(adviserFilters);
    }
  }, [showAdviserDropdown, adviserFilters]);

  useEffect(() => {
    if (showEntityDropdown) setTempEntityTypeFilters(appliedEntityTypeFilters);
  }, [showEntityDropdown, appliedEntityTypeFilters]);

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
    if (!showInstructorDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        instructorDropdownRef.current &&
        !instructorDropdownRef.current.contains(event.target as Node) &&
        instructorButtonRef.current &&
        !instructorButtonRef.current.contains(event.target as Node)
      ) {
        setShowInstructorDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInstructorDropdown]);

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

  // Fetch instructors for filter dropdown
  const instructors = useQuery(api.fetch.getInstructors) || [];

  // Fetch advisers for filter dropdown
  const advisers = useQuery(api.fetch.getAdvisers, {
    pageSize: 1000,
    pageNumber: 1,
  }) || { users: [] };

  // Fetch logs with backend multi-select filtering for action and entity type
  const logsQuery = useQuery(api.fetch.getLogsWithDetails, {
    userRole: userRole,
    pageSize,
    pageNumber: currentPage,
    action: appliedActionFilters.length > 0 ? appliedActionFilters : undefined,
    entityType:
      appliedEntityTypeFilters.length > 0
        ? appliedEntityTypeFilters.map((e) => e.toLowerCase())
        : undefined,
    instructorIds:
      instructorFilters.length > 0
        ? instructorFilters.map((id) => id as Id<"users">)
        : undefined,
    adviserIds:
      adviserFilters.length > 0
        ? adviserFilters.map((id) => id as Id<"users">)
        : undefined,
  });

  const logs: Log[] = logsQuery?.logs || [];
  const totalCount = logsQuery?.totalCount || 0;
  const totalPages = logsQuery?.totalPages || 1;

  const getUserName = (log: Log) => {
    if (log.user?.first_name && log.user?.last_name) {
      const shortId = log.user_id.toString().slice(-4);
      return {
        display: `${log.user.first_name} ${log.user.middle_name ? log.user.middle_name + " " : ""}${log.user.last_name}`,
        id: shortId,
      };
    }
    return {
      display: userRole === 0 ? "Unknown Instructor" : "Unknown Adviser",
      id: null,
    };
  };

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
    // For groups, show "Project manager last name + et al." if project manager info is available
    if (log.affected_entity_type === "group") {
      const shortId = log.affected_entity_id.toString().slice(-4);
      if (log.affectedEntity?.projectManager?.last_name) {
        return {
          display: `${log.affectedEntity.projectManager.last_name} et al`,
          id: shortId,
        };
      } else {
        return {
          display: "Unknown Group",
          id: shortId,
        };
      }
    }
    if (log.affected_entity_type === "database") {
      return { display: "Database", id: null };
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

  const handleInstructorFilter = (instructorId: string) => {
    let newFilters;
    if (tempInstructorFilters.includes(instructorId)) {
      newFilters = tempInstructorFilters.filter((f) => f !== instructorId);
    } else {
      newFilters = [...tempInstructorFilters, instructorId];
    }
    setTempInstructorFilters(newFilters);
  };

  const handleSaveInstructorFilters = () => {
    setInstructorFilters(tempInstructorFilters);
    setShowInstructorDropdown(false);
    setCurrentPage(1);
  };

  const handleResetInstructorFilters = () => {
    setTempInstructorFilters([]);
    setInstructorFilters([]);
    setCurrentPage(1);
  };

  const handleAdviserFilter = (adviserId: string) => {
    let newFilters;
    if (tempAdviserFilters.includes(adviserId)) {
      newFilters = tempAdviserFilters.filter((f) => f !== adviserId);
    } else {
      newFilters = [...tempAdviserFilters, adviserId];
    }
    setTempAdviserFilters(newFilters);
  };

  const handleSaveAdviserFilters = () => {
    setAdviserFilters(tempAdviserFilters);
    setShowAdviserDropdown(false);
    setCurrentPage(1);
  };

  const handleResetAdviserFilters = () => {
    setTempAdviserFilters([]);
    setAdviserFilters([]);
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

  // Get available actions based on user role
  const getAvailableActions = () => {
    if (userRole === 0) {
      // Instructor actions
      return Object.values(LOG_ACTIONS).filter(
        (action) =>
          action !== LOG_ACTIONS.ALL &&
          action !== LOG_ACTIONS.ACCEPT_GROUP &&
          action !== LOG_ACTIONS.REJECT_GROUP,
      );
    } else {
      // Adviser actions
      return [LOG_ACTIONS.ACCEPT_GROUP, LOG_ACTIONS.REJECT_GROUP];
    }
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
    localStorage.setItem("logsPageSize", size.toString());
  };

  // Helper: normalize string for search
  const normalize = (str: string | undefined | null) =>
    (str || "").toLowerCase();

  // Add this helper function near the top of the component (after hooks, before return):
  function getLocalDateString() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split("T")[0];
  }

  // Apply all filters and sorting before pagination
  const filteredAndSortedLogs = logs
    .filter((log) => {
      // Action filter
      if (
        appliedActionFilters.length > 0 &&
        !appliedActionFilters.includes(
          log.action as (typeof LOG_ACTIONS)[keyof typeof LOG_ACTIONS],
        )
      ) {
        return false;
      }
      // Entity type filter (multi-select)
      if (
        appliedEntityTypeFilters.length > 0 &&
        !appliedEntityTypeFilters.includes(
          log.affected_entity_type === "user"
            ? ENTITY_TYPES.USER
            : log.affected_entity_type === "group"
              ? ENTITY_TYPES.GROUP
              : log.affected_entity_type === "database"
                ? ENTITY_TYPES.DATABASE
                : ("" as never),
        )
      ) {
        return false;
      }
      // Date filter (inclusive)
      if (startDate) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (log._creationTime < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (log._creationTime > end) return false;
      }
      // Search term filter (existing logic)
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      // Log ID
      if (log._id.toString().toLowerCase().includes(term)) return true;
      // User ID (who performed the action)
      if (log.user_id.toString().toLowerCase().includes(term)) return true;
      // Affected entity ID
      if (log.affected_entity_id?.toString().toLowerCase().includes(term))
        return true;
      // Action (exact or partial match)
      if (normalize(log.action).includes(term)) return true;
      // --- Frontend-only: names/capstone ---
      // User name (who performed the action)
      const userName = [
        log.user?.first_name,
        log.user?.middle_name,
        log.user?.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (userName.includes(term)) return true;
      // Affected entity (user or group)
      let affectedName = "";
      if (log.affected_entity_type === "user") {
        affectedName = [
          log.affectedEntity?.first_name,
          log.affectedEntity?.middle_name,
          log.affectedEntity?.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
      } else if (log.affected_entity_type === "group") {
        affectedName = normalize(log.affectedEntity?.projectManager?.last_name);
      }
      if (affectedName.includes(term)) return true;
      return false;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      switch (sortField) {
        case "_creationTime":
          aValue = a._creationTime;
          bValue = b._creationTime;
          break;
        case "affectedEntity":
          aValue =
            a.affected_entity_type === "user"
              ? normalize(
                  [
                    a.affectedEntity?.first_name,
                    a.affectedEntity?.middle_name,
                    a.affectedEntity?.last_name,
                  ]
                    .filter(Boolean)
                    .join(" "),
                )
              : normalize(a.affectedEntity?.projectManager?.last_name);
          bValue =
            b.affected_entity_type === "user"
              ? normalize(
                  [
                    b.affectedEntity?.first_name,
                    b.affectedEntity?.middle_name,
                    b.affectedEntity?.last_name,
                  ]
                    .filter(Boolean)
                    .join(" "),
                )
              : normalize(b.affectedEntity?.projectManager?.last_name);
          break;
        case "action":
          aValue = normalize(a.action);
          bValue = normalize(b.action);
          break;
        default:
          aValue = a._creationTime;
          bValue = b._creationTime;
      }
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

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
                className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer w-48"
                onClick={() => handleSort("_creationTime")}
              >
                <div className="flex items-center justify-center text-xs">
                  Date & Time
                  <span className="ml-1">{getSortIcon("_creationTime")}</span>
                </div>
              </th>
              <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider w-40">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">
                    {userRole === 0 ? "INSTRUCTOR" : "ADVISER"}
                  </span>
                  {userRole === 0 && (
                    <button
                      type="button"
                      className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInstructorDropdown(!showInstructorDropdown);
                        setShowActionDropdown(false);
                        setShowEntityDropdown(false);
                        setShowAdviserDropdown(false);
                      }}
                      title="Filter instructors"
                      ref={instructorButtonRef}
                      style={{ boxShadow: "none" }}
                    >
                      <FaFilter
                        className={
                          `w-4 h-4 transition-colors ` +
                          (showInstructorDropdown ||
                          instructorFilters.length > 0
                            ? "text-blue-500"
                            : "text-white")
                        }
                      />
                    </button>
                  )}
                  {userRole === 1 && (
                    <button
                      type="button"
                      className="ml-1 p-1 bg-transparent border-none outline-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAdviserDropdown(!showAdviserDropdown);
                        setShowActionDropdown(false);
                        setShowEntityDropdown(false);
                        setShowInstructorDropdown(false);
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
                  )}
                </div>
                {showInstructorDropdown && (
                  <div
                    ref={instructorDropdownRef}
                    className="absolute left-0 top-full z-20 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    style={{ minWidth: 220 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3 border-b">
                      <div className="relative">
                        <input
                          type="text"
                          value={instructorSearch}
                          onChange={(e) => setInstructorSearch(e.target.value)}
                          placeholder="Search instructors..."
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
                      {instructors
                        .filter((instructor) =>
                          `${instructor.first_name} ${instructor.middle_name ? instructor.middle_name + " " : ""}${instructor.last_name}`
                            .toLowerCase()
                            .includes(instructorSearch.toLowerCase()),
                        )
                        .slice(0, 10)
                        .map((instructor) => (
                          <label
                            key={instructor._id}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                          >
                            <input
                              type="checkbox"
                              checked={tempInstructorFilters.includes(
                                instructor._id,
                              )}
                              onChange={() =>
                                handleInstructorFilter(instructor._id)
                              }
                              className="accent-blue-600"
                            />
                            <span className="text-left">
                              {`${instructor.first_name} ${instructor.middle_name ? instructor.middle_name + " " : ""}${instructor.last_name}`}
                            </span>
                          </label>
                        ))}
                    </div>
                    <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={handleSaveInstructorFilters}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleResetInstructorFilters}
                        className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm font-medium"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
                {showAdviserDropdown && (
                  <div
                    ref={adviserDropdownRef}
                    className="absolute left-0 top-full z-20 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                    style={{ minWidth: 220 }}
                    onClick={(e) => e.stopPropagation()}
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
                      {advisers.users
                        .filter((adviser) =>
                          `${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + " " : ""}${adviser.last_name}`
                            .toLowerCase()
                            .includes(adviserSearch.toLowerCase()),
                        )
                        .slice(0, 10)
                        .map((adviser) => (
                          <label
                            key={adviser._id}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                          >
                            <input
                              type="checkbox"
                              checked={tempAdviserFilters.includes(adviser._id)}
                              onChange={() => handleAdviserFilter(adviser._id)}
                              className="accent-blue-600"
                            />
                            <span className="text-left">
                              {`${adviser.first_name} ${adviser.middle_name ? adviser.middle_name + " " : ""}${adviser.last_name}`}
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
              {userRole === 0 && (
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
              )}
              {userRole === 1 && (
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
              )}
              {userRole === 0 && (
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
                          appliedEntityTypeFilters.length > 0
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
                        {Object.values(ENTITY_TYPES)
                          .filter((type) => type !== ENTITY_TYPES.ALL)
                          .map((type) => (
                            <label
                              key={type}
                              className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 text-left"
                            >
                              <input
                                type="checkbox"
                                checked={tempEntityTypeFilters.includes(type)}
                                onChange={() => {
                                  if (tempEntityTypeFilters.includes(type)) {
                                    setTempEntityTypeFilters(
                                      tempEntityTypeFilters.filter(
                                        (t) => t !== type,
                                      ),
                                    );
                                  } else {
                                    setTempEntityTypeFilters([
                                      ...tempEntityTypeFilters,
                                      type,
                                    ]);
                                  }
                                }}
                                className="accent-blue-600"
                              />
                              <span className="text-left">
                                {type === ENTITY_TYPES.USER
                                  ? "Users"
                                  : type === ENTITY_TYPES.GROUP
                                    ? "Groups"
                                    : "Database"}
                              </span>
                            </label>
                          ))}
                      </div>
                      <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
                        <button
                          onClick={() => {
                            setShowEntityDropdown(false);
                            setAppliedEntityTypeFilters(tempEntityTypeFilters);
                            setCurrentPage(1);
                          }}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            setTempEntityTypeFilters([]);
                            setAppliedEntityTypeFilters([]);
                            setCurrentPage(1);
                          }}
                          className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm font-medium"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </th>
              )}
              {userRole === 1 && (
                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider w-40">
                  Entity
                </th>
              )}
              <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider flex-1">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {!logsQuery ? (
              <tr>
                <td
                  colSpan={userRole === 0 ? 5 : 4}
                  className="px-6 py-12 text-center text-gray-500 w-full"
                >
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="text-lg font-medium mb-2">Loading...</div>
                    <div className="text-sm text-gray-400">Please wait while we fetch the logs</div>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={userRole === 0 ? 5 : 4}
                  className="px-6 py-12 text-center text-gray-500 w-full"
                >
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="text-lg font-medium mb-2">No logs available</div>
                    <div className="text-sm text-gray-400">There are no logs to display at this time</div>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={userRole === 0 ? 5 : 4}
                  className="px-6 py-12 text-center text-gray-500 w-full"
                >
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="text-lg font-medium mb-2">No entries found</div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedLogs.map((log: Log, index: number) => {
                const instructor = getUserName(log);
                const affectedEntity = getAffectedEntityName(log);
                return (
                  <tr
                    key={log._id}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-200"}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-left w-48">
                      {format(
                        new Date(log._creationTime),
                        "MMM dd, yyyy hh:mm a",
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left w-40">
                      <CollapsibleText
                        text={instructor.display}
                        maxLength={20}
                        column="instructor"
                        id={instructor.id}
                      />
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
              Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              {" - "}
              {Math.min(currentPage * pageSize, totalCount)}
              {" of "}
              {totalCount} entries
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
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === Math.max(totalPages, 1)}
              className={`p-2 rounded-md ${
                currentPage === Math.max(totalPages, 1)
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
