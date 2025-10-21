"use client";

import { Navbar } from "../components/navbar";
import { useState, use, useMemo } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { User, Group } from "./components/types";
import AddGroupForm from "./components/AddGroupForm";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import GroupsTable, { GRADE_FILTERS } from "./components/GroupsTable";
import EditGroupForm from "./components/EditGroupForm";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";

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
  const { addBanner } = useBannerManager();

  // State management
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState<Group | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed networkError state - using notification banner instead
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
  const [capstoneSortDirection, setCapstoneSortDirection] = useState<
    "asc" | "desc" | "none"
  >("none");

  // Applied filters for backend query (only change when filters are actually saved)
  const [appliedCapstoneFilter, setAppliedCapstoneFilter] = useState<
    (typeof CAPSTONE_FILTERS)[keyof typeof CAPSTONE_FILTERS]
  >(CAPSTONE_FILTERS.ALL);
  const [appliedGradeFilters, setAppliedGradeFilters] = useState<
    (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][]
  >([]);

  const [isDeleting, setIsDeleting] = useState(false);

  // Utility function to handle common error patterns
  const handleError = (
    error: unknown,
    operation: "add" | "edit" | "delete",
  ) => {
    const errorMessage = getErrorMessage(
      error,
      ErrorContexts[
        operation === "add"
          ? "addGroup"
          : operation === "edit"
            ? "editGroup"
            : "deleteGroup"
      ](),
    );
    addBanner({
      message: errorMessage,
      type: "error",
      onClose: () => {},
      autoClose: true,
    });
  };

  const queryParams = useMemo(() => {
    // Determine which sort to use
    let finalSortField = sortField;
    let finalSortDirection = sortDirection;

    // If capstone sort is active (not 'none'), use it instead of regular sort
    if (capstoneSortDirection !== "none") {
      finalSortField = "capstoneTitle";
      finalSortDirection = capstoneSortDirection;
    }

    return {
      searchTerm,
      pageSize,
      pageNumber: currentPage,
      sortField: finalSortField,
      sortDirection: finalSortDirection,
      capstoneFilter: appliedCapstoneFilter,
      gradeFilters: appliedGradeFilters,
    };
  }, [
    searchTerm,
    pageSize,
    currentPage,
    sortField,
    sortDirection,
    capstoneSortDirection,
    appliedCapstoneFilter,
    appliedGradeFilters,
  ]);

  // Fetch all groups for frontend filtering and pagination
  const allGroupsQuery = useQuery(api.fetch.searchGroups, {
    ...queryParams,
    pageSize: 10000, // Get all groups for frontend pagination
    pageNumber: 1,
  });

  // Get users for forms
  const users = useQuery(api.fetch.getUsers) || [];

  // Apply frontend pagination to groups
  const searchResult = useMemo(() => {
    // If query is still loading, return loading state
    if (allGroupsQuery === undefined) {
      return {
        groups: [],
        totalCount: 0,
        totalPages: 0,
        status: "loading",
        hasResults: false,
      };
    }

    const data = allGroupsQuery;

    // Apply frontend pagination
    const totalFilteredCount = data.groups.length;
    const totalFilteredPages = Math.ceil(totalFilteredCount / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedGroups = data.groups.slice(startIndex, endIndex);

    return {
      ...data,
      groups: paginatedGroups,
      totalCount: totalFilteredCount,
      totalPages: totalFilteredPages,
      hasResults: totalFilteredCount > 0,
    };
  }, [allGroupsQuery, pageSize, currentPage]);

  // Get all groups for proper filtering (not just current page)
  const allGroups = allGroupsQuery?.groups || [];

  // Filter project managers (role 0, subrole 1, not already a project manager)
  const usedManagerIds = new Set(
    allGroups.map((g) => g.project_manager_id) || [],
  );
  const projectManagers = users.filter(
    (u) => u && u.role === 0 && u.subrole === 1 && !usedManagerIds.has(u._id),
  );

  // Filter members (role 0, subrole 0, not already in a group)
  const usedMemberIds = new Set(allGroups.flatMap((g) => g.member_ids) || []);
  const members = users.filter(
    (u) => u && u.role === 0 && u.subrole === 0 && !usedMemberIds.has(u._id),
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
    // If capstone sort is active, reset it when clicking other sort fields
    if (capstoneSortDirection !== "none" && field !== "capstoneTitle") {
      setCapstoneSortDirection("none");
    }

    if (field === "capstoneTitle") {
      // Handle capstone title sorting
      if (capstoneSortDirection === "none") {
        setCapstoneSortDirection("asc");
      } else if (capstoneSortDirection === "asc") {
        setCapstoneSortDirection("desc");
      } else {
        setCapstoneSortDirection("none");
      }
    } else if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleGradeFilterChange = (
    filters: (typeof GRADE_FILTERS)[keyof typeof GRADE_FILTERS][],
  ) => {
    setAppliedGradeFilters(filters);
    setCurrentPage(1);
  };

  const handleCapstoneSortApply = (direction: "asc" | "desc" | "none") => {
    if (direction === "none") {
      setCapstoneSortDirection("none");
      setSortField("name");
      setSortDirection("asc");
    } else {
      setCapstoneSortDirection(direction);
      setSortField("capstoneTitle");
      setSortDirection(direction);
    }
    setCurrentPage(1);
  };

  const handleAddGroup = async (formData: {
    projectManager: string;
    members: string[];
    adviser: string | null;
    capstoneTitle: string;
    capstoneType: number;
  }) => {
    try {
      setIsSubmitting(true);
      // Call the mutation
      await createGroup({
        project_manager_id: formData.projectManager as Id<"users">,
        member_ids: formData.members.map((id) => id as Id<"users">),
        adviser_id: formData.adviser
          ? (formData.adviser as Id<"users">)
          : undefined,
        capstone_title: formData.capstoneTitle,
        capstone_type: formData.capstoneType,
        instructorId: instructorId as Id<"users">,
      });
      setIsAddingGroup(false);
      addBanner({
        message: "Group added successfully!",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
    } catch (error) {
      handleError(error, "add");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGroup = async (formData: {
    projectManager: string;
    members: string[];
    adviser: string | null;
    capstoneTitle: string;
    capstoneType: number;
    grade: number;
  }) => {
    if (!isEditingGroup) return;

    try {
      setIsSubmitting(true);
      await updateGroup({
        groupId: isEditingGroup._id,
        project_manager_id: formData.projectManager as Id<"users">,
        member_ids: formData.members.map((id) => id as Id<"users">),
        adviser_id: formData.adviser
          ? (formData.adviser as Id<"users">)
          : undefined,
        capstone_title: formData.capstoneTitle,
        capstone_type: formData.capstoneType,
        grade: formData.grade,
        instructorId: instructorId as Id<"users">,
      });
      setIsEditingGroup(null);
      addBanner({
        message: "Group updated successfully!",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
    } catch (error) {
      handleError(error, "edit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    try {
      setIsSubmitting(true);
      setIsDeleting(true);
      await deleteGroup({
        groupId: group._id,
        instructorId: instructorId as Id<"users">,
      });
      addBanner({
        message: "Group deleted successfully!",
        type: "success",
        onClose: () => {},
        autoClose: true,
      });
    } catch (error) {
      handleError(error, "delete");
    } finally {
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  };

  // Helper function to get valid status
  const getStatus = () => {
    if (allGroupsQuery === undefined) return "loading";
    if (searchResult?.status === "error") return "error";
    return "idle";
  };

  // Process groups to match Group type
  const processedGroups: Group[] =
    searchResult?.groups.map((group) => {
      const projectManager = group.project_manager_id
        ? users.find((u) => u && u._id === group.project_manager_id)
        : undefined;
      return {
        ...group,
        name: projectManager
          ? `${projectManager.last_name} et al`
          : "Unknown Group",
        projectManager,
        adviser: group.adviser_id
          ? users.find((u) => u && u._id === group.adviser_id)
          : undefined,
        members: group.member_ids
          .map((id) => users.find((u) => u && u._id === id))
          .filter((u): u is User => !!u),
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

        {/* Groups Table */}
        <GroupsTable
          groups={processedGroups}
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
          sortDirection={
            capstoneSortDirection !== "none"
              ? capstoneSortDirection
              : sortDirection
          }
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          status={getStatus()}
          hasResults={searchResult?.hasResults || false}
          onGradeFilterChange={handleGradeFilterChange}
          isDeleting={isDeleting}
          capstoneFilter={appliedCapstoneFilter}
          setCapstoneFilter={setAppliedCapstoneFilter}
          capstoneSortDirection={capstoneSortDirection}
          onCapstoneTypeFilterChange={(filters) => {
            // Handle capstone type filter changes
            console.log("Capstone type filters changed:", filters);
          }}
          setCapstoneSortDirection={setCapstoneSortDirection}
          onCapstoneSortApply={handleCapstoneSortApply}
          isModalOpen={isAddingGroup || !!isEditingGroup}
        />

        {/* Add Group Form */}
        <AddGroupForm
          isOpen={isAddingGroup}
          onClose={() => setIsAddingGroup(false)}
          onSubmit={handleAddGroup}
          isSubmitting={isSubmitting}
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
          members={
            isEditingGroup
              ? [
                  ...isEditingGroup.member_ids
                    .map((id) => users.find((u) => u && u._id === id))
                    .filter((user): user is User => !!user),
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
