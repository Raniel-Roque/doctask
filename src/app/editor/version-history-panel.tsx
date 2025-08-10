"use client";

import { useState, useEffect } from "react";
import {
  X,
  Clock,
  CheckCircle,
  Plus,
  Trash,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useEditorStore } from "@/store/use-editor-store";
import { NotificationBanner } from "@/app/(pages)/components/NotificationBanner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string;
  chapter?: string;
  saveToDatabase?: () => Promise<void>;
}

interface NotificationState {
  message: string | null;
  type: "error" | "success" | "warning" | "info";
}

export const VersionHistoryPanel = ({
  isOpen,
  onClose,
  groupId,
  chapter,
  saveToDatabase,
}: VersionHistoryPanelProps) => {
  const { user } = useUser();
  const { editor } = useEditorStore();
  const [notification, setNotification] = useState<NotificationState>({
    message: null,
    type: "info",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [show, setShow] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revertConfirmId, setRevertConfirmId] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const showNotification = (
    message: string,
    type: NotificationState["type"],
  ) => {
    setNotification({ message, type });
  };

  const closeNotification = () => {
    setNotification({ message: null, type: "info" });
  };

  // Clear notification when panel closes
  useEffect(() => {
    if (!isOpen) {
      closeNotification();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Next tick: trigger show for animation in
      setTimeout(() => setShow(true), 10);
    } else {
      setShow(false);
      // Wait for animation before unmounting
      const timeout = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Get current user's Convex ID
  const currentUser = useQuery(api.fetch.getUserByClerkId, {
    clerkId: user?.id || "",
  });

  // Fetch document versions with contributors
  const versionsData = useQuery(
    api.fetch.getDocumentVersionsWithContributors,
    groupId && chapter
      ? {
          groupId: groupId as Id<"groupsTable">,
          chapter,
        }
      : "skip",
  );

  // Create version mutation
  const createVersion = useMutation(api.mutations.createDocumentVersion);

  // Approve version mutation
  const approveVersion = useMutation(api.mutations.approveDocumentVersion);

  // Add delete mutation
  const deleteVersion = useMutation(api.mutations.deleteDocumentVersion);

  useEffect(() => {
    if (versionsData && versionsData.success) {
      // setLocalVersions(versionsData.versions); // This line was removed
    }
  }, [versionsData]);

  const handleCreateVersion = async () => {
    if (!groupId || !chapter || !currentUser?._id || !editor) {
      showNotification("Missing required data to create version", "error");
      return;
    }

    setIsCreating(true);
    try {
      // First, save the current editor content to database
      if (saveToDatabase) {
        showNotification("Saving current content...", "info");
        await saveToDatabase();
      }

      // Then create the version from the fresh database content
      const result = await createVersion({
        groupId: groupId as Id<"groupsTable">,
        chapter,
        userId: currentUser._id,
      });

      if (result.success) {
        showNotification("Version created successfully!", "success");
      } else {
        showNotification(result.error || "Failed to create version", "error");
      }
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Failed to create version",
        "error",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleApproveVersion = async (versionId: string) => {
    if (!currentUser?._id || !editor) {
      showNotification("Cannot revert version - missing data", "error");
      return;
    }

    setRevertingId(versionId);
    try {
      const result = await approveVersion({
        versionId: versionId as Id<"documents">,
        userId: currentUser._id,
      });

      if (result.success && result.approvedContent) {
        // Update the editor content to sync with Liveblocks
        // This will automatically clear any threads/comments since the content changes
        editor.commands.setContent(result.approvedContent);
        showNotification("Version reverted successfully!", "success");
        setRevertConfirmId(null);
      } else {
        showNotification(result.error || "Failed to revert version", "error");
      }
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Failed to revert version",
        "error",
      );
    } finally {
      setRevertingId(null);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!currentUser?._id) {
      showNotification("Cannot delete version - missing data", "error");
      return;
    }
    setDeletingId(versionId);
    try {
      await deleteVersion({
        documentId: versionId as Id<"documents">,
        userId: currentUser._id as Id<"users">,
      });
      showNotification("Version deleted!", "success");
      // setLocalVersions((prev) => prev.filter((v) => v._id !== versionId)); // This line was removed
      setDeleteConfirmId(null);
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Failed to delete version",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen && !isVisible) return null;

  // Show loading or error states
  if (!versionsData) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/20 z-40 print:hidden"
          onClick={onClose}
        />
        <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-50 print:hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold">Version History</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="text-sm text-gray-600">Loading...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!versionsData.success) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/20 z-40 print:hidden"
          onClick={onClose}
        />
        <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-50 print:hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold">Version History</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="text-sm text-red-600">{versionsData.error}</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Notification Banner - Outside panel, centered at top */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] print:hidden">
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
        />
      </div>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 print:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-50 print:hidden flex flex-col transition-all duration-300 ease-in-out
          ${show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold">Version History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4">
            {/* Create Version Button */}
            <div className="mb-4">
              <Button
                onClick={handleCreateVersion}
                disabled={isCreating}
                size="sm"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? "Creating..." : "Create Version"}
              </Button>
            </div>

            {/* Version List */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Versions ({versionsData.versions?.length || 0})
              </div>

              {!versionsData.versions || versionsData.versions.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  No versions created yet.
                  <br />
                  Create your first version to start tracking changes.
                </div>
              ) : (
                versionsData.versions.map((version, index) => (
                  <div
                    key={version._id}
                    className="p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          Version {versionsData.versions.length - index}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(version._creationTime)}
                        </div>
                        {/* Display contributors */}
                        {version.contributorNames &&
                          version.contributorNames.length > 0 && (
                            <div className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Edited by:</span>{" "}
                              {version.contributorNames.join(", ")}
                            </div>
                          )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setRevertConfirmId(version._id)}
                          disabled={revertingId === version._id}
                          size="sm"
                          variant="outline"
                        >
                          {revertingId === version._id ? (
                            "Reverting..."
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Revert
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirmId(version._id)}
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          title="Delete version"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revert Confirmation Dialog */}
      {revertConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              Confirm Revert
            </h2>
            <p className="mb-4 text-gray-600">
              Are you sure you want to revert to this version? This action will:
            </p>
            <ul className="mb-6 text-gray-600 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>
                  Replace all current content with the selected version
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>This action cannot be undone</span>
              </li>
            </ul>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setRevertConfirmId(null)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300 flex items-center gap-2"
                disabled={revertingId === revertConfirmId}
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={() => handleApproveVersion(revertConfirmId)}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={revertingId === revertConfirmId}
              >
                {revertingId === revertConfirmId ? (
                  <>
                    <span className="animate-spin">
                      <Loader2 className="h-4 w-4" />
                    </span>
                    Reverting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Revert Version
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border-2 border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <X className="h-6 w-6 text-red-600" />
              Confirm Delete
            </h2>
            <p className="mb-8 text-gray-600">
              Are you sure you want to delete this version? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-2 border-gray-300 flex items-center gap-2"
                disabled={deletingId === deleteConfirmId}
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={() => handleDeleteVersion(deleteConfirmId)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={deletingId === deleteConfirmId}
              >
                {deletingId === deleteConfirmId ? (
                  <>
                    <span className="animate-spin">
                      <Trash className="h-4 w-4" />
                    </span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
