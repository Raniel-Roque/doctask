import dynamic from "next/dynamic";

// Import editor components dynamically to prevent hydration mismatches
const Editor = dynamic(() => import("./editor").then((mod) => ({ default: mod.Editor })), {
  ssr: false,
});

const Toolbar = dynamic(() => import("./toolbar").then((mod) => ({ default: mod.Toolbar })), {
  ssr: false,
});

const Navbar = dynamic(() => import("./navbar").then((mod) => ({ default: mod.Navbar })), {
  ssr: false,
});

interface DocumentEditorProps {
  title: string;
  isEditable: boolean;
  userType: 'manager' | 'member';
}

export const DocumentEditor = ({ title, isEditable, userType }: DocumentEditorProps) => {
  return (
    <div className="min-h-screen bg-[#FAFBFD]">
      <div className="print:hidden">
        <Navbar title={title} viewOnly={!isEditable} />  
        {isEditable && <Toolbar />}
      </div>
      <Editor isEditable={isEditable} userType={userType} />
    </div>
  );
}; 