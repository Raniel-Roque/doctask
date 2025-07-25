"use client";

import { useState, use } from "react";
import { Navbar } from "../../components/navbar";
import { FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import GroupsTable from "./components/GroupsTable";
import { Group } from "./components/types";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import GroupActionConfirmation from "./components/GroupActionConfirmation";

interface AdviserGroupsPageProps {
  params: Promise<{ adviserId: string }>;
}

const AdviserGroupsPage = ({ params }: AdviserGroupsPageProps) => {
  const { adviserId } = use(params);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<
    "name" | "capstoneTitle" | "projectManager"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // State for confirmation dialog
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<"accept" | "reject">("accept");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed networkError state - using notification banner instead

  // State for notifications
  const [notification, setNotification] = useState<{
    message: string | null;
    type: "error" | "success" | "warning" | "info";
  } | null>(null);

  const acceptGroup = useMutation(api.mutations.acceptGroupRequest);
  const rejectGroup = useMutation(api.mutations.rejectGroupRequest);

  // Fetch groups with search, pagination, and sorting
  const result = useQuery(api.fetch.getPendingGroupIdsForAdviser, {
    adviserId: adviserId as Id<"users">,
    searchTerm,
    pageSize,
    pageNumber: currentPage,
    sortField,
    sortDirection,
  });

  // Transform the result to match the Group type
  const transformedGroups: Group[] = (result?.groups || []).map((group) => ({
    _id: group._id.toString(),
    name: group.name,
    capstone_title: group.capstone_title,
    projectManager: group.projectManager
      ? {
          _id: group.projectManager._id.toString(),
          first_name: group.projectManager.first_name,
          last_name: group.projectManager.last_name,
          middle_name: group.projectManager.middle_name,
        }
      : undefined,
    members: group.members?.map((member) => ({
      _id: member._id.toString(),
      first_name: member.first_name,
      last_name: member.last_name,
      middle_name: member.middle_name,
    })),
  }));

  const { totalCount = 0, totalPages = 0, hasResults = false } = result || {};
  const status: "idle" | "loading" | "error" =
    result === undefined ? "loading" : (result.status as "idle" | "error");

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection((prevDirection) =>
        prevDirection === "asc" ? "desc" : "asc",
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sort changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleAccept = async (group: Group) => {
    setSelectedGroup(group);
    setActionType("accept");
    setIsConfirmOpen(true);
  };

  const handleReject = async (group: Group) => {
    setSelectedGroup(group);
    setActionType("reject");
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedGroup) return;

    setIsSubmitting(true);

    try {
      if (actionType === "accept") {
        await acceptGroup({
          adviserId: adviserId as Id<"users">,
          groupId: selectedGroup._id as Id<"groupsTable">,
        });
        setNotification({
          message: `Successfully accepted group "${selectedGroup.capstone_title || selectedGroup.name}"`,
          type: "success",
        });
      } else {
        await rejectGroup({
          adviserId: adviserId as Id<"users">,
          groupId: selectedGroup._id as Id<"groupsTable">,
        });
        setNotification({
          message: `Successfully rejected group "${selectedGroup.capstone_title || selectedGroup.name}"`,
          type: "success",
        });
      }
      setIsConfirmOpen(false);
    } catch (error) {
      setNotification({
        message: `Failed to ${actionType} group: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseConfirmation = () => {
    setIsConfirmOpen(false);
    setSelectedGroup(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar adviserId={adviserId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Adviser Groups</h1>
          <p className="text-muted-foreground">
            Review and manage groups to be handled
          </p>
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when search changes
              }}
            />
          </div>
        </div>

        {/* Groups Table */}
        <GroupsTable
          groups={transformedGroups}
          onAccept={handleAccept}
          onReject={handleReject}
          sortDirection={sortDirection}
          onSort={handleSort}
          getSortIcon={(field) => {
            if (field !== sortField) return <FaSort />;
            return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
          }}
          sortField={sortField}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          status={status}
          hasResults={hasResults}
        />

        {/* Confirmation Dialog */}
        <GroupActionConfirmation
          group={selectedGroup}
          isOpen={isConfirmOpen}
          onClose={handleCloseConfirmation}
          onConfirm={handleConfirmAction}
          isSubmitting={isSubmitting}
          networkError={null}
          action={actionType}
        />

        {/* Notifications */}
        <NotificationBanner
          message={notification?.message || ""}
          type={notification?.type || "success"}
          onClose={() => {
            setNotification(null);
          }}
        />
      </div>
    </div>
  );
};

export default AdviserGroupsPage;
