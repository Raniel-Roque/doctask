"use client";

import React, { useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaEye,
  FaCheck,
  FaClock,
  FaTimes,
  FaFileAlt,
  FaStickyNote,
} from "react-icons/fa";
import { User, Group, Document } from "./types";
import { useRouter } from "next/navigation";
import { Id } from "../../../../../../../../convex/_generated/dataModel";
import NotesPopup from "./NotesPopup";

interface DocumentsTableTabsProps {
  groups: Group[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  currentUserId: Id<"users">;
}

const DocumentsTableTabs: React.FC<DocumentsTableTabsProps> = ({
  groups,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  currentUserId,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>(
    groups[0]?._id || null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [notesPopupOpen, setNotesPopupOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    groupId: Id<"groupsTable">;
    documentPart: string;
    documentTitle: string;
  } | null>(null);

  const getFullName = (user: User) => {
    return `${user.first_name} ${user.middle_name ? user.middle_name + " " : ""}${user.last_name}`;
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: // not_submitted
        return "bg-gray-100 text-gray-800";
      case 1: // submitted
        return "bg-blue-100 text-blue-800";
      case 2: // approved
        return "bg-green-100 text-green-800";
      case 3: // rejected
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 2: // approved
        return <FaCheck className="w-3 h-3" />;
      case 1: // submitted
        return <FaClock className="w-3 h-3" />;
      case 3: // rejected
        return <FaTimes className="w-3 h-3" />;
      case 0: // not_submitted
      default:
        return <FaFileAlt className="w-3 h-3" />;
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const activeGroup = groups.find((g) => g._id === activeTab);
  const filteredDocuments =
    activeGroup?.documents?.filter((doc) => {
      const searchLower = searchTerm.toLowerCase();
      const titleMatch = doc.title.toLowerCase().includes(searchLower);
      const chapterMatch = doc.chapter.toLowerCase().includes(searchLower);

      // Convert status number to string for search
      const statusText =
        doc.status === 0
          ? "not submitted"
          : doc.status === 1
            ? "submitted"
            : doc.status === 2
              ? "approved"
              : doc.status === 3
                ? "rejected"
                : "unknown";
      const statusMatch = statusText.includes(searchLower);

      return titleMatch || chapterMatch || statusMatch;
    }) || [];

  const handleViewDocument = (documentId: string) => {
    // Get current URL to preserve state
    const currentUrl = window.location.pathname + window.location.search;
    
    // Navigate to the document view page with the current page as the "from" parameter
    router.push(`/adviser/${currentUserId}/approval/documents/${documentId}?from=${encodeURIComponent(currentUrl)}`);
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
    <div className="space-y-6">
      {/* Group Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {groups.map((group) => (
            <button
              key={group._id}
              onClick={() => setActiveTab(group._id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === group._id
                  ? "border-[#B54A4A] text-[#B54A4A]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{group.name || "Unknown Group"}</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {group.documentCount || 0}
                </span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Active Group Info */}
      {activeGroup && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {activeGroup.name}
              </h3>
              <p className="text-sm text-gray-600">
                {activeGroup.capstone_title}
              </p>
              <p className="text-xs text-gray-500">
                Project Manager:{" "}
                {activeGroup.projectManager
                  ? getFullName(activeGroup.projectManager)
                  : "N/A"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#B54A4A]">
                {activeGroup.documentCount || 0}
              </div>
              <div className="text-xs text-gray-500">Total Documents</div>
            </div>
          </div>

          {/* Document Search */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FaSearch />
              </div>
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Documents Grid */}
          {filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm mb-1 truncate">
                        {doc.title}
                      </h5>
                      <p className="text-xs text-gray-500 capitalize">
                        {doc.chapter.replace("_", " ")}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}
                    >
                      {getStatusIcon(doc.status)}
                      <span className="ml-1">
                        {doc.status === 0
                          ? "Not Submitted"
                          : doc.status === 1
                            ? "Submitted"
                            : doc.status === 2
                              ? "Approved"
                              : doc.status === 3
                                ? "Rejected"
                                : doc.status}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Modified: {formatDate(doc.lastModified)}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        onClick={() => handleViewDocument(doc._id)}
                        title="View Document"
                      >
                        <FaEye className="w-3 h-3" />
                      </button>
                      <button 
                        className="text-green-600 hover:text-green-800 transition-colors"
                        onClick={() => handleNotesClick(doc, activeGroup)}
                        title="Add/Edit Notes"
                      >
                        <FaStickyNote className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaFileAlt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No documents found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? "Try adjusting your search terms."
                  : "This group has no documents yet."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
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
            {" groups"}
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
            <span className="text-sm text-gray-700">groups per page</span>
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
            Page {currentPage} of {totalPages}
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

      {/* Notes Popup */}
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

export default DocumentsTableTabs;
