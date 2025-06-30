import { Navbar } from "./navbar";
import { Toolbar } from "./toolbar";
import { Editor } from "./editor";
import { ImageDragDropWrapper } from "./image-drag-drop";

interface DocumentEditorProps {
  isEditable?: boolean;
  userType?: "manager" | "member";
  title?: string;
  initialContent?: string;
  capstoneTitle?: string;
}

export const DocumentEditor = ({
  isEditable = true,
  userType = "manager",
  title,
  initialContent,
  capstoneTitle,
}: DocumentEditorProps) => {
  return (
    <div className="min-h-screen bg-[#FAFBFD] print:!bg-white print:!min-h-0 print:!p-0 print:!m-0">
      <div className="print:hidden">
        <Navbar title={title} viewOnly={!isEditable} userType={userType} capstoneTitle={capstoneTitle} />
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
    </div>
  );
};
