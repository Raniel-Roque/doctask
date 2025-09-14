"use client";

import { useState, use } from "react";
import { Navbar } from "../components/navbar";
import { api } from "../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Users } from "lucide-react";
import { CopyButton } from "./components/copy-button";
import { HandledGroupsTable } from "./components/HandledGroupsTable";

interface AdviserHomePageProps {
  params: Promise<{ adviserId: string }>;
}

const AdviserHomePage = ({ params }: AdviserHomePageProps) => {
  const { adviserId } = use(params);
  const [sortField, setSortField] = useState<"name" | "capstoneTitle">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Fetch adviser data
  const adviser = useQuery(api.fetch.getUserById, {
    id: adviserId as Id<"users">,
  });

  const adviserCode = useQuery(api.fetch.getAdviserCode, {
    adviserId: adviserId as Id<"users">,
  });

  const handledGroupsData = useQuery(api.fetch.getHandledGroupsWithProgress, {
    adviserId: adviserId as Id<"users">,
    sortField,
    sortDirection,
    pageSize,
    pageNumber: currentPage,
    searchTerm,
  });

  const adviserGroups = handledGroupsData?.groups || [];
  const projectManagers = handledGroupsData?.projectManagers || [];
  const groupMembers = handledGroupsData?.groupMembers || [];
  const totalCount = handledGroupsData?.totalCount || 0;
  const totalPages = handledGroupsData?.totalPages || 1;

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection((prevDirection) =>
        prevDirection === "asc" ? "desc" : "asc",
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when search changes
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar adviserId={adviserId} />
      <div className="container mx-auto px-4 pt-8 pb-2">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Welcome Back, {adviser?.first_name ?? "User"}!
          </h1>
          <p className="text-muted-foreground">Adviser Overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Groups Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Groups Handled
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {adviserGroups.length}
                </h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Total Requests Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Group Requests
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {adviserCode?.requests_group_ids?.length ?? 0}
                </h3>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Adviser Code Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  Your Adviser Code
                  {adviserCode?.code && (
                    <span className="align-middle ml-1">
                      <CopyButton code={adviserCode.code} />
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold mt-1">
                    {adviserCode?.code ?? "N/A"}
                  </h3>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Groups Table */}
      <div className="container mx-auto px-4 pb-8">
        <HandledGroupsTable
          adviserId={adviserId as Id<"users">}
          groups={adviserGroups}
          projectManagers={projectManagers}
          groupMembers={groupMembers}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          status={handledGroupsData === undefined ? "loading" : "idle"}
          hasResults={adviserGroups.length > 0}
        />
      </div>
    </div>
  );
};

export default AdviserHomePage;
