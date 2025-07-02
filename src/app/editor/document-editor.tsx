"use client";

import { useState } from "react";
import { Navbar } from "./navbar";
import { Toolbar } from "./toolbar";
import { Editor } from "./editor";
import { ImageDragDropWrapper } from "./image-drag-drop";
import { VersionHistoryPanel } from "./version-history-panel";

interface DocumentEditorProps {
  isEditable?: boolean;
  userType?: "manager" | "member" | "adviser";
  title?: string;
  initialContent?: string;
  capstoneTitle?: string;
  groupId?: string;
  chapter?: string;
  saveToDatabase?: () => Promise<void>;
  toolbarMode?: "default" | "adviserViewOnly";
  backUrl?: string;
}

export const DocumentEditor = ({
  isEditable = true,
  userType = "manager",
  title,
  initialContent,
  capstoneTitle,
  groupId,
  chapter,
  saveToDatabase,
  toolbarMode = "default",
  backUrl,
}: DocumentEditorProps) => {
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  const handleOpenVersionHistory = () => {
    setIsVersionHistoryOpen(true);
  };

  const handleCloseVersionHistory = () => {
    setIsVersionHistoryOpen(false);
  };

  // Full-width view-only banner
  const getReadOnlyMessage = () => {
    if (userType === "member") {
      return "You are viewing this document in read-only mode. You need to be assigned to a related task to edit.";
    }
    return "You are viewing this document in read-only mode.";
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] print:!bg-white print:!min-h-0 print:!p-0 print:!m-0">
      <div className="print:hidden">
        <Navbar 
          title={title} 
          viewOnly={!isEditable} 
          userType={userType} 
          capstoneTitle={capstoneTitle}
          onOpenVersionHistory={handleOpenVersionHistory}
          backUrl={backUrl}
        />
        {(isEditable || toolbarMode === "adviserViewOnly") && <Toolbar toolbarMode={toolbarMode} />}
        {/* View-only banner directly under navbar and toolbar */}
        {!isEditable && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 text-sm text-center w-full">
            {getReadOnlyMessage()}
          </div>
        )}
      </div>
      <ImageDragDropWrapper isEditable={isEditable}>
        <div className="flex justify-center print:!block print:!w-full print:!p-0 print:!m-0">
          <div className="max-w-screen-lg w-full flex flex-col px-4 py-4 gap-y-2 print:!max-w-none print:!p-0 print:!m-0 print:!block print:!gap-0 print:!w-full">
            <Editor
              initialContent={initialContent}
              isEditable={isEditable}
              userType={userType}
              suppressReadOnlyBanner={true}
            />
          </div>
        </div>
      </ImageDragDropWrapper>

      {/* Version History Panel */}
      <VersionHistoryPanel
        isOpen={isVersionHistoryOpen}
        onClose={handleCloseVersionHistory}
        groupId={groupId}
        chapter={chapter}
        saveToDatabase={saveToDatabase}
      />
    </div>
  );
};
