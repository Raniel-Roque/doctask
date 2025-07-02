"use client";

import { use, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import { Id, Doc } from "../../../../../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditorStore } from "@/store/use-editor-store";
import { Room } from "@/app/editor/room";

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
      : "skip"
  );

  // Get the live document content to compare against
  const liveDocument = useQuery(
    api.fetch.getDocument,
    liveDocumentData?.documentId
      ? { documentId: liveDocumentData.documentId }
      : "skip"
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

  // Get the live document ID to compare with current document
  const liveDocumentData = useQuery(
    api.fetch.getLiveDocumentId,
    document && currentUser?._id
      ? {
          groupId: document.group_id,
          chapter: document.chapter,
          userId: currentUser._id,
        }
      : "skip"
  );

  // Check if current document is a version snapshot (not the live document)
  const isVersionSnapshot = document && liveDocumentData?.documentId 
    ? document._id !== liveDocumentData.documentId
    : false;

  // Members cannot view version snapshots - redirect to live document
  useEffect(() => {
    if (isVersionSnapshot && liveDocumentData?.documentId && document) {
      // Redirect to the live document URL
      const currentUrl = new URL(window.location.href);
      const liveDocumentUrl = currentUrl.pathname.replace(
        document._id,
        liveDocumentData.documentId
      );
      router.replace(liveDocumentUrl);
    }
  }, [isVersionSnapshot, liveDocumentData, document, router]);

  // Check if user can edit this document (members need specific task assignment)
  const canEdit = () => {
    if (!document || !currentUser || !taskAssignments?.tasks) return false;

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

  // Handle access control
  if (userAccess?.hasAccess === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view this document.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
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
