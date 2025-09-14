"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaPlus,
} from "react-icons/fa";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

interface NotesPopupViewOnlyProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: Id<"groupsTable">;
  documentPart: string;
  documentTitle: string;
}

interface Note {
  _id: Id<"notes">;
  _creationTime: number;
  group_id: Id<"groupsTable">;
  document_part: string;
  content: string;
}

const NotesPopupViewOnly: React.FC<NotesPopupViewOnlyProps> = ({
  isOpen,
  onClose,
  groupId,
  documentPart,
  documentTitle,
}) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap logic (matching NotesPopup.tsx)
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;

    // Get all focusable elements
    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ];
    const focusableEls = modal.querySelectorAll<HTMLElement>(
      focusableSelectors.join(","),
    );
    if (focusableEls.length > 0) {
      focusableEls[0].focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab") {
        const focusable = Array.from(focusableEls);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (focusable.length === 0) return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    modal.addEventListener("keydown", handleKeyDown);
    return () => modal.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const notesResult = useQuery(api.fetch.getDocumentNotes, {
    groupId: groupId as Id<"groupsTable">,
    documentPart: documentPart,
  });

  const allNotes = notesResult?.notes || [];

  const filteredNotes = allNotes.filter((note) => {
    const noteDate = new Date(note._creationTime);
    const noteDateStr = noteDate.toISOString().split("T")[0];
    if (startDate && noteDateStr < startDate) return false;
    if (endDate && noteDateStr > endDate) return false;
    return true;
  });

  const sortedNotes = [...filteredNotes].sort(
    (a, b) => b._creationTime - a._creationTime,
  );
  const totalCount = sortedNotes.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const notes = sortedNotes.slice(startIndex, startIndex + pageSize);

  const getNoteNumber = (note: Note) => {
    const chronologicalIndex = filteredNotes
      .sort((a, b) => a._creationTime - b._creationTime)
      .findIndex((n) => n._id === note._id);
    return chronologicalIndex + 1;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          ref={modalRef}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notes-modal-title"
          tabIndex={-1}
        >
          {/* Main Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2
                id="notes-modal-title"
                className="text-xl font-semibold text-gray-900"
              >
                Notes
              </h2>
              <p className="text-sm text-gray-600 mt-1">{documentTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Close"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <div className="relative flex flex-col items-start">
                {startDate && (
                  <button
                    type="button"
                    className="absolute -top-1 right-0 text-blue-600 hover:text-blue-800 text-xs z-20 bg-white px-1"
                    onClick={() => {
                      setStartDate("");
                      setCurrentPage(1);
                    }}
                    tabIndex={-1}
                    style={{ transform: "translateY(-100%)" }}
                  >
                    Clear
                  </button>
                )}
                <input
                  type="date"
                  placeholder="YYYY-MM-DD"
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={startDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <span className="self-center text-gray-500 text-sm">to</span>
              <div className="relative flex flex-col items-start">
                {endDate && (
                  <button
                    type="button"
                    className="absolute -top-1 right-0 text-blue-600 hover:text-blue-800 text-xs z-20 bg-white px-1"
                    onClick={() => {
                      setEndDate("");
                      setCurrentPage(1);
                    }}
                    tabIndex={-1}
                    style={{ transform: "translateY(-100%)" }}
                  >
                    Clear
                  </button>
                )}
                <input
                  type="date"
                  placeholder="YYYY-MM-DD"
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={endDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Notes List */}
            <div className="space-y-3">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaPlus className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No notes from adviser yet.</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note._id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Note Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleNoteExpansion(note._id)}
                          className="text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          {expandedNotes.has(note._id) ? (
                            <FaChevronUp className="w-4 h-4" />
                          ) : (
                            <FaChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <span className="font-medium text-gray-900">
                          Note {getNoteNumber(note)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(note._creationTime)}
                        </span>
                      </div>
                    </div>

                    {/* Note Content */}
                    {expandedNotes.has(note._id) && (
                      <div className="p-4 border-t border-gray-200">
                        <div className="text-gray-700 whitespace-pre-wrap">
                          {note.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {totalCount > 0 ? startIndex + 1 : 0}
                  </span>
                  {" - "}
                  <span className="font-medium">
                    {Math.min(startIndex + pageSize, totalCount)}
                  </span>
                  {" of "}
                  <span className="font-medium">{totalCount}</span>
                  {" entries"}
                </p>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                    className="px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[5, 10, 15, 20].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-700">
                    entries per page
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
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
                  onClick={() => handlePageChange(currentPage + 1)}
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
          )}
        </div>
      </div>
    </>
  );
};

export default NotesPopupViewOnly;
