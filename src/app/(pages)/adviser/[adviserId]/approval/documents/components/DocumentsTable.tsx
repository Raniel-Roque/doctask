"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaEye,
  FaEdit,
  FaStickyNote,
  FaDownload,
  FaUser,
} from "react-icons/fa";
import { User, Group, Document } from "./types";
import { useMutation } from "convex/react";
import { Id } from "../../../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import NotesPopup from "./NotesPopup";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import GroupMembersModal from "./GroupMembersModal";

interface DocumentsTableProps {
  groups: Group[];
  onSort: (field: "name" | "capstoneTitle" | "documentCount") => void;
  getSortIcon: (
    field: "name" | "capstoneTitle" | "documentCount",
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
  const [downloadingDocx, setDownloadingDocx] = useState<string | null>(null);
  const [notesPopupOpen, setNotesPopupOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    groupId: Id<"groupsTable">;
    documentPart: string;
    documentTitle: string;
  } | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    _id: string;
    capstone_title?: string;
    projectManager?: User;
    members?: User[];
  } | null>(null);
  const groupRowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>(
    {},
  );

  // Add notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

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
    return doc.status !== 0; // Allow changes for all statuses except not_submitted
  };

  const handleStatusChange = async (documentId: string, newStatus: number) => {
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
      setNotification({
        message: "Document not found",
        type: "error",
      });
      return;
    }

    // Perform status change directly
    await performStatusChange(documentId, newStatus, targetDoc, targetGroup);
  };

  const performStatusChange = async (
    documentId: string,
    newStatus: number,
    targetDoc: Document,
    targetGroup: Group,
  ) => {
    try {
      setUpdatingStatus(documentId);

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

      setNotification({
        message: `Document ${newStatus === 2 ? "approved" : "rejected"} successfully!`,
        type: "success",
      });
    } catch (error) {
      setNotification({
        message:
          error instanceof Error
            ? error.message
            : "Failed to update document status.",
        type: "error",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleViewDocument = (documentId: string) => {
    // Get current URL to preserve state
    const currentUrl = window.location.pathname + window.location.search;

    // Navigate to the document view page with the current page as the "from" parameter
    router.push(
      `/adviser/${currentUserId}/approval/documents/${documentId}?from=${encodeURIComponent(currentUrl)}&viewOnly=true`,
    );
  };

  const handleEditDocument = (documentId: string) => {
    // Get current URL to preserve state
    const currentUrl = window.location.pathname + window.location.search;

    // Navigate to the document edit page with the current page as the "from" parameter
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

  const handleViewMembers = (group: Group) => {
    setSelectedGroup({
      _id: group._id,
      capstone_title: group.capstone_title,
      projectManager: group.projectManager,
      members: group.members,
    });
    setShowMembersModal(true);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
    setSelectedGroup(null);
  };

  // Helper function to generate consistent filename format
  const generateFilename = (title: string, extension: string) => {
    const now = new Date();
    const dateTimeString = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "");
    return `${sanitizedTitle}-${dateTimeString}.${extension}`;
  };

  // DOCX download function
  const handleDownloadDocx = async (doc: Document) => {
    if (!doc.content) {
      setNotification({
        message: "Document content is empty.",
        type: "error",
      });
      return;
    }

    try {
      setDownloadingDocx(doc._id);

      // Using the more secure 'docx' library
      const { Document, Packer, Paragraph, TextRun, ImageRun } = await import(
        "docx"
      );

      const htmlContent = doc.content;

      // Create a temporary DOM element to parse the HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlContent;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children: any[] = [];

      // Process each child node
      for (const node of Array.from(tempDiv.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          // Handle plain text
          const text = node.textContent?.trim();
          if (text) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: text,
                    font: "Times New Roman",
                    size: 22, // 11pt
                  }),
                ],
              }),
            );
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          if (element.tagName === "IMG") {
            // Handle images
            const img = element as HTMLImageElement;
            if (img.src) {
              try {
                const response = await fetch(img.src);
                if (response.ok) {
                  const arrayBuffer = await response.arrayBuffer();
                  children.push(
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: new Uint8Array(arrayBuffer),
                          transformation: {
                            width: 400,
                            height: 300,
                          },
                          type: "png",
                        }),
                      ],
                    }),
                  );
                }
              } catch {}
            }
          } else {
            // Handle other elements by extracting their text content
            const text = element.textContent?.trim();
            if (text) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: text,
                      font: "Times New Roman",
                      size: 22, // 11pt
                    }),
                  ],
                }),
              );
            }
          }
        }
      }

      const docxDoc = new Document({
        sections: [
          {
            properties: {},
            children: children,
          },
        ],
      });

      const blob = await Packer.toBlob(docxDoc);

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generateFilename(doc.title, "docx");
      a.click();
      URL.revokeObjectURL(url);

      setNotification({
        message: "Document downloaded successfully!",
        type: "success",
      });
    } catch {
      setNotification({
        message: "Failed to download document. Please try again.",
        type: "error",
      });
    } finally {
      setDownloadingDocx(null);
    }
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
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
                >
                  <div className="flex items-center justify-center">
                    Group Members
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
                    className="hover:bg-gray-50 cursor-pointer"
                    ref={(el) => {
                      groupRowRefs.current[group._id] = el;
                    }}
                    onClick={() => toggleExpand(group._id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {group.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.capstone_title || "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewMembers(group);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        disabled={!group.members && !group.projectManager}
                      >
                        <FaUser className="mr-1" size={12} />
                        {(() => {
                          const memberCount =
                            (group.members?.length || 0) +
                            (group.projectManager ? 1 : 0);
                          return memberCount > 0
                            ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
                            : "No members";
                        })()}
                      </button>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(group._id);
                          }}
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
                                              </option>
                                              <option
                                                value={2}
                                                className="bg-green-100 text-green-800"
                                              >
                                                Approve
                                              </option>
                                              <option
                                                value={3}
                                                className="bg-red-100 text-red-800"
                                              >
                                                Reject
                                              </option>
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
                                          {/* View button - always visible for all documents */}
                                          <button
                                            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                            title="View Document"
                                            onClick={() =>
                                              handleViewDocument(doc._id)
                                            }
                                          >
                                            <FaEye className="w-4 h-4" />
                                          </button>
                                          
                                          {/* Edit button - only for submitted, approved, or rejected documents */}
                                          {doc.status !== 0 && (
                                            <>
                                              <span className="mx-1 text-gray-300 select-none">|</span>
                                              <button
                                                className="text-purple-600 hover:text-purple-800 transition-colors p-1"
                                                title="Edit Document"
                                                onClick={() =>
                                                  handleEditDocument(doc._id)
                                                }
                                              >
                                                <FaEdit className="w-4 h-4" />
                                              </button>
                                            </>
                                          )}
                                          
                                          {/* Download button - only for submitted, approved, or rejected documents */}
                                          {doc.status !== 0 && (
                                            <>
                                              <span className="mx-1 text-gray-300 select-none">|</span>
                                              <button
                                                className="text-green-600 hover:text-green-800 transition-colors p-1"
                                                title="Download Document"
                                                onClick={() =>
                                                  handleDownloadDocx(doc)
                                                }
                                                disabled={
                                                  downloadingDocx === doc._id
                                                }
                                              >
                                                {downloadingDocx === doc._id ? (
                                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                  <FaDownload className="w-4 h-4" />
                                                )}
                                              </button>
                                            </>
                                          )}
                                          
                                          {/* Notes button - always visible */}
                                          <span className="mx-1 text-gray-300 select-none">|</span>
                                          <button
                                            className="text-yellow-500 hover:text-yellow-700 transition-colors p-1"
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

      {notification && (
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Group Members Modal */}
      <GroupMembersModal
        isOpen={showMembersModal}
        onClose={handleCloseMembersModal}
        group={selectedGroup}
      />
    </div>
  );
};

export default DocumentsTable;
