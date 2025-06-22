"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";

interface ManagerDocsPageProps {
  params: Promise<{ studentId: string }>;
}

const ManagerDocsPage = ({ params }: ManagerDocsPageProps) => {
  const { studentId } = use(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar studentId={studentId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Manager Docs</h1>
          <p className="text-muted-foreground">Manager Docs</p>
        </div>
      </div>
    </div>
  );
};

export default ManagerDocsPage;
