import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
} from "react-icons/fa";
import { Users } from "lucide-react";
import Link from "next/link";
import { Id, Doc } from "../../../../../../../convex/_generated/dataModel";
import { useState } from "react";
import GroupMembersModal from "./GroupMembersModal";

interface Group {
  _id: Id<"groupsTable">;
  project_manager_id: Id<"users">;
  member_ids?: Id<"users">[];
  capstone_title?: string;
  capstone_type?: number; // 0 = CP1, 1 = CP2
  documentStatuses: Doc<"documentStatus">[];
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
  groupMembers: User[];
  sortField: "name" | "capstoneTitle";
  sortDirection: "asc" | "desc";
  onSort: (field: "name" | "capstoneTitle") => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  status: "idle" | "loading" | "error";
  hasResults: boolean;
}

export const HandledGroupsTable = ({
  adviserId,
  groups,
  projectManagers,
  groupMembers,
  sortField,
  sortDirection,
  onSort,
  searchTerm,
  onSearchChange,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalCount,
  status,
  hasResults,
}: HandledGroupsTableProps) => {
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    _id: string;
    capstone_title?: string;
    projectManager?: User;
    members?: User[];
  } | null>(null);
  const handleViewMembers = (group: Group) => {
    const projectManager = projectManagers.find(
      (pm) => pm._id === group.project_manager_id,
    );
    const members = groupMembers.filter((member) =>
      group.member_ids?.includes(member._id),
    );

    setSelectedGroup({
      _id: group._id,
      capstone_title: group.capstone_title,
      projectManager,
      members,
    });
    setShowMembersModal(true);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
    setSelectedGroup(null);
  };

  const getSortIcon = (field: "name" | "capstoneTitle") => {
    if (sortField !== field) return <FaSort className="text-gray-400" />;
    return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  // Groups are already sorted by the backend, no need for client-side sorting
  const sortedGroups = groups;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Groups</h2>
      <div className="flex items-center justify-between mb-4">
        {/* Search Bar */}
        <div className="flex-1 mr-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <Link
          href={`/adviser/${adviserId}/approval/groups`}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Users className="w-5 h-5" />
          View Group Requests
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b !border-gray-200">
                  <th
                    className="text-left pt-1 pb-3 px-4 font-medium text-gray-600 cursor-pointer"
                    onClick={() => onSort("name")}
                  >
                    <div className="flex items-center">
                      Group Name
                      <span className="ml-1">{getSortIcon("name")}</span>
                    </div>
                  </th>
                  <th
                    className="text-left pt-1 pb-3 px-4 font-medium text-gray-600 cursor-pointer"
                    onClick={() => onSort("capstoneTitle")}
                  >
                    <div className="flex items-center">
                      Capstone Title
                      <span className="ml-1">
                        {getSortIcon("capstoneTitle")}
                      </span>
                    </div>
                  </th>
                  <th className="text-center pt-1 pb-3 px-4 font-medium text-gray-600">
                    Group Members
                  </th>
                  <th className="text-center pt-1 pb-3 px-4 font-medium text-gray-600">
                    Progress
                  </th>
                  <th
                    className="text-center pt-1 pb-3 px-4 font-medium text-gray-600"
                    style={{ width: "5.5rem" }}
                  >
                    Submitted
                  </th>
                  <th className="text-center pt-1 pb-3 px-4 font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {status === "loading" && (
                  <tr>
                    <td
                      colSpan={6}
                      className="pt-7 pb-1 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                )}
                {status === "error" && (
                  <tr>
                    <td
                      colSpan={6}
                      className="pt-7 pb-1 text-center text-red-500"
                    >
                      An error occurred while loading groups. Please try again.
                    </td>
                  </tr>
                )}
                {status === "idle" && !hasResults && (
                  <tr>
                    <td
                      colSpan={6}
                      className="pt-7 pb-1 text-center text-gray-500"
                    >
                      No groups handled at this time. Check group requests to
                      start handling groups.
                    </td>
                  </tr>
                )}
                {sortedGroups.map((group) => {
                  const projectManager = projectManagers.find(
                    (pm) => pm._id === group.project_manager_id,
                  );
                  const groupName = projectManager
                    ? `${projectManager.last_name} et al`
                    : "Unnamed Group";

                  const totalDocuments = group.documentStatuses.length;
                  const statusCounts = {
                    approved: group.documentStatuses.filter(
                      (d) => d.review_status === 2,
                    ).length,
                    rejected: group.documentStatuses.filter(
                      (d) => d.review_status === 3,
                    ).length,
                    in_review: group.documentStatuses.filter(
                      (d) => d.review_status === 1,
                    ).length,
                    not_submitted: group.documentStatuses.filter(
                      (d) => d.review_status === 0,
                    ).length,
                  };

                  const progress = {
                    approved:
                      totalDocuments > 0
                        ? (statusCounts.approved / totalDocuments) * 100
                        : 0,
                    rejected:
                      totalDocuments > 0
                        ? (statusCounts.rejected / totalDocuments) * 100
                        : 0,
                    in_review:
                      totalDocuments > 0
                        ? (statusCounts.in_review / totalDocuments) * 100
                        : 0,
                    not_submitted:
                      totalDocuments > 0
                        ? (statusCounts.not_submitted / totalDocuments) * 100
                        : 0,
                  };

                  return (
                    <tr
                      key={group._id}
                      className="border-b !border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">{groupName}</td>
                      <td className="py-3 px-4">
                        {group.capstone_title || "No title yet"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleViewMembers(group)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          disabled={
                            !group.member_ids || group.member_ids.length === 0
                          }
                        >
                          <FaUser className="mr-1" size={12} />
                          {(() => {
                            const memberCount =
                              (group.member_ids?.length || 0) + 1; // +1 for project manager
                            return memberCount > 1
                              ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
                              : "No members";
                          })()}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-full max-w-[200px] bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
                            <div
                              className="bg-green-500 h-2.5"
                              style={{ width: `${progress.approved}%` }}
                            ></div>
                            <div
                              className="bg-red-500 h-2.5"
                              style={{ width: `${progress.rejected}%` }}
                            ></div>
                            <div
                              className="bg-yellow-400 h-2.5"
                              style={{ width: `${progress.in_review}%` }}
                            ></div>
                            <div
                              className="bg-gray-300 h-2.5"
                              style={{ width: `${progress.not_submitted}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {statusCounts.approved} / {totalDocuments}
                          </span>
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        style={{ width: "5.5rem" }}
                      >
                        <span>{statusCounts.in_review}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/adviser/${adviserId}/approval/documents?groupId=${group._id}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="min-w-full flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">
              {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>
            {" - "}
            <span className="font-medium">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>
            {" of "}
            <span className="font-medium">{totalCount}</span>
            {" entries"}
          </p>
          <div className="h-6 w-px bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
            onClick={() => onPageChange(currentPage - 1)}
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
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md ${
              currentPage === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Group Members Modal */}
      <GroupMembersModal
        isOpen={showMembersModal}
        onClose={handleCloseMembersModal}
        group={selectedGroup}
      />
    </div>
  );
};
