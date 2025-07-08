"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaEye,
  FaStickyNote,
} from "react-icons/fa";
import { User, Group, Document } from "./types";
import { useMutation } from "convex/react";
import { Id } from "../../../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import NotesPopup from "./NotesPopup";

interface DocumentsTableProps {
  groups: Group[];
  onSort: (
    field: "name" | "capstoneTitle" | "projectManager" | "documentCount",
  ) => void;
  getSortIcon: (
    field: "name" | "capstoneTitle" | "projectManager" | "documentCount",
  ) => React.ReactNode;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  status: "idle" | "loading" | "error";
  hasResults: boolean;
  onStatusChange?: (documentId: string, newStatus: number) => void;
  currentUserId: Id<"users">;
  initialExpandedGroupId?: string | null;
}

const DocumentsTable: React.FC<DocumentsTableProps> = ({
  groups,
  onSort,
  getSortIcon,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  status,
  hasResults,
  onStatusChange,
  currentUserId,
  initialExpandedGroupId,
}) => {
  const router = useRouter();
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(
    initialExpandedGroupId || null,
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [notesPopupOpen, setNotesPopupOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    groupId: Id<"groupsTable">;
    documentPart: string;
    documentTitle: string;
  } | null>(null);
  const groupRowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>(
    {},
  );

  // Add Convex mutation
  const updateDocumentStatus = useMutation(api.mutations.updateDocumentStatus);

  // Handle initial expansion and scrolling
  useEffect(() => {
    if (initialExpandedGroupId && groups.length > 0 && status === "idle") {
      setExpandedGroupId(initialExpandedGroupId);

      // Scroll to the group row after a short delay to ensure rendering is complete
      const timer = setTimeout(() => {
        const targetRow = groupRowRefs.current[initialExpandedGroupId];
        if (targetRow) {
          targetRow.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          // Add a highlight effect
          targetRow.classList.add("bg-blue-50", "border-blue-200", "border-2");
          setTimeout(() => {
            targetRow.classList.remove(
              "bg-blue-50",
              "border-blue-200",
              "border-2",
            );
          }, 3000);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [initialExpandedGroupId, groups, status]);

  const toggleExpand = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  const getFullName = (user: User) => {
    return `${user.first_name} ${user.middle_name ? user.middle_name + " " : ""}${user.last_name}`;
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: // not_submitted
        return "bg-gray-100 text-gray-800";
      case 1: // submitted
        return "bg-yellow-100 text-yellow-800";
      case 2: // approved
        return "bg-green-100 text-green-800";
      case 3: // rejected
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Status options for the dropdown
  const statusOptions = [
    { value: "all", label: "STATUS" },
    { value: "0", label: "NOT SUBMITTED" },
    { value: "1", label: "SUBMITTED" },
    { value: "2", label: "APPROVED" },
    { value: "3", label: "REJECTED" },
  ];

  // Documents that should be excluded from the table
  const excludedDocuments = ["title_page", "appendix_a", "appendix_d"];

  // Get all documents except excluded ones
  const getAllDocuments = (documents: Document[]) => {
    return documents.filter((doc) => !excludedDocuments.includes(doc.chapter));
  };

  // Get submitted documents only (status = 1)
  const getSubmittedDocuments = (documents: Document[]) => {
    return documents.filter(
      (doc) => !excludedDocuments.includes(doc.chapter) && doc.status === 1,
    );
  };

  // Filter documents based on selected status
  const filterDocumentsByStatus = (documents: Document[]) => {
    const allDocs = getAllDocuments(documents);
    if (selectedStatus === "all") return allDocs;
    return allDocs.filter((doc) => doc.status === parseInt(selectedStatus));
  };

  // Check if adviser can change document status
  const canChangeStatus = (doc: Document) => {
    // Adviser can only change status if document is submitted (not "not_submitted")
    return doc.status !== 0; // 0 = not_submitted
  };

  const handleStatusChange = async (documentId: string, newStatus: number) => {
    try {
      setUpdatingStatus(documentId);

      // Find the document to get its chapter and group info
      let targetDoc: Document | null = null;
      let targetGroup: Group | null = null;

      for (const group of groups) {
        const doc = group.documents.find((d) => d._id === documentId);
        if (doc) {
          targetDoc = doc;
          targetGroup = group;
          break;
        }
      }

      if (!targetDoc || !targetGroup) {
        throw new Error("Document not found");
      }

      // Call the Convex mutation
      await updateDocumentStatus({
        groupId: targetGroup._id as Id<"groupsTable">,
        documentPart: targetDoc.chapter,
        newStatus,
        userId: currentUserId,
      });

      // Call the parent callback if provided
      if (onStatusChange) {
        onStatusChange(documentId, newStatus);
      }
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleViewDocument = (documentId: string) => {
    // Get current URL to preserve state
    const currentUrl = window.location.pathname + window.location.search;

    // Navigate to the document view page with the current page as the "from" parameter
    router.push(
      `/adviser/${currentUserId}/approval/documents/${documentId}?from=${encodeURIComponent(currentUrl)}`,
    );
  };

  const handleNotesClick = (doc: Document, group: Group) => {
    setSelectedDocument({
      groupId: group._id as Id<"groupsTable">,
      documentPart: doc.chapter,
      documentTitle: doc.title,
    });
    setNotesPopupOpen(true);
  };

  const closeNotesPopup = () => {
    setNotesPopupOpen(false);
    setSelectedDocument(null);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#B54A4A] text-white">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                  onClick={() => onSort("name")}
                >
                  <div className="flex items-center justify-center">
                    Group Name
                    <span className="ml-1">{getSortIcon("name")}</span>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                  onClick={() => onSort("capstoneTitle")}
                >
                  <div className="flex items-center justify-center">
                    Capstone Title
                    <span className="ml-1">{getSortIcon("capstoneTitle")}</span>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                  onClick={() => onSort("projectManager")}
                >
                  <div className="flex items-center justify-center">
                    Project Manager
                    <span className="ml-1">
                      {getSortIcon("projectManager")}
                    </span>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer"
                  onClick={() => onSort("documentCount")}
                >
                  <div className="flex items-center justify-center">
                    Submitted Documents
                    <span className="ml-1">{getSortIcon("documentCount")}</span>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {status === "loading" && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {status === "error" && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-red-500"
                  >
                    An error occurred while loading documents. Please try again.
                  </td>
                </tr>
              )}
              {status === "idle" && !hasResults && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No documents available at this time.
                  </td>
                </tr>
              )}
              {groups.map((group) => (
                <React.Fragment key={group._id}>
                  {/* Main Group Row */}
                  <tr
                    className="hover:bg-gray-50"
                    ref={(el) => {
                      groupRowRefs.current[group._id] = el;
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {group.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.capstone_title || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.projectManager
                        ? getFullName(group.projectManager)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center justify-center">
                        <span className="font-medium">
                          {getSubmittedDocuments(group.documents || []).length}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => toggleExpand(group._id)}
                          className="px-3 py-1.5 text-sm bg-[#B54A4A] text-white rounded-md hover:bg-[#A03A3A] focus:outline-none focus:ring-2 focus:ring-[#B54A4A] focus:ring-offset-2 transition-colors"
                          disabled={
                            getAllDocuments(group.documents || []).length === 0
                          }
                        >
                          View Documents
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Documents Row */}
                  {expandedGroupId === group._id && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-4 pt-0 bg-gray-50">
                        <div className="bg-white rounded-b-lg shadow-md border-x border-b border-gray-200 p-6">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Document
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-2">
                                      <select
                                        className="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700 shadow-sm"
                                        value={selectedStatus}
                                        onChange={(e) =>
                                          setSelectedStatus(e.target.value)
                                        }
                                      >
                                        {statusOptions.map((option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {filterDocumentsByStatus(group.documents || [])
                                  .length > 0 ? (
                                  filterDocumentsByStatus(
                                    group.documents || [],
                                  ).map((doc) => (
                                    <tr
                                      key={doc._id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                          {doc.title}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        {canChangeStatus(doc) ? (
                                          <div className="relative inline-block">
                                            <select
                                              value={doc.status}
                                              onChange={(e) =>
                                                handleStatusChange(
                                                  doc._id,
                                                  parseInt(e.target.value),
                                                )
                                              }
                                              disabled={
                                                updatingStatus === doc._id
                                              }
                                              className={`px-2 py-1 pr-6 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none ${getStatusColor(doc.status)} ${updatingStatus === doc._id ? "opacity-50 cursor-not-allowed" : ""}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              <option
                                                value={doc.status}
                                                disabled
                                                className={
                                                  doc.status === 1
                                                    ? "hidden"
                                                    : ""
                                                }
                                              >
                                                {doc.status === 1
                                                  ? "Submitted"
                                                  : doc.status === 2
                                                    ? "Approved"
                                                    : doc.status === 3
                                                      ? "Rejected"
                                                      : "Unknown"}
                                              </option>
                                              {doc.status !== 2 && (
                                                <option
                                                  value={2}
                                                  className="bg-green-100 text-green-800"
                                                >
                                                  Approved
                                                </option>
                                              )}
                                              {doc.status !== 3 && (
                                                <option
                                                  value={3}
                                                  className="bg-red-100 text-red-800"
                                                >
                                                  Rejected
                                                </option>
                                              )}
                                            </select>
                                            <FaChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs pointer-events-none" />
                                            {updatingStatus === doc._id && (
                                              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-full">
                                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span
                                            className={`px-2 py-1 text-xs inline-flex items-center rounded-full ${getStatusColor(doc.status)}`}
                                          >
                                            {doc.status === 0
                                              ? "Not Submitted"
                                              : doc.status === 1
                                                ? "Submitted"
                                                : doc.status === 2
                                                  ? "Approved"
                                                  : doc.status === 3
                                                    ? "Rejected"
                                                    : "Unknown"}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                            title="View Document"
                                            onClick={() =>
                                              handleViewDocument(doc._id)
                                            }
                                          >
                                            <FaEye className="w-4 h-4" />
                                          </button>
                                          <button
                                            className="text-green-600 hover:text-green-800 transition-colors p-1"
                                            title="Add/Edit Notes"
                                            onClick={() =>
                                              handleNotesClick(doc, group)
                                            }
                                          >
                                            <FaStickyNote className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={3}
                                      className="text-center px-6 py-4 text-gray-500"
                                    >
                                      {selectedStatus !== "all"
                                        ? "No documents match the selected filter."
                                        : "This group has no documents to display."}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
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
      </div>

      {notesPopupOpen && selectedDocument && (
        <NotesPopup
          isOpen={notesPopupOpen}
          onClose={closeNotesPopup}
          groupId={selectedDocument.groupId}
          documentPart={selectedDocument.documentPart}
          documentTitle={selectedDocument.documentTitle}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default DocumentsTable;
