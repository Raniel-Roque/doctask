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
    instructor_name: string;
    affected_user_id: Id<"users"> | null;
    affected_user_name: string;
    affected_user_email: string;
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
    CREATE_USER: "Create User",
    EDIT_USER: "Edit User",
    DELETE_USER: "Delete User",
    RESET_PASSWORD: "Reset Password"
} as const;

const ACTION_COLORS = {
    [LOG_ACTIONS.CREATE_USER]: {
        bg: 'bg-green-100',
        text: 'text-green-800'
    },
    [LOG_ACTIONS.EDIT_USER]: {
        bg: 'bg-blue-100',
        text: 'text-blue-800'
    },
    [LOG_ACTIONS.DELETE_USER]: {
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
    
    type ExpandedColumns = {
        instructorId: boolean;
        affectedUserId: boolean;
        email: boolean;
        details: boolean;
    };
    
    const [expandedColumns, setExpandedColumns] = useState<ExpandedColumns>({
        instructorId: false,
        affectedUserId: false,
        email: false,
        details: false
    });

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
    };

    const filterAndSortLogs = () => {
        const filtered = logs.filter((log) => {
            const matchesSearch = searchTerm === "" ||
                log.instructor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.affected_user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.affected_user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAction = actionFilter === LOG_ACTIONS.ALL || log.action === actionFilter;

            const logDate = new Date(log._creationTime);
            const matchesDateRange = (!startDate || logDate >= new Date(startDate)) &&
                                   (!endDate || logDate <= new Date(endDate + 'T23:59:59'));

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
        const colors = ACTION_COLORS[action as keyof typeof ACTION_COLORS] || ACTION_COLORS.default;
        return `${colors.bg} ${colors.text}`;
    };

    const filteredAndSortedLogs = filterAndSortLogs();
    const { totalEntries, totalPages, startEntry, endEntry, paginatedLogs } = getPaginationInfo(filteredAndSortedLogs);

    // =========================================
    // Collapsible Text Component
    // =========================================
    const CollapsibleText = ({ text, maxLength = 10, column }: { text: string | null, maxLength?: number, column: keyof ExpandedColumns }) => {
        if (!text) return <span>-</span>;
        if (text.length <= maxLength) return <span>{text}</span>;

        return (
            <button
                onClick={() => setExpandedColumns((prev: ExpandedColumns) => ({ ...prev, [column]: !prev[column] }))}
                className="w-full text-left"
            >
                {expandedColumns[column] ? text : `${text.slice(0, maxLength)}...`}
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
                    <input
                        type="date"
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        max={endDate || undefined}
                    />
                    <span className="self-center text-gray-500">to</span>
                    <input
                        type="date"
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        min={startDate || undefined}
                    />
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
                                        Time
                                        <span className="ml-1">{getSortIcon("timestamp")}</span>
                                    </div>
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    instructor ID
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    instructor Name
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    Action
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    User ID
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    User Name
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    User Email
                                </th>
                                <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.map((log, index) => (
                                <tr key={log._id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-left">
                                        {format(new Date(log._creationTime), "MM dd, yyyy hh:mm a")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left cursor-pointer">
                                        <CollapsibleText text={log.instructor_id} maxLength={4} column="instructorId" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left">
                                        {log.instructor_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColors(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left cursor-pointer">
                                        <CollapsibleText text={log.affected_user_id} maxLength={4} column="affectedUserId" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left">
                                        {log.affected_user_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left cursor-pointer">
                                        <CollapsibleText text={log.affected_user_email} maxLength={10} column="email" />
                                    </td>
                                    <td className="px-6 py-4 max-w-md break-words text-left cursor-pointer">
                                        <CollapsibleText text={log.details} maxLength={30} column="details" />
                                    </td>
                                </tr>
                            ))}
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