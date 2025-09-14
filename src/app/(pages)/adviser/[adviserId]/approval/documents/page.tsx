"use client";

import { useState, use, useEffect } from "react";
import { Navbar } from "../../components/navbar";
import { FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import DocumentsTable from "./components/DocumentsTable";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";

interface AdviserDocsPageProps {
  params: Promise<{ adviserId: string }>;
}

const AdviserDocsPage = ({ params }: AdviserDocsPageProps) => {
  const { adviserId } = use(params);
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<
    "name" | "capstoneTitle" | "documentCount"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [initialGroupId, setInitialGroupId] = useState<string | null>(groupId);

  // Use the backend query instead of mock data
  const result = useQuery(api.fetch.getAdviserDocuments, {
    adviserId: adviserId as Id<"users">,
    searchTerm,
    pageSize,
    pageNumber: currentPage,
    sortField,
    sortDirection,
  });

  // Clear the initial group ID after first load to prevent re-expanding
  useEffect(() => {
    if (result && initialGroupId) {
      const timer = setTimeout(() => {
        setInitialGroupId(null);
      }, 1000); // Clear after 1 second to allow the table to process the initial expansion
      return () => clearTimeout(timer);
    }
  }, [result, initialGroupId]);

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection((prevDirection) =>
        prevDirection === "asc" ? "desc" : "asc",
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Handle loading and error states
  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar adviserId={adviserId} />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Group Documents</h1>
            <p className="text-muted-foreground">
              Review and manage documents from all groups
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
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Documents Table */}
          <DocumentsTable
            groups={[]}
            onSort={handleSort}
            getSortIcon={(field) => {
              if (field !== sortField) return <FaSort />;
              return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
            }}
            currentPage={currentPage}
            totalPages={0}
            totalCount={0}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            status="loading"
            hasResults={false}
            currentUserId={adviserId as Id<"users">}
            initialExpandedGroupId={initialGroupId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar adviserId={adviserId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Group Documents</h1>
          <p className="text-muted-foreground">
            Review and manage documents from all groups
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
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Documents Table */}
        <DocumentsTable
          groups={result.groups}
          onSort={handleSort}
          getSortIcon={(field) => {
            if (field !== sortField) return <FaSort />;
            return sortDirection === "asc" ? <FaSortUp /> : <FaSortDown />;
          }}
          currentPage={currentPage}
          totalPages={result.totalPages}
          totalCount={result.totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          status={result.status as "idle" | "loading" | "error"}
          hasResults={result.hasResults}
          currentUserId={adviserId as Id<"users">}
          initialExpandedGroupId={initialGroupId}
        />
      </div>
    </div>
  );
};

export default AdviserDocsPage;
