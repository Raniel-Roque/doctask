import { format } from "date-fns";
import { FaChevronLeft, FaChevronRight, FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { useState } from "react";

interface Log {
    _id: string;
    name: string;
    action: string;
    affectedUser: string;
    details: string;
    timestamp: number;
}

interface LogTableProps {
    logs: Log[];
}

type SortField = "timestamp" | "action";
type SortDirection = "asc" | "desc";

export const LogTable = ({ logs }: LogTableProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("timestamp");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [currentPage, setCurrentPage] = useState(1);

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
            return searchTerm === "" ||
                log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.affectedUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase());
        });

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case "timestamp":
                    comparison = a.timestamp - b.timestamp;
                    break;
                case "action":
                    comparison = a.action.localeCompare(b.action);
                    break;
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });

        return filtered;
    };

    const getPaginationInfo = (logs: Log[]) => {
        const entriesPerPage = 10;
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

    const filteredAndSortedLogs = filterAndSortLogs();
    const { totalEntries, totalPages, startEntry, endEntry, paginatedLogs } = getPaginationInfo(filteredAndSortedLogs);

    return (
        <div className="px-6 mt-4">
            <div className="mb-4 flex gap-4">
                <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        <FaSearch />
                    </div>
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                    <thead>
                        <tr className="bg-[#B54A4A]">
                            <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                Name
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
                            <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                Affected User
                            </th>
                            <th className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider">
                                Details
                            </th>
                            <th 
                                className="px-6 py-3 border-b text-center text-xs font-medium text-white uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort("timestamp")}
                            >
                                <div className="flex items-center justify-center">
                                    Time
                                    <span className="ml-1">{getSortIcon("timestamp")}</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLogs.map((log, index) => (
                            <tr key={log._id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {log.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        log.action === "Delete User" 
                                            ? 'bg-red-100 text-red-800'
                                            : log.action === "Edit User"
                                            ? 'bg-blue-100 text-blue-800'
                                            : log.action === "Reset Password"
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-green-100 text-green-800'
                                    }`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {log.affectedUser}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {log.details}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
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
    );
}; 