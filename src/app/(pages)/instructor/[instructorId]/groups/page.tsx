"use client";

import { Navbar } from "../components/navbar";
import { useState, use, useEffect, useMemo } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { User, Group } from "./components/types";
import AddGroupForm from "./components/AddGroupForm";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import GroupsTable, { GRADE_FILTERS } from "./components/GroupsTable";
import EditGroupForm from "./components/EditGroupForm";

// Filter constants
const CAPSTONE_FILTERS = {
  ALL: "All Capstone Titles",
  WITH_TITLE: "With Capstone Title",
  WITHOUT_TITLE: "Without Capstone Title",
} as const;

interface GroupsPageProps {
  params: Promise<{ instructorId: string }>;
}

const GroupsPage = ({ params }: GroupsPageProps) => {
  const { instructorId } = use(params);

  // State management
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState<Group | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("groupsPageSize")) || 5;
    }
    return 5;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Applied filters for backend query (only change when filters are actually saved)
  const [appliedCapstoneFilter, setAppliedCapstoneFilter] = useState<
    (typeof CAPSTONE_FILTERS)[keyof typeof CAPSTONE_FILTERS]
  >(CAPSTONE_FILTERS.ALL);
  const [appliedAdviserFilters, setAppliedAdviserFilters] = useState<string[]>([]);
  const [appliedGradeFilters, setAppliedGradeFilters] = useState<(typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][]>([]);
  
  const [isDeleting, setIsDeleting] = useState(false);

  // Memoize query parameters to prevent unnecessary re-renders during temporary filter selections
  const queryParams = useMemo(() => ({
    searchTerm,
    pageSize,
    pageNumber: currentPage,
    sortField,
    sortDirection,
    capstoneFilter: appliedCapstoneFilter,
    adviserFilters: appliedAdviserFilters,
    gradeFilters: appliedGradeFilters,
  }), [searchTerm, pageSize, currentPage, sortField, sortDirection, appliedCapstoneFilter, appliedAdviserFilters, appliedGradeFilters]);

  // Fetch groups data with search and pagination
  const searchResult = useQuery(api.fetch.searchGroups, queryParams);

  // Get users for forms
  const users = useQuery(api.fetch.getUsers) || [];

  // Filter project managers (role 0, subrole 1, not already a project manager)
  const usedManagerIds = new Set(
    searchResult?.groups.map((g) => g.project_manager_id) || [],
  );
  const projectManagers = users.filter(
    (u) => u.role === 0 && u.subrole === 1 && !usedManagerIds.has(u._id),
  );

  // Filter members (role 0, subrole 0, not already in a group)
  const usedMemberIds = new Set(
    searchResult?.groups.flatMap((g) => g.member_ids) || [],
  );
  const members = users.filter(
    (u) => u.role === 0 && u.subrole === 0 && !usedMemberIds.has(u._id),
  );

  // Filter advisers (role 1)
  const advisers = users.filter((u) => u.role === 1);

  // Handlers
  const createGroup = useMutation(api.mutations.createGroup);
  const updateGroup = useMutation(api.mutations.updateGroup);
  const deleteGroup = useMutation(api.mutations.deleteGroup);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    localStorage.setItem("groupsPageSize", newSize.toString());
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleCapstoneFilterChange = (
    filter: (typeof CAPSTONE_FILTERS)[keyof typeof CAPSTONE_FILTERS],
  ) => {
    setAppliedCapstoneFilter(filter);
    setCurrentPage(1);
  };

  const handleAdviserFilterChange = (filters: string[]) => {
    setAppliedAdviserFilters(filters);
    setCurrentPage(1);
  };

  const handleGradeFilterChange = (filters: (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][]) => {
    setAppliedGradeFilters(filters);
    setCurrentPage(1);
  };

  const handleAddGroup = async (formData: {
    projectManager: string;
    members: string[];
    adviser: string | null;
    capstoneTitle: string;
  }) => {
    try {
      setIsSubmitting(true);
      setNetworkError(null);
      // Call the mutation
      await createGroup({
        project_manager_id: formData.projectManager as Id<"users">,
        member_ids: formData.members.map((id) => id as Id<"users">),
        adviser_id: formData.adviser
          ? (formData.adviser as Id<"users">)
          : undefined,
        capstone_title: formData.capstoneTitle,
        instructorId: instructorId as Id<"users">,
      });
      setIsAddingGroup(false);
      setNotification({
        type: "success",
        message: "Group added successfully!",
      });
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setNetworkError("Request timed out. Please try again.");
        } else if (error.message.includes("Network error")) {
          setNetworkError(
            "Network error - please check your internet connection",
          );
        } else if (error.message.includes("already exists")) {
          setNetworkError("A group with these members already exists");
        } else if (error.message.includes("not found")) {
          setNetworkError("One or more selected users could not be found");
        } else if (error.message.includes("permission denied")) {
          setNetworkError("You don't have permission to create this group");
        } else if (error.message.includes("ArgumentValidationError")) {
          setNetworkError("Please check your input and try again");
        } else {
          setNetworkError("Failed to create group. Please try again.");
        }
        setNotification({
          type: "error",
          message: error.message || "Failed to create group.",
        });
      } else {
        setNetworkError("An unexpected error occurred. Please try again.");
        setNotification({
          type: "error",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGroup = async (formData: {
    projectManager: string;
    members: string[];
    adviser: string | null;
    capstoneTitle: string;
    grade: number;
  }) => {
    if (!isEditingGroup) return;

    try {
      setIsSubmitting(true);
      setNetworkError(null);
      await updateGroup({
        groupId: isEditingGroup._id,
        project_manager_id: formData.projectManager as Id<"users">,
        member_ids: formData.members.map((id) => id as Id<"users">),
        adviser_id: formData.adviser
          ? (formData.adviser as Id<"users">)
          : undefined,
        capstone_title: formData.capstoneTitle,
        grade: formData.grade,
        instructorId: instructorId as Id<"users">,
      });
      setIsEditingGroup(null);
      setNotification({
        type: "success",
        message: "Group updated successfully!",
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setNetworkError("Request timed out. Please try again.");
        } else if (error.message.includes("Network error")) {
          setNetworkError(
            "Network error - please check your internet connection",
          );
        } else if (error.message.includes("already exists")) {
          setNetworkError("A group with these members already exists");
        } else if (error.message.includes("not found")) {
          setNetworkError("One or more selected users could not be found");
        } else if (error.message.includes("permission denied")) {
          setNetworkError("You don't have permission to update this group");
        } else if (error.message.includes("ArgumentValidationError")) {
          setNetworkError("Please check your input and try again");
        } else {
          setNetworkError("Failed to update group. Please try again.");
        }
        setNotification({
          type: "error",
          message: error.message || "Failed to update group.",
        });
      } else {
        setNetworkError("An unexpected error occurred. Please try again.");
        setNotification({
          type: "error",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    try {
      setIsSubmitting(true);
      setIsDeleting(true);
      setNetworkError(null);
      await deleteGroup({
        groupId: group._id,
        instructorId: instructorId as Id<"users">,
      });
      setNotification({
        type: "success",
        message: "Group deleted successfully!",
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setNetworkError("Request timed out. Please try again.");
        } else if (error.message.includes("Network error")) {
          setNetworkError(
            "Network error - please check your internet connection",
          );
        } else if (error.message.includes("not found")) {
          setNetworkError("Group could not be found");
        } else if (error.message.includes("permission denied")) {
          setNetworkError("You don't have permission to delete this group");
        } else {
          setNetworkError("Failed to delete group. Please try again.");
        }
        setNotification({
          type: "error",
          message: error.message || "Failed to delete group.",
        });
      } else {
        setNetworkError("An unexpected error occurred. Please try again.");
        setNotification({
          type: "error",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  };

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Helper function to get valid status
  const getStatus = () => {
    if (!searchResult) return "loading";
    if (searchResult.status === "error") return "error";
    return "idle";
  };

  // Process groups to match Group type
  const processedGroups: Group[] =
    searchResult?.groups.map((group) => {
      const projectManager = group.project_manager_id
        ? users.find((u) => u._id === group.project_manager_id)
        : undefined;
      return {
        ...group,
        name: projectManager
          ? `${projectManager.last_name} et al`
          : "Unknown Group",
        projectManager,
        adviser: group.adviser_id
          ? users.find((u) => u._id === group.adviser_id)
          : undefined,
        members: group.member_ids
          .map((id) => users.find((u) => u._id === id))
          .filter((u): u is User => u !== undefined),
      } as Group;
    }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar instructorId={instructorId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Manage Groups</h1>
          <p className="text-muted-foreground">
            View, create, update, and delete groups.
          </p>
        </div>

        {/* Notification Banner */}
        <NotificationBanner
          message={notification?.message || ""}
          type={notification?.type || "success"}
          onClose={() => setNotification(null)}
        />

        {/* Groups Table */}
        <GroupsTable
          groups={processedGroups}
          advisers={advisers}
          onEdit={(group) => setIsEditingGroup(group)}
          onDelete={handleDeleteGroup}
          onAdd={() => setIsAddingGroup(true)}
          currentPage={currentPage}
          totalPages={searchResult?.totalPages || 1}
          totalCount={searchResult?.totalCount || 0}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          status={getStatus()}
          hasResults={searchResult?.hasResults || false}
          onCapstoneFilterChange={handleCapstoneFilterChange}
          onAdviserFilterChange={handleAdviserFilterChange}
          onGradeFilterChange={handleGradeFilterChange}
          isDeleting={isDeleting}
        />

        {/* Add Group Form */}
        <AddGroupForm
          isOpen={isAddingGroup}
          onClose={() => setIsAddingGroup(false)}
          onSubmit={handleAddGroup}
          isSubmitting={isSubmitting}
          networkError={networkError}
          setNetworkError={setNetworkError}
          projectManagers={projectManagers}
          members={members}
          advisers={advisers}
        />

        {/* Edit Group Form */}
        <EditGroupForm
          isOpen={!!isEditingGroup}
          onClose={() => setIsEditingGroup(null)}
          onSubmit={handleEditGroup}
          isSubmitting={isSubmitting}
          networkError={networkError}
          setNetworkError={setNetworkError}
          members={
            isEditingGroup
              ? [
                  ...isEditingGroup.member_ids
                    .map((id) => users.find((u) => u._id === id))
                    .filter((user): user is User => user !== undefined),
                  ...members,
                ]
              : members
          }
          advisers={advisers}
          group={isEditingGroup}
        />
      </div>
    </div>
  );
};

export default GroupsPage;
