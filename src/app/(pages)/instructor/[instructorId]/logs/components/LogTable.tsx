import { format } from "date-fns";
import { FaChevronLeft, FaChevronRight, FaSearch, FaSort, FaSortUp, FaSortDown, FaChevronDown } from "react-icons/fa";
import { useState } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";

// =========================================
// Types
// =========================================
interface Log {
    _id: Id<"instructorLogs">;
    instructor_id: Id<"users">;
    instructor_first_name?: string;
    instructor_middle_name?: string;
    instructor_last_name?: string;
    instructor_email?: string;
    affected_entity_type: string;
    affected_entity_id: Id<"users"> | Id<"groupsTable">;
    affected_entity_first_name?: string;
    affected_entity_middle_name?: string;
    affected_entity_last_name?: string;
    affected_entity_email?: string;
    action: string;
    details: string;
    _creationTime: number;
}

type SortField = "_creationTime" | "instructor" | "affectedEntity" | "action";
type SortDirection = "asc" | "desc";

// =========================================
// Constants
// =========================================
const LOG_ACTIONS = {
    ALL: "All Actions",
    CREATE: "Create",
    EDIT: "Edit",
    DELETE: "Delete",
    RESET_PASSWORD: "Reset Password",
    LOCK_ACCOUNT: "Lock Account",
    UNLOCK_ACCOUNT: "Unlock Account"
} as const;

const ACTION_COLORS = {
    [LOG_ACTIONS.CREATE]: {
        bg: 'bg-green-100',
        text: 'text-green-800'
    },
    [LOG_ACTIONS.EDIT]: {
        bg: 'bg-blue-100',
        text: 'text-blue-800'
    },
    [LOG_ACTIONS.DELETE]: {
        bg: 'bg-red-100',
        text: 'text-red-800'
    },
    [LOG_ACTIONS.RESET_PASSWORD]: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800'
    },
    [LOG_ACTIONS.LOCK_ACCOUNT]: {
        bg: 'bg-red-100',
        text: 'text-red-800'
    },
    [LOG_ACTIONS.UNLOCK_ACCOUNT]: {
        bg: 'bg-green-100',
        text: 'text-green-800'
    },
    // Default colors for any new actions
    default: {
        bg: 'bg-gray-100',
        text: 'text-gray-800'
    }
} as const;

// Add entity type constants
const ENTITY_TYPES = {
    ALL: "All Entities",
    USER: "user",
    GROUP: "group"
} as const;

// =========================================
// Component
// =========================================
export const LogTable = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("_creationTime");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(() => {
        // Get saved page size from localStorage or default to 5
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('logsPageSize');
            return saved ? parseInt(saved, 10) : 5;
        }
        return 5;
    });
    const [actionFilter, setActionFilter] = useState<typeof LOG_ACTIONS[keyof typeof LOG_ACTIONS]>(LOG_ACTIONS.ALL);
    const [entityTypeFilter, setEntityTypeFilter] = useState<typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES]>(ENTITY_TYPES.ALL);
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
        details: false
    });

    // Convert date strings to timestamps
    const startTimestamp = startDate ? new Date(startDate + 'T00:00:00').getTime() : undefined;
    const endTimestamp = endDate ? new Date(endDate + 'T23:59:59').getTime() : undefined;

    // Fetch logs with search, pagination, sorting, and filtering
    const logsData = useQuery(api.fetch.getLogs, {
        searchTerm: searchTerm || "",
        pageSize: pageSize || 5,
        pageNumber: currentPage || 1,
        sortField: sortField || undefined,
        sortDirection: sortDirection || undefined,
        actionFilter: actionFilter === LOG_ACTIONS.ALL ? undefined : actionFilter,
        entityTypeFilter: entityTypeFilter === ENTITY_TYPES.ALL ? undefined : entityTypeFilter,
        startDate: startTimestamp,
        endDate: endTimestamp
    });

    const getInstructorName = (log: Log) => {
        if (log.instructor_first_name && log.instructor_last_name) {
            const shortId = log.instructor_id.toString().slice(-4);
            return {
                display: `${log.instructor_first_name} ${log.instructor_middle_name ? log.instructor_middle_name + ' ' : ''}${log.instructor_last_name}`,
                id: shortId
            };
        }
        return { display: 'Unknown Instructor', id: null };
    };

    const getAffectedEntityName = (log: Log) => {
        if (log.affected_entity_type === 'user') {
            if (log.affected_entity_first_name && log.affected_entity_last_name) {
                const shortId = log.affected_entity_id.toString().slice(-4);
                return {
                    display: `${log.affected_entity_first_name} ${log.affected_entity_middle_name ? log.affected_entity_middle_name + ' ' : ''}${log.affected_entity_last_name}`,
                    id: shortId
                };
            }
            return { display: '-', id: null };
        }
        // For groups, show the project manager's last name + et al. and include the ID
        if (log.affected_entity_last_name) {
            const shortId = log.affected_entity_id.toString().slice(-4);
            return {
                display: `${log.affected_entity_last_name} et al.`,
                id: shortId
            };
        }
        return { display: '-', id: null };
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

    const getActionColors = (action: string) => {
        // Map the detailed actions to their consolidated versions
        const actionMap: { [key: string]: string } = {
            'Create User': LOG_ACTIONS.CREATE,
            'Create Group': LOG_ACTIONS.CREATE,
            'Edit User': LOG_ACTIONS.EDIT,
            'Edit Group': LOG_ACTIONS.EDIT,
            'Delete User': LOG_ACTIONS.DELETE,
            'Delete Group': LOG_ACTIONS.DELETE,
            'Reset Password': LOG_ACTIONS.RESET_PASSWORD,
            'Lock Account': LOG_ACTIONS.LOCK_ACCOUNT,
            'Unlock Account': LOG_ACTIONS.UNLOCK_ACCOUNT
        };

        const consolidatedAction = actionMap[action] || action;
        const colors = ACTION_COLORS[consolidatedAction as keyof typeof ACTION_COLORS] || ACTION_COLORS.default;
        return `${colors.bg} ${colors.text}`;
    };

    // =========================================
    // Collapsible Text Component
    // =========================================
    const CollapsibleText = ({ 
        text, 
        maxLength = 10, 
        column, 
        id 
    }: { 
        text: string | null, 
        maxLength?: number, 
        column: keyof ExpandedColumns, 
        id?: string | null 
    }) => {
        if (!text) return <span>-</span>;
        if (text.length <= maxLength && !id) return <span>{text}</span>;

        const isExpanded = expandedColumns[column];

        return (
            <button
                onClick={() => setExpandedColumns(prev => ({ 
                    ...prev, 
                    [column]: !prev[column]
                }))}
                className="w-full text-left"
            >
                {isExpanded ? (
                    <span>
                        {text}
                        {id && <span className="text-gray-500 ml-1">(ID: {id})</span>}
                    </span>
                ) : (
                    <span>{text.length > maxLength ? `${text.slice(0, maxLength)}...` : text}</span>
                )}
            </button>
        );
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(1); // Reset to first page when changing page size
        localStorage.setItem('logsPageSize', size.toString());
    };

    const { logs = [], totalCount = 0, totalPages = 0 } = logsData || {};
    
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
                <div className="relative">
                    <select 
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10"
                        value={actionFilter}
                        onChange={(e) => {
                            setActionFilter(e.target.value as typeof LOG_ACTIONS[keyof typeof LOG_ACTIONS]);
                            setCurrentPage(1);
                        }}
                    >
                        {Object.values(LOG_ACTIONS).map((action) => (
                            <option key={action} value={action}>
                                {action}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <FaChevronDown color="#6B7280" />
                    </div>
                </div>
                <div className="relative">
                    <select 
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10"
                        value={entityTypeFilter}
                        onChange={(e) => {
                            setEntityTypeFilter(e.target.value as typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES]);
                            setCurrentPage(1);
                        }}
                    >
                        {Object.values(ENTITY_TYPES).map((type) => (
                            <option key={type} value={type}>
                                {type === ENTITY_TYPES.ALL ? "All Entities" : type === ENTITY_TYPES.USER ? "Users" : "Groups"}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <FaChevronDown color="#6B7280" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex flex-col items-start" style={{ minWidth: '10rem' }}>
                        {startDate && (
                            <button
                                type="button"
                                className="absolute -top-1 right-0 text-blue-600 hover:text-blue-800 text-xs z-20 bg-white px-1"
                                onClick={() => setStartDate("")}
                                tabIndex={-1}
                                style={{ transform: 'translateY(-100%)' }}
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
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <span className="self-center text-gray-500">to</span>
                    <div className="relative flex flex-col items-start" style={{ minWidth: '10rem' }}>
                        {endDate && (
                            <button
                                type="button"
                                className="absolute -top-2 right-0 text-blue-600 hover:text-blue-800 text-xs z-20 bg-white px-1"
                                onClick={() => setEndDate("")}
                                tabIndex={-1}
                                style={{ transform: 'translateY(-100%)' }}
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
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="min-w-full">
                    <table className="w-full bg-white border border-gray-200">
                        <thead>
                            <tr className="bg-[#B54A4A]">
                                <th 
                                    className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort("_creationTime")}
                                >
                                    <div className="flex items-center justify-center">
                                        Date & Time
                                        <span className="ml-1">{getSortIcon("_creationTime")}</span>
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort("instructor")}
                                >
                                    <div className="flex items-center justify-center">
                                    Instructor
                                        <span className="ml-1">{getSortIcon("instructor")}</span>
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort("action")}
                                >
                                    <div className="flex items-center justify-center">
                                    Action
                                        <span className="ml-1">{getSortIcon("action")}</span>
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort("affectedEntity")}
                                >
                                    <div className="flex items-center justify-center">
                                    Affected Entity 
                                        <span className="ml-1">{getSortIcon("affectedEntity")}</span>
                                    </div>
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {!logsData ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        No logs available
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log: Log, index: number) => {
                                    const instructor = getInstructorName(log);
                                    const affectedEntity = getAffectedEntityName(log);
                                    return (
                                    <tr key={log._id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {format(new Date(log._creationTime), "MMM dd, yyyy hh:mm a")}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left">
                                                <CollapsibleText 
                                                    text={instructor.display}
                                                    maxLength={20}
                                                    column="instructor"
                                                    id={instructor.id}
                                                />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColors(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left">
                                                <CollapsibleText 
                                                    text={affectedEntity.display}
                                                    maxLength={20}
                                                    column="affectedEntity"
                                                    id={affectedEntity.id}
                                                />
                                        </td>
                                        <td className="px-6 py-4 text-left cursor-pointer whitespace-pre-line">
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
                </div>
            </div>
        </div>
    );
}; 