import { format } from "date-fns";
import { FaChevronLeft, FaChevronRight, FaSearch, FaSort, FaSortUp, FaSortDown, FaChevronDown } from "react-icons/fa";
import { useState } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";

// =========================================
// Types
// =========================================
interface Log {
    _id: Id<"instructorLogs">;
    instructor_id: Id<"users">;
    instructor_first_name: string | null;
    instructor_middle_name: string | null;
    instructor_last_name: string | null;
    instructor_email: string | null;
    affected_entity_type: string;
    affected_entity_id: Id<"users"> | Id<"groupsTable">;
    affected_entity_first_name: string | null;
    affected_entity_middle_name: string | null;
    affected_entity_last_name: string | null;
    affected_entity_email: string | null;
    action: string;
    details: string;
    _creationTime: number;
}

interface LogTableProps {
    logs: Log[];
}

type SortField = "timestamp";
type SortDirection = "asc" | "desc";

// =========================================
// Constants
// =========================================
const LOG_ACTIONS = {
    ALL: "All Actions",
    CREATE: "Create",
    EDIT: "Edit",
    DELETE: "Delete",
    RESET_PASSWORD: "Reset Password"
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
    // Default colors for any new actions
    default: {
        bg: 'bg-gray-100',
        text: 'text-gray-800'
    }
} as const;

// =========================================
// Component
// =========================================
export const LogTable = ({ logs }: LogTableProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("timestamp");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [actionFilter, setActionFilter] = useState<typeof LOG_ACTIONS[keyof typeof LOG_ACTIONS]>(LOG_ACTIONS.ALL);
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

    const filterAndSortLogs = () => {
        const filtered = logs.filter((log) => {
            const instructorName = getInstructorName(log);
            const entityName = getAffectedEntityName(log);
            const matchesSearch = searchTerm === "" ||
                instructorName.display.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entityName.display.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAction = actionFilter === LOG_ACTIONS.ALL || log.action === actionFilter;

            const logDate = new Date(log._creationTime);
            const startDateObj = startDate ? new Date(startDate + 'T00:00:00') : null;
            const endDateObj = endDate ? new Date(endDate + 'T23:59:59') : null;
            
            const matchesDateRange = (!startDateObj || logDate >= startDateObj) &&
                                   (!endDateObj || logDate <= endDateObj);

            return matchesSearch && matchesAction && matchesDateRange;
        });

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case "timestamp":
                    comparison = a._creationTime - b._creationTime;
                    break;
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });

        return filtered;
    };

    const getPaginationInfo = (logs: Log[]) => {
        const entriesPerPage = 5;
        const totalEntries = logs.length;
        const totalPages = Math.ceil(totalEntries / entriesPerPage);
        const startEntry = (currentPage - 1) * entriesPerPage + 1;
        const endEntry = Math.min(startEntry + entriesPerPage - 1, totalEntries);
        const paginatedLogs = logs.slice(startEntry - 1, endEntry);

        return {
            totalEntries,
            totalPages,
            startEntry,
            endEntry,
            paginatedLogs,
        };
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
            'Reset Password': LOG_ACTIONS.RESET_PASSWORD
        };

        const consolidatedAction = actionMap[action] || action;
        const colors = ACTION_COLORS[consolidatedAction as keyof typeof ACTION_COLORS] || ACTION_COLORS.default;
        return `${colors.bg} ${colors.text}`;
    };

    const filteredAndSortedLogs = filterAndSortLogs();
    const { totalEntries, totalPages, startEntry, endEntry, paginatedLogs } = getPaginationInfo(filteredAndSortedLogs);

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
                <div className="flex gap-2">
                    <div className="relative">
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
                        {startDate && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                {format(new Date(startDate), "MMM dd, yyyy")}
                            </div>
                        )}
                    </div>
                    <span className="self-center text-gray-500">to</span>
                    <div className="relative">
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
                        {endDate && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                {format(new Date(endDate), "MMM dd, yyyy")}
                            </div>
                        )}
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
                                    onClick={() => handleSort("timestamp")}
                                >
                                    <div className="flex items-center justify-center">
                                        Date & Time
                                        <span className="ml-1">{getSortIcon("timestamp")}</span>
                                    </div>
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    Instructor
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    Action
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    Affected Entity 
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.map((log, index) => {
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
                            })}
                        </tbody>
                    </table>
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
                </div>
            </div>
        </div>
    );
}; 