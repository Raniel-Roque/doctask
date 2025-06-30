"use client";

import { useState } from "react";
import { Navbar } from "./navbar";
import { Toolbar } from "./toolbar";
import { Editor } from "./editor";
import { ImageDragDropWrapper } from "./image-drag-drop";
import { VersionHistoryPanel } from "./version-history-panel";

interface DocumentEditorProps {
  isEditable?: boolean;
  userType?: "manager" | "member";
  title?: string;
  initialContent?: string;
  capstoneTitle?: string;
  groupId?: string;
  chapter?: string;
  saveToDatabase?: () => Promise<void>;
  isVersionSnapshot?: boolean;
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
  isVersionSnapshot,
}: DocumentEditorProps) => {
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  const handleOpenVersionHistory = () => {
    setIsVersionHistoryOpen(true);
  };

  const handleCloseVersionHistory = () => {
    setIsVersionHistoryOpen(false);
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
          isVersionSnapshot={isVersionSnapshot}
        />
        {isEditable && <Toolbar />}
      </div>
      <ImageDragDropWrapper>
        <div className="flex justify-center print:!block print:!w-full print:!p-0 print:!m-0">
          <div className="max-w-screen-lg w-full flex flex-col px-4 py-4 gap-y-2 print:!max-w-none print:!p-0 print:!m-0 print:!block print:!gap-0 print:!w-full">
            <Editor
              initialContent={initialContent}
              isEditable={isEditable}
              userType={userType}
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
