"use client";

import { useState, use } from "react";
import { Navbar } from "../../components/navbar";
import { FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import GroupsTable from "./components/GroupsTable";
import { Group, User } from "./components/types";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { Notification } from "../../../../components/Notification";
import { SuccessBanner } from "../../../../components/SuccessBanner";
import GroupActionConfirmation from "./components/GroupActionConfirmation";

interface AdviserGroupsPageProps {
    params: Promise<{ adviserId: string }>
};

const AdviserGroupsPage = ({ params }: AdviserGroupsPageProps) => {
    const { adviserId } = use(params);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<"name" | "capstoneTitle" | "projectManager">("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    // State for confirmation dialog
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [actionType, setActionType] = useState<'accept' | 'reject'>('accept');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [networkError, setNetworkError] = useState<string | null>(null);

    // State for notifications
    const [notification, setNotification] = useState<{ message: string | null; type: 'error' | 'success' | 'warning' | 'info' }>({
        message: null,
        type: 'success'
    });

    const acceptGroup = useMutation(api.mutations.acceptGroupRequest);
    const rejectGroup = useMutation(api.mutations.rejectGroupRequest);

    // 1. Fetch pending group IDs for this adviser
    const pendingGroupIds: Id<"groupsTable">[] = useQuery(api.fetch.getPendingGroupIdsForAdviser, { adviserId: adviserId as Id<"users"> }) || [];

    // 2. Fetch all groups and users
    const groups = useQuery(api.fetch.getGroups) || [];
    const users = useQuery(api.fetch.getUsers) || [];

    // 3. Build processed groups array
    const processedGroups = pendingGroupIds
        .map(groupId => groups.find((g) => g._id === groupId))
        .filter((g): g is NonNullable<typeof g> => !!g)
        .map(group => {
            const projectManager = users.find((u) => u._id === group.project_manager_id);
            const members = group.member_ids
                .map((memberId: Id<"users">) => users.find((u) => u._id === memberId))
                .filter((u): u is NonNullable<typeof u> => !!u);
            const name = projectManager ? `${projectManager.last_name} et al` : "Unknown Group";
            return {
                _id: group._id.toString(),
                name,
                capstone_title: group.capstone_title,
                projectManager: projectManager ? {
                    _id: projectManager._id.toString(),
                    first_name: projectManager.first_name,
                    last_name: projectManager.last_name,
                    middle_name: projectManager.middle_name
                } : undefined,
                members: members.map(member => ({
                    _id: member._id.toString(),
                    first_name: member.first_name,
                    last_name: member.last_name,
                    middle_name: member.middle_name
                })),
            };
        });

    // Filter groups based on search term
    const filteredGroups = processedGroups.filter(group => {
        const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
        if (searchTerms.length === 0) return true;

        const groupName = group.name?.toLowerCase() || '';
        const capstoneTitle = group.capstone_title?.toLowerCase() || '';
        const projectManager = group.projectManager ? 
            `${group.projectManager.first_name} ${group.projectManager.last_name}`.toLowerCase() : '';
        const memberNames = group.members?.map((member: User) => 
            `${member.first_name} ${member.last_name}`.toLowerCase()
        ).join(' ') || '';

        return searchTerms.every(term =>
            groupName.includes(term) ||
            capstoneTitle.includes(term) ||
            projectManager.includes(term) ||
            memberNames.includes(term)
        );
    });

    // Add sorting logic
    const getSortIcon = (field: typeof sortField) => {
        if (field !== sortField) return <FaSort />;
        return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
    };

    const handleSort = (field: typeof sortField) => {
        if (field === sortField) {
            setSortDirection(prevDirection => prevDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
        // Reset pagination when sort changes
        const paginationResetEvent = new CustomEvent('resetPagination');
        document.dispatchEvent(paginationResetEvent);
    };

    // Sort the filtered groups
    const sortedAndFilteredGroups = filteredGroups.sort((a, b) => {
        let comparison = 0;
        if (sortField === "name") {
            comparison = (a.name || '').localeCompare(b.name || '');
        } else if (sortField === "capstoneTitle") {
            comparison = (a.capstone_title || '').localeCompare(b.capstone_title || '');
        } else if (sortField === "projectManager" && a.projectManager && b.projectManager) {
            const aName = `${a.projectManager.last_name} ${a.projectManager.first_name}`;
            const bName = `${b.projectManager.last_name} ${b.projectManager.first_name}`;
            comparison = aName.localeCompare(bName);
        }
        return sortDirection === "asc" ? comparison : -comparison;
    });

    const handleAccept = async (group: Group) => {
        setSelectedGroup(group);
        setActionType('accept');
        setIsConfirmOpen(true);
        setNetworkError(null);
    };

    const handleReject = async (group: Group) => {
        setSelectedGroup(group);
        setActionType('reject');
        setIsConfirmOpen(true);
        setNetworkError(null);
    };

    const handleConfirmAction = async () => {
        if (!selectedGroup) return;

        setIsSubmitting(true);
        setNetworkError(null);

        try {
            if (actionType === 'accept') {
                await acceptGroup({
                    adviserId: adviserId as Id<"users">,
                    groupId: selectedGroup._id as Id<"groupsTable">
                });
                setNotification({
                    message: `Successfully accepted group "${selectedGroup.capstone_title || selectedGroup.name}"`,
                    type: 'success'
                });
            } else {
                await rejectGroup({
                    adviserId: adviserId as Id<"users">,
                    groupId: selectedGroup._id as Id<"groupsTable">
                });
                setNotification({
                    message: `Successfully rejected group "${selectedGroup.capstone_title || selectedGroup.name}"`,
                    type: 'success'
                });
            }
            setIsConfirmOpen(false);
        } catch (error) {
            setNetworkError(error instanceof Error ? error.message : 'An error occurred');
            setNotification({
                message: `Failed to ${actionType} group: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseConfirmation = () => {
        setIsConfirmOpen(false);
        setSelectedGroup(null);
        setNetworkError(null);
    };

    return ( 
        <div className="min-h-screen bg-gray-50">
            <Navbar adviserId={adviserId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Adviser Groups</h1>
                    <p className="text-muted-foreground">Review and manage groups to be handled</p>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                    <div className="relative">
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
                </div>

                {/* Groups Table */}
                <GroupsTable 
                    groups={sortedAndFilteredGroups}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    getSortIcon={getSortIcon}
                    sortField={sortField}
                />

                {/* Confirmation Dialog */}
                <GroupActionConfirmation
                    group={selectedGroup}
                    isOpen={isConfirmOpen}
                    onClose={handleCloseConfirmation}
                    onConfirm={handleConfirmAction}
                    isSubmitting={isSubmitting}
                    networkError={networkError}
                    action={actionType}
                />

                {/* Notifications */}
                <Notification
                    message={notification.type === 'error' ? notification.message : null}
                    type="error"
                    onClose={() => setNotification({ message: null, type: 'success' })}
                />
                <SuccessBanner
                    message={notification.type === 'success' ? notification.message : null}
                    onClose={() => setNotification({ message: null, type: 'success' })}
                />
            </div>
        </div>
    );
}
 
export default AdviserGroupsPage;