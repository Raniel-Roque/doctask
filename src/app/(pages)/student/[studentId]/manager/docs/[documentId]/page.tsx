"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEditorStore } from "@/store/use-editor-store";

// Import editor components dynamically to prevent hydration mismatches
const Editor = dynamic(() => import("../../../../../../editor/editor").then((mod) => ({ default: mod.Editor })), {
  ssr: false,
});

const Toolbar = dynamic(() => import("../../../../../../editor/toolbar").then((mod) => ({ default: mod.Toolbar })), {
  ssr: false,
});

const Navbar = dynamic(() => import("../../../../../../editor/navbar").then((mod) => ({ default: mod.Navbar })), {
  ssr: false,
});

interface ManagerDocumentEditorProps {
  params: Promise<{ documentId: string }>;
}

const ManagerDocumentEditor = ({ params }: ManagerDocumentEditorProps) => {
  const { documentId } = use(params);
  const { user } = useUser();
  const router = useRouter();
  const { editor } = useEditorStore();
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const isViewOnly = searchParams.get('viewOnly') === 'true';

  // Get current user by Clerk ID
  const currentUser = useQuery(api.fetch.getUserByClerkId, 
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get document data
  const document = useQuery(api.fetch.getDocument, {
    documentId: documentId as Id<"documents">,
  });

  // Check user access using authenticated user ID
  const userAccess = useQuery(api.fetch.getUserDocumentAccess, 
    currentUser?._id ? {
      documentId: documentId as Id<"documents">,
      userId: currentUser._id,
    } : "skip"
  );

  // Get task assignments to check if user can edit
  const taskAssignments = useQuery(api.fetch.getTaskAssignments,
    userAccess?.group?._id ? { groupId: userAccess.group._id } : "skip"
  );

  // Mutation to update document content
  const updateContent = useMutation(api.mutations.updateDocumentContent);

  // Check if user can edit this document
  const canEdit = () => {
    if (!document || !currentUser || !userAccess?.group) return false;
    
    // Project managers can edit all documents
    if (userAccess.group.project_manager_id === currentUser._id) {
      return true;
    }
    
    // Members need to be assigned to related tasks
    if (!taskAssignments?.tasks) return false;
    const relatedTasks = taskAssignments.tasks.filter(task => task.chapter === document.chapter);
    return relatedTasks.some(task => task.assigned_student_ids.includes(currentUser._id));
  };

  const isEditable = canEdit() && !isViewOnly;

  // Load document content into editor when available
  useEffect(() => {
    if (document && editor && isLoading) {
      editor.commands.setContent(document.content || "");
      setIsLoading(false);
      
      // Set editor to read-only if user can't edit or is in view-only mode
      if (!isEditable) {
        editor.setEditable(false);
      } else {
        editor.setEditable(true);
      }
    }
  }, [document, editor, isLoading, isEditable]);

  // Auto-save content changes (only if editable and not view-only)
  useEffect(() => {
    if (!editor || !document || !currentUser?._id || isLoading || !isEditable) return;

    const handleUpdate = async () => {
      const content = editor.getHTML();
      if (content !== document.content) {
        try {
          await updateContent({
            documentId: documentId as Id<"documents">,
            content,
            userId: currentUser._id,
          });
        } catch (error) {
          console.error("Failed to save document:", error);
        }
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(handleUpdate, 1000);

    editor.on("update", () => {
      clearTimeout(timeoutId);
      setTimeout(handleUpdate, 1000);
    });

    return () => {
      clearTimeout(timeoutId);
      editor.off("update", handleUpdate);
    };
  }, [editor, document, documentId, updateContent, isLoading, currentUser?._id, isEditable]);

  // Handle access control
  if (userAccess?.hasAccess === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to view this document.</p>
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
    <div className="min-h-screen bg-[#FAFBFD]">
      <div className="print:hidden">
        <Navbar title={document.title} />  
        <Toolbar />
        {!isEditable && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 text-sm text-center">
            {isViewOnly 
              ? "You are viewing this document in read-only mode." 
              : "You are viewing this document in read-only mode. You need to be assigned to a related task to edit."
            }
          </div>
        )}
      </div>
      <Editor />
    </div>
  );
};

export default ManagerDocumentEditor;

