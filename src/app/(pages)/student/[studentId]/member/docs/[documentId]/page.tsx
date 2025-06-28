"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
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

interface MemberDocumentEditorProps {
  params: Promise<{ studentId: string; documentId: string }>;
}

const MemberDocumentEditor = ({ params }: MemberDocumentEditorProps) => {
  const { studentId, documentId } = use(params); // eslint-disable-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const { editor } = useEditorStore();
  const [isLoading, setIsLoading] = useState(true);

  // Get document data
  const document = useQuery(api.fetch.getDocument, {
    documentId: documentId as Id<"documents">,
  });

  // Check user access using studentId directly (it's already a Convex user ID)
  const userAccess = useQuery(api.fetch.getUserDocumentAccess, {
    documentId: documentId as Id<"documents">,
    userId: studentId as Id<"users">,
  });

  // Mutation to update document content
  const updateContent = useMutation(api.mutations.updateDocumentContent);

  // Load document content into editor when available
  useEffect(() => {
    if (document && editor && isLoading) {
      editor.commands.setContent(document.content || "");
      setIsLoading(false);
    }
  }, [document, editor, isLoading]);

  // Auto-save content changes
  useEffect(() => {
    if (!editor || !document || isLoading) return;

    const handleUpdate = async () => {
      const content = editor.getHTML();
      if (content !== document.content) {
        try {
          await updateContent({
            documentId: documentId as Id<"documents">,
            content,
            userId: studentId as Id<"users">,
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
  }, [editor, document, documentId, updateContent, isLoading, studentId]);

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

  if (!document || !userAccess) {
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
      </div>
      <Editor />
    </div>
  );
};

export default MemberDocumentEditor;

