"use client";

import { useState, use, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import { Id, Doc } from "../../../../../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditorStore } from "@/store/use-editor-store";
import { Room } from "@/app/editor/room";
import UnauthorizedAccess from "@/app/(pages)/components/UnauthorizedAccess";

// Custom hook for saving logic
const useSaveToDatabase = (
  documentId: string,
  document: Doc<"documents"> | null | undefined,
  currentUser:
    | {
        _id: Id<"users">;
        _creationTime: number;
        middle_name?: string;
        subrole?: number;
        clerk_id: string;
        email: string;
        email_verified: boolean;
        first_name: string;
        last_name: string;
        role: number;
      }
    | null
    | undefined,
  isEditable: boolean,
) => {
  const { editor } = useEditorStore();
  const updateContent = useMutation(api.mutations.updateDocumentContent);

  // Get the live document ID (template document, not version snapshot)
  const liveDocumentData = useQuery(
    api.fetch.getLiveDocumentId,
    document && currentUser?._id
      ? {
          groupId: document.group_id,
          chapter: document.chapter,
          userId: currentUser._id,
        }
      : "skip",
  );

  // Get the live document content to compare against
  const liveDocument = useQuery(
    api.fetch.getDocument,
    liveDocumentData?.documentId
      ? { documentId: liveDocumentData.documentId }
      : "skip",
  );

  const saveToDatabase = async () => {
    if (!editor || !document || !currentUser?._id || !isEditable) return;

    // Always save to the live document, not the current document
    const targetDocumentId = liveDocumentData?.documentId;
    if (!targetDocumentId) {
      return;
    }

    const content = editor.getHTML();
    // Compare against live document content, not current document content
    if (content !== liveDocument?.content) {
      await updateContent({
        documentId: targetDocumentId,
        content,
        userId: currentUser._id,
      });
    }
  };

  return saveToDatabase;
};

interface MemberDocumentEditorProps {
  params: Promise<{ documentId: string }>;
}

const MemberDocumentEditor = ({ params }: MemberDocumentEditorProps) => {
  const { documentId } = use(params);
  const { user } = useUser();
  const router = useRouter();
  const { editor } = useEditorStore();
  const searchParams = useSearchParams();
  const isViewOnly = searchParams.get("viewOnly") === "true";
  const updateLastModified = useMutation(
    api.mutations.updateDocumentLastModified,
  );

  // Get current user by Clerk ID
  const currentUser = useQuery(
    api.fetch.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip",
  );

  // Get document data
  const document = useQuery(api.fetch.getDocument, {
    documentId: documentId as Id<"documents">,
  });

  // Check user access using authenticated user ID
  const userAccess = useQuery(
    api.fetch.getUserDocumentAccess,
    currentUser?._id
      ? {
          documentId: documentId as Id<"documents">,
          userId: currentUser._id,
        }
      : "skip",
  );

  // Get task assignments to check if user can edit
  const taskAssignments = useQuery(
    api.fetch.getTaskAssignments,
    userAccess?.group?._id ? { groupId: userAccess.group._id } : "skip",
  );

  // Fetch all document statuses for the group
  const documentsWithStatus = useQuery(
    api.fetch.getDocumentsWithStatus,
    document && document.group_id ? { groupId: document.group_id } : "skip",
  );

  // Find the status for the current document's chapter
  const currentDocumentStatus = documentsWithStatus?.documents?.find(
    (doc) => doc.chapter === document?.chapter,
  );

  // Get the live document ID to compare with current document
  const liveDocumentData = useQuery(
    api.fetch.getLiveDocumentId,
    document && currentUser?._id
      ? {
          groupId: document.group_id,
          chapter: document.chapter,
          userId: currentUser._id,
        }
      : "skip",
  );

  // Check if current document is a version snapshot (not the live document)
  const isVersionSnapshot =
    document && liveDocumentData?.documentId
      ? document._id !== liveDocumentData.documentId
      : false;

  // State to track unauthorized access
  const [unauthorizedReason, setUnauthorizedReason] = useState<
    "deleted" | "version_snapshot" | null
  >(null);

  // Block access to non-live or soft-deleted documents
  useEffect(() => {
    if (document && document.isDeleted) {
      // Show unauthorized access screen for soft-deleted documents
      setUnauthorizedReason("deleted");
      return;
    }
    if (isVersionSnapshot && liveDocumentData?.documentId && document) {
      // Redirect to the live document URL
      const currentUrl = new URL(window.location.href);
      const liveDocumentUrl = currentUrl.pathname.replace(
        document._id,
        liveDocumentData.documentId,
      );
      router.replace(liveDocumentUrl);
    }
  }, [isVersionSnapshot, liveDocumentData, document, router]);

  // Check if user can edit this document (members need specific task assignment)
  const canEdit = () => {
    if (!document || !currentUser || !taskAssignments?.tasks) return false;
    // Only allow editing if this is the live, non-deleted document
    if (isVersionSnapshot || document.isDeleted) return false;
    // Don't allow editing if document is submitted (status 1) or approved (status 2)
    // Allow editing if document is not submitted (status 0) or rejected (status 3)
    if (
      currentDocumentStatus &&
      (currentDocumentStatus.status === 1 || currentDocumentStatus.status === 2)
    )
      return false;
    // Members can only edit if they are assigned to a task that matches this document's chapter
    return taskAssignments.tasks.some(
      (task) =>
        task.chapter === document.chapter &&
        task.assigned_student_ids.includes(currentUser._id),
    );
  };

  const isEditable = canEdit() && !isViewOnly;

  // Get save function
  const saveToDatabase = useSaveToDatabase(
    documentId,
    document,
    currentUser,
    isEditable,
  );

  // Memoize the updateLastModified function to make it stable
  const handleUpdateLastModified = useCallback(
    (documentId: Id<"documents">, userId: Id<"users">) => {
      updateLastModified({ documentId, userId });
    },
    [updateLastModified],
  );

  // Set editor read-only state when editor and access permissions are available
  useEffect(() => {
    if (editor && document && currentUser) {
      // Set editor to read-only if user can't edit or is in view-only mode
      if (!isEditable) {
        editor.setEditable(false);
      } else {
        editor.setEditable(true);
      }
    }
  }, [editor, document, currentUser, isEditable]);

  // Smart auto-save: frequent when solo, less frequent when collaborative
  useEffect(() => {
    if (!isEditable) return;

    let saveInterval = 1000; // 1 second for solo editing
    let backupInterval: NodeJS.Timeout;

    const updateSaveInterval = (isCollaborative: boolean) => {
      if (backupInterval) clearInterval(backupInterval);
      saveInterval = isCollaborative ? 30000 : 1000; // 30s collaborative, 1s solo
      backupInterval = setInterval(saveToDatabase, saveInterval);
    };

    // Listen for room activity events
    const handleRoomActivity = (event: CustomEvent) => {
      updateSaveInterval(event.detail.hasOthers);
    };

    // Start with solo editing interval
    updateSaveInterval(false);

    window.addEventListener(
      "liveblocks-room-activity",
      handleRoomActivity as EventListener,
    );

    return () => {
      clearInterval(backupInterval);
      window.removeEventListener(
        "liveblocks-room-activity",
        handleRoomActivity as EventListener,
      );
    };
  }, [saveToDatabase, isEditable]);

  // Save when user leaves (if they're the last one)
  useEffect(() => {
    if (!isEditable) return;

    const handleBeforeUnload = () => {
      saveToDatabase();
    };

    const handleVisibilityChange = () => {
      if (globalThis.document.hidden) {
        saveToDatabase();
      }
    };

    // Listen for custom event when user is last in room
    const handleLastUserInRoom = () => {
      saveToDatabase();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    globalThis.document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
    window.addEventListener("liveblocks-last-user", handleLastUserInRoom);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      globalThis.document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("liveblocks-last-user", handleLastUserInRoom);
    };
  }, [saveToDatabase, isEditable]);

  // Update last_modified when entering the editor (mount) - only in edit mode
  useEffect(() => {
    if (
      isEditable && // Only update when in edit mode
      liveDocumentData?.documentId &&
      currentUser?._id &&
      !isVersionSnapshot &&
      document &&
      !document.isDeleted
    ) {
      handleUpdateLastModified(liveDocumentData.documentId, currentUser._id);
    }
  }, [
    liveDocumentData?.documentId,
    currentUser?._id,
    isEditable, // Only update when in edit mode
    isVersionSnapshot,
    document,
    handleUpdateLastModified,
  ]);

  // Update last_modified when the last user leaves the editor - only in edit mode
  useEffect(() => {
    if (
      isEditable && // Only update when in edit mode
      liveDocumentData?.documentId &&
      currentUser?._id &&
      !isVersionSnapshot &&
      document &&
      !document.isDeleted
    ) {
      const handleLastUserInRoom = () => {
        if (liveDocumentData.documentId) {
          handleUpdateLastModified(
            liveDocumentData.documentId,
            currentUser._id,
          );
        }
      };
      window.addEventListener("liveblocks-last-user", handleLastUserInRoom);
      return () => {
        window.removeEventListener(
          "liveblocks-last-user",
          handleLastUserInRoom,
        );
      };
    }
  }, [
    liveDocumentData?.documentId,
    currentUser?._id,
    isEditable, // Only update when in edit mode
    isVersionSnapshot,
    document,
    handleUpdateLastModified,
  ]);

  // Show unauthorized access screen if needed
  if (unauthorizedReason) {
    return <UnauthorizedAccess reason={unauthorizedReason} />;
  }

  // Handle access control
  if (userAccess?.hasAccess === false) {
    return <UnauthorizedAccess reason="unauthorized" />;
  }

  if (!document || !userAccess || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <Room
      title={document.title}
      isEditable={isEditable}
      userType="member"
      capstoneTitle={userAccess?.group?.capstone_title}
      groupId={document.group_id}
      chapter={document.chapter}
      saveToDatabase={saveToDatabase}
      liveDocumentId={liveDocumentData?.documentId || undefined}
    />
  );
};

export default MemberDocumentEditor;
