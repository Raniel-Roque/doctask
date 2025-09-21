"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaSave,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../../convex/_generated/dataModel";
import { useBannerManager } from "@/app/(pages)/components/BannerManager";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";
import { formatDateTime } from "@/lib/date-utils";

import { UnsavedChangesConfirmation } from "@/app/(pages)/components/UnsavedChangesConfirmation";
import DeleteNoteConfirmation from "./DeleteNoteConfirmation";

interface NotesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: Id<"groupsTable">;
  documentPart: string;
  documentTitle: string;
  currentUserId: Id<"users">;
}

interface Note {
  _id: Id<"notes">;
  _creationTime: number;
  group_id: Id<"groupsTable">;
  document_part: string;
  content: string;
}

const NotesPopup: React.FC<NotesPopupProps> = ({
  isOpen,
  onClose,
  groupId,
  documentPart,
  documentTitle,
  currentUserId,
}) => {
  const { addBanner } = useBannerManager();
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showUnsavedConfirmation, setShowUnsavedConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pendingDeleteNoteId, setPendingDeleteNoteId] =
    useState<null | Id<"notes">>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap logic
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

  // Fetch notes
  const notesResult = useQuery(api.fetch.getDocumentNotes, {
    groupId,
    documentPart,
  });

  // Mutations
  const createNote = useMutation(api.mutations.createNote);
  const updateNote = useMutation(api.mutations.updateNote);
  const deleteNote = useMutation(api.mutations.deleteNote);

  const allNotes = notesResult?.notes || [];

  // Filter notes by date range
  const filteredNotes = allNotes.filter((note) => {
    if (!startDate && !endDate) return true;

    const noteDate = new Date(note._creationTime);
    const noteDateStr = noteDate.toISOString().split("T")[0];

    if (startDate && noteDateStr < startDate) return false;
    if (endDate && noteDateStr > endDate) return false;

    return true;
  });

  // Sort notes by creation time (latest first) and calculate pagination
  const sortedNotes = [...filteredNotes].sort(
    (a, b) => b._creationTime - a._creationTime,
  );
  const totalCount = sortedNotes.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const notes = sortedNotes.slice(startIndex, startIndex + pageSize);

  // Calculate the correct note numbers (oldest = 1, regardless of display order)
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
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const showNotification = (
    message: string,
    type: "error" | "success" | "warning" | "info",
  ) => {
    addBanner({
      message,
      type,
      onClose: () => {},
      autoClose: type === "error" ? false : true,
    });
  };

  const handleUnsavedChanges = (action: () => void) => {
    if (editingContent !== "" || newNoteContent !== "") {
      setPendingAction(() => action);
      setShowUnsavedConfirmation(true);
    } else {
      action();
    }
  };

  const handleContinueAction = () => {
    setShowUnsavedConfirmation(false);
    setEditingContent("");
    setNewNoteContent("");
    setEditingNoteId(null);
    setShowAddPopup(false);
    if (pendingAction) {
      pendingAction();
    }
    setPendingAction(null);
  };

  const handleCancelAction = () => {
    setShowUnsavedConfirmation(false);
    setPendingAction(null);
  };

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const handleAddNote = async () => {
    const content = newNoteContent.trim();

    if (!content) {
      showNotification("Note content cannot be empty", "error");
      return;
    }

    try {
      setIsAddingNote(true);
      await createNote({
        groupId,
        documentPart,
        content: content,
        userId: currentUserId,
      });
      setNewNoteContent("");
      setShowAddPopup(false);
      // Reset to first page when adding a new note
      setCurrentPage(1);
      showNotification("Note added successfully", "success");
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.editUser("document"),
      );
      showNotification(errorMessage, "error");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleEditNote = async (noteId: Id<"notes">) => {
    const content = editingContent.trim();

    if (!content) {
      showNotification("Note content cannot be empty", "error");
      return;
    }

    try {
      await updateNote({
        noteId,
        content: content,
        userId: currentUserId,
      });
      setEditingNoteId(null);
      setEditingContent("");
      showNotification("Note updated successfully", "success");
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.editUser("document"),
      );
      showNotification(errorMessage, "error");
    }
  };

  const handleDeleteNote = async () => {
    if (!pendingDeleteNoteId) return;
    try {
      await deleteNote({
        noteId: pendingDeleteNoteId,
        userId: currentUserId,
      });
      if (currentPage > 1 && notes.length === 1) {
        setCurrentPage(currentPage - 1);
      }
      showNotification("Note deleted successfully", "success");
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        ErrorContexts.editUser("document"),
      );
      showNotification(errorMessage, "error");
    } finally {
      setPendingDeleteNoteId(null);
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note._id);
    setEditingContent(note.content);
    setExpandedNotes((prev) => new Set([...prev, note._id]));
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const openAddPopup = () => {
    handleUnsavedChanges(() => {
      setShowAddPopup(true);
      setNewNoteContent("");
    });
  };

  const closeAddPopup = () => {
    handleUnsavedChanges(() => {
      setShowAddPopup(false);
      setNewNoteContent("");
    });
  };

  const formatDate = (timestamp: number) => {
    return formatDateTime(timestamp);
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
                    const newStartDate = e.target.value;
                    setStartDate(newStartDate);
                    // If new start date is after end date, clear end date
                    if (newStartDate && endDate && newStartDate > endDate) {
                      setEndDate("");
                    }
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
                  min={startDate || undefined}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <button
              onClick={openAddPopup}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <FaPlus className="w-4 h-4" />
              Add Note
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Notes List */}
            <div className="space-y-3">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaPlus className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>
                    No notes yet. Click &quot;Add Note&quot; to create your
                    first note.
                  </p>
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
                      <div className="flex items-center gap-2">
                        {editingNoteId === note._id ? (
                          <>
                            <button
                              onClick={() => handleEditNote(note._id)}
                              className="text-green-600 hover:text-green-800 transition-colors p-1"
                              title="Save Changes"
                            >
                              <FaSave className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-gray-600 hover:text-gray-800 transition-colors p-1"
                              title="Cancel"
                            >
                              <FaTimes className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(note)}
                              className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                              title="Edit Note"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPendingDeleteNoteId(note._id)}
                              className="text-red-600 hover:text-red-800 transition-colors p-1"
                              title="Delete Note"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Note Content */}
                    {expandedNotes.has(note._id) && (
                      <div className="p-4 border-t border-gray-200">
                        {editingNoteId === note._id ? (
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={4}
                            placeholder="Enter your note here..."
                            autoComplete="off"
                            autoCorrect="off"
                          />
                        ) : (
                          <div className="text-gray-700 whitespace-pre-wrap">
                            {note.content}
                          </div>
                        )}
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

      {/* Add Note Popup */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Note
              </h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter your note here..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={6}
                disabled={isAddingNote}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeAddPopup}
                disabled={isAddingNote}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || isAddingNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isAddingNote ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <FaCheck className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation */}
      <UnsavedChangesConfirmation
        isOpen={showUnsavedConfirmation}
        onContinue={handleContinueAction}
        onCancel={handleCancelAction}
      />

      {pendingDeleteNoteId && (
        <DeleteNoteConfirmation
          isOpen={true}
          onConfirm={handleDeleteNote}
          onCancel={() => setPendingDeleteNoteId(null)}
        />
      )}
    </>
  );
};

export default NotesPopup;
