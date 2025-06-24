"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";
import { LogTable } from "./components/LogTable";

interface AdviserLogsPageProps {
  params: Promise<{ adviserId: string }>;
}

const AdviserLogsPage = ({ params }: AdviserLogsPageProps) => {
  const { adviserId } = use(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar adviserId={adviserId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Activity Logs</h1>
          <p className="text-muted-foreground">
            View your system activities and actions as a capstone adviser
          </p>
        </div>
        <LogTable adviserId={adviserId} />
      </div>
    </div>
  );
};

export default AdviserLogsPage;
