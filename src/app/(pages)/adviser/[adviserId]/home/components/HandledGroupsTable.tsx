import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Users } from "lucide-react";
import Link from "next/link";
import { Id } from "../../../../../../../convex/_generated/dataModel";

interface Group {
    _id: Id<"groupsTable">;
    project_manager_id: Id<"users">;
    capstone_title?: string;
}

interface User {
    _id: Id<"users">;
    _creationTime: number;
    clerk_id: string;
    email: string;
    email_verified: boolean;
    first_name: string;
    last_name: string;
    role: number;
    middle_name?: string;
    subrole?: number;
}

interface HandledGroupsTableProps {
    adviserId: Id<"users">;
    groups: Group[];
    projectManagers: User[];
    sortField: "name" | "capstoneTitle";
    sortDirection: "asc" | "desc";
    onSort: (field: "name" | "capstoneTitle") => void;
}

export const HandledGroupsTable = ({
    adviserId,
    groups,
    projectManagers,
    sortField,
    sortDirection,
    onSort
}: HandledGroupsTableProps) => {
    const getSortIcon = (field: "name" | "capstoneTitle") => {
        if (sortField !== field) return <FaSort className="text-gray-400" />;
        return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
    };

    // Sort the groups based on the current sort field and direction
    const sortedGroups = [...groups].sort((a, b) => {
        let comparison = 0;
        if (sortField === "name") {
            const aPM = projectManagers.find(pm => pm._id === a.project_manager_id);
            const bPM = projectManagers.find(pm => pm._id === b.project_manager_id);
            const aName = aPM ? `${aPM.last_name} et al` : "Unnamed Group";
            const bName = bPM ? `${bPM.last_name} et al` : "Unnamed Group";
            comparison = aName.localeCompare(bName);
        } else if (sortField === "capstoneTitle") {
            comparison = (a.capstone_title || '').localeCompare(b.capstone_title || '');
        }
        return sortDirection === "asc" ? comparison : -comparison;
    });

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Handled Groups</h2>
                    <Link 
                        href={`/adviser/${adviserId}/approval/groups`}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Users className="w-5 h-5" />
                        View Group Requests
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th 
                                    className="text-left py-3 px-4 font-medium text-gray-600 cursor-pointer"
                                    onClick={() => onSort("name")}
                                >
                                    <div className="flex items-center">
                                        Group Name
                                        <span className="ml-1">{getSortIcon("name")}</span>
                                    </div>
                                </th>
                                <th 
                                    className="text-left py-3 px-4 font-medium text-gray-600 cursor-pointer"
                                    onClick={() => onSort("capstoneTitle")}
                                >
                                    <div className="flex items-center">
                                        Capstone Title
                                        <span className="ml-1">{getSortIcon("capstoneTitle")}</span>
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 font-medium text-gray-600">Progress</th>
                                <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">
                                        No groups handled at this time. Check group requests to start handling groups.
                                    </td>
                                </tr>
                            ) : (
                                sortedGroups.map((group) => {
                                    const projectManager = projectManagers.find(
                                        pm => pm._id === group.project_manager_id
                                    );
                                    const groupName = projectManager 
                                        ? `${projectManager.last_name} et al`
                                        : "Unnamed Group";
                                    
                                    return (
                                        <tr key={group._id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4">{groupName}</td>
                                            <td className="py-3 px-4">{group.capstone_title || "No title yet"}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-full max-w-[200px] bg-gray-200 rounded-full h-2.5">
                                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: "0%" }}></div>
                                                    </div>
                                                    <span className="text-sm text-gray-600">0%</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button className="text-blue-600 hover:text-blue-800">
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}; 