"use client";

import { Editor } from "./editor";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

// Import components dynamically to prevent hydration mismatches
const Toolbar = dynamic(() => import("./toolbar").then((mod) => ({ default: mod.Toolbar })), {
  ssr: false,
});

const Navbar = dynamic(() => import("./navbar").then((mod) => ({ default: mod.Navbar })), {
  ssr: false,
});

const DocumentIdPage = () => {
  const params = useParams();
  const documentId = params.documentId as string;

  return (
    <div className="min-h-screen bg-[#FAFBFD]">
      <div className="print:hidden">
        <Navbar />  
        <Toolbar />
      </div>
      <Editor />
    </div>
  );
};

export default DocumentIdPage;
