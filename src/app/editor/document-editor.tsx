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
    <div className="min-h-screen bg-[#F9F8FD]">
      <Navbar title={title} viewOnly={!isEditable} userType={userType} capstoneTitle={capstoneTitle} />
      {isEditable && <Toolbar />}
      <ImageDragDropWrapper>
        <div className="flex justify-center">
          <div className="max-w-screen-lg w-full flex flex-col px-4 py-4 gap-y-2">
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
