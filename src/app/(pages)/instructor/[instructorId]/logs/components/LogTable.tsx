import { formatDateTime } from "@/lib/date-utils";
import {
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFilter,
} from "react-icons/fa";
import { useState, useRef, useEffect, useMemo } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
// Using jsPDF for better performance - no React re-rendering
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

// =========================================
// Performance Optimization: Limit Rendered Items
// =========================================
const MAX_VISIBLE_ITEMS = 50; // Only render 50 items at a time for better performance

// Removed useDebounce hook - no longer needed with jsPDF

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


  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Removed debounced variables - no longer needed with jsPDF

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


  // Fetch logs with backend filtering for action and entity type only
  const logsQuery = useQuery(api.fetch.getLogsWithDetails, {
    userRole: userRole,
    pageSize: 10000, // Get all logs for frontend filtering
    pageNumber: 1,
    action: appliedActionFilters.length > 0 ? appliedActionFilters : undefined,
    entityType:
      appliedEntityTypeFilters.length > 0
        ? appliedEntityTypeFilters.map((e) => e.toLowerCase())
        : undefined,
    sortField,
    sortDirection,
  });

  // Removed allFilteredLogsQuery - no longer needed with jsPDF

  const logs: Log[] = useMemo(() => logsQuery?.logs || [], [logsQuery?.logs]);

  const getUserName = (log: Log) => {
    if (log.user?.first_name && log.user?.last_name) {
      const shortId = log.user_id.toString().slice(-4);
      return {
        display: `${log.user.first_name} ${log.user.middle_name ? log.user.middle_name + " " : ""}${log.user.last_name}`,
        email: log.user.email || "",
        id: shortId,
      };
    }
    return {
      display: userRole === 0 ? "Unknown Instructor" : "Unknown Adviser",
      email: "",
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
    
    // If maxLength is 0, show full text without truncation or button
    if (maxLength === 0) {
      return (
        <span>
          {text}
          {id && <span className="text-gray-500 ml-1">(ID: {id})</span>}
        </span>
      );
    }
    
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

  // Removed exportReady - no longer needed with jsPDF

  // Helper: normalize string for search
  const normalize = (str: string | undefined | null) =>
    (str || "").toLowerCase();

  // Add this helper function near the top of the component (after hooks, before return):
  function getLocalDateString() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split("T")[0];
  }

  // Apply frontend filtering for search and date
  const filteredLogs = logs.filter((log) => {
    // Date filter (inclusive) - fix the logic
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00.000Z').getTime();
      if (log._creationTime < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999Z').getTime();
      if (log._creationTime > end) return false;
    }
    
    // Search term filter
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
    // Details
    if (normalize(log.details).includes(term)) return true;
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
  });

  // Removed stableExportKey - no longer needed with jsPDF

  // Removed title and filters - no longer needed with jsPDF

  // Apply sorting to filtered logs for PDF export
  const sortedFilteredLogs = useMemo(() => {
    const sorted = [...filteredLogs].sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortField) {
        case "_creationTime":
          aValue = a._creationTime;
          bValue = b._creationTime;
          break;
        case "affectedEntity":
          aValue = getAffectedEntityName(a).display.toLowerCase();
          bValue = getAffectedEntityName(b).display.toLowerCase();
          break;
        case "action":
          aValue = a.action.toLowerCase();
          bValue = b.action.toLowerCase();
          break;
        default:
          aValue = a._creationTime;
          bValue = b._creationTime;
      }
      
      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return sorted;
  }, [filteredLogs, sortField, sortDirection]);

  // Efficient PDF generation function - no React re-rendering
  const generatePDF = () => {
    try {
      console.log('Generating Logs PDF...', { sortedFilteredLogs: sortedFilteredLogs.length });
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Add title
      const role = userRole === 0 ? "Instructor" : "Adviser";
      doc.setFontSize(16);
      doc.text(`Capstone ${role} System Logs`, 14, 20);
      
      // Add filters info
      doc.setFontSize(10);
      let yPos = 30;
      const filterParts = [];
      if (searchTerm) filterParts.push(`Search: ${searchTerm.slice(0, 20)}...`);
      if (startDate) filterParts.push(`Start: ${startDate}`);
      if (endDate) filterParts.push(`End: ${endDate}`);
      if (appliedActionFilters.length > 0) filterParts.push(`Actions: ${appliedActionFilters.join(', ')}`);
      if (appliedEntityTypeFilters.length > 0) filterParts.push(`Entities: ${appliedEntityTypeFilters.join(', ')}`);
      
      if (filterParts.length > 0) {
        doc.text(`Filters: ${filterParts.join(' | ')}`, 14, yPos);
        yPos += 8;
      }
      
      // Add generation date
      const now = new Date();
      doc.text(`Generated: ${now.toLocaleString()}`, 14, yPos);
      yPos += 15;
      
      // Prepare table data
      const tableData = sortedFilteredLogs.map(log => {
        const date = new Date(log._creationTime).toLocaleString();
        const user = log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown';
        const affectedEntity = getAffectedEntityName(log).display;
        const details = log.details.length > 50 ? log.details.substring(0, 50) + '...' : log.details;
        
        return [date, user, log.action, affectedEntity, details];
      });
      
      // Build headers based on user role
      const headers = userRole === 0 
        ? ['Date & Time', 'Instructor', 'Action', 'Entity', 'Details']
        : ['Date & Time', 'Adviser', 'Action', 'Entity', 'Details'];
      
      // Build column styles based on user role
      const columnStyles = {
        0: { cellWidth: 35 }, // Date & Time
        1: { cellWidth: 30 }, // Instructor/Adviser
        2: { cellWidth: 25 }, // Action
        3: { cellWidth: 35 }, // Entity
        4: { cellWidth: 50 }  // Details
      };
      
      // Add table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [181, 74, 74] },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        columnStyles
      });
      
      // Save the PDF
      const date = new Date();
      const dateTime = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
      const fileName = `Capstone_${role}_System_Logs_${dateTime}.pdf`;
      doc.save(fileName);
      
      console.log('Logs PDF generated successfully:', fileName);
    } catch (error) {
      console.error('Error generating Logs PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Apply client-side pagination
  const totalFilteredCount = filteredLogs.length;
  const totalFilteredPages = Math.ceil(totalFilteredCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
  
  // Performance optimization: Limit rendered items to prevent slowdown with large datasets
  // Only apply this limit if we're not searching (to ensure search results are always visible)
  const visibleLogs = searchTerm.trim() 
    ? paginatedLogs // Show all results when searching
    : paginatedLogs.slice(0, MAX_VISIBLE_ITEMS); // Limit when not searching

  return (
    <div className="mt-4 w-full">
      <div className="mb-4 flex flex-col lg:flex-row gap-4 w-full">
        <div className="flex-1 relative min-w-0">
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
        <div className="flex gap-2 flex-shrink-0">
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
                const newStartDate = e.target.value;
                setStartDate(newStartDate);
                // If new start date is after end date, clear end date
                if (newStartDate && endDate && newStartDate > endDate) {
                  setEndDate("");
                }
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
        {filteredLogs.length > 0 && (
          <button
            onClick={generatePDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            title="Download Log Report (PDF)"
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
            Download Report
          </button>
        )}
      </div>
      <div className="relative w-full overflow-x-auto">
        <table className="w-full min-w-[1200px] bg-white border border-gray-200">
          <thead>
            <tr className="bg-[#B54A4A]">
              <th
                className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer min-w-[12rem]"
                onClick={() => handleSort("_creationTime")}
              >
                <div className="flex items-center justify-center text-xs">
                  Date & Time
                  <span className="ml-1">{getSortIcon("_creationTime")}</span>
                </div>
              </th>
              <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider min-w-[10rem]">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium uppercase">
                    {userRole === 0 ? "INSTRUCTOR" : "ADVISER"}
                  </span>
                </div>
              </th>
              {userRole === 0 && (
                <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider min-w-[6rem]">
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
                      className="fixed z-50 mt-2 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                      style={{
                        left: actionButtonRef.current?.getBoundingClientRect().left || 0,
                        top: (actionButtonRef.current?.getBoundingClientRect().bottom || 0) + 8
                      }}
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
                <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider min-w-[6rem]">
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
                      className="fixed z-50 mt-2 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                      style={{
                        left: actionButtonRef.current?.getBoundingClientRect().left || 0,
                        top: (actionButtonRef.current?.getBoundingClientRect().bottom || 0) + 8
                      }}
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
                <th className="relative px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider min-w-[10rem]">
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
                      className="fixed z-50 mt-2 min-w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 text-black"
                      style={{
                        left: entityButtonRef.current?.getBoundingClientRect().left || 0,
                        top: (entityButtonRef.current?.getBoundingClientRect().bottom || 0) + 8
                      }}
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
                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider min-w-[10rem]">
                  Entity
                </th>
              )}
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-white uppercase tracking-wider flex-1">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {!logsQuery ? (
              <tr>
                <td
                  colSpan={userRole === 0 ? 5 : 4}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={userRole === 0 ? 5 : 4}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  No logs available
                </td>
              </tr>
            ) : visibleLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={userRole === 0 ? 5 : 4}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  {searchTerm || startDate || endDate || appliedActionFilters.length > 0 || appliedEntityTypeFilters.length > 0 
                    ? "No entries found matching your filters" 
                    : "No logs available"}
                </td>
              </tr>
            ) : (
              visibleLogs.map((log: Log, index: number) => {
                const instructor = getUserName(log);
                const affectedEntity = getAffectedEntityName(log);
                return (
                  <tr
                    key={log._id}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-200"}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-left min-w-[12rem]">
                      {formatDateTime(log._creationTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left min-w-[10rem]">
                      <CollapsibleText
                        text={instructor.display}
                        maxLength={20}
                        column="instructor"
                        id={instructor.id}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center min-w-[6rem]">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColors(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left min-w-[10rem]">
                      <CollapsibleText
                        text={affectedEntity.display}
                        maxLength={20}
                        column="affectedEntity"
                        id={affectedEntity.id}
                      />
                    </td>
                    <td className="px-6 py-4 text-left cursor-pointer whitespace-pre-line w-full">
                      <CollapsibleText
                        text={log.details}
                        maxLength={userRole === 1 ? 0 : 20}
                        column="details"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Performance Warning */}
        {!searchTerm.trim() && paginatedLogs.length > MAX_VISIBLE_ITEMS && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Performance Notice:</strong> Showing first {MAX_VISIBLE_ITEMS} of {paginatedLogs.length} items on this page for optimal performance. Use search to find specific logs.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="min-w-full flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {totalFilteredCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </span>
              {" - "}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, totalFilteredCount)}
              </span>
              {" of "}
              <span className="font-medium">{totalFilteredCount}</span>
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
              Page {currentPage} of {Math.max(totalFilteredPages, 1)}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalFilteredPages}
              className={`p-2 rounded-md ${
                currentPage === totalFilteredPages
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
