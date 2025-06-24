"use client";

import { Navbar } from "../../components/navbar";
import { LogTable } from "../components/LogTable";
import { use } from "react";

interface InstructorLogsPageProps {
  params: Promise<{ instructorId: string }>;
}

const InstructorLogsPage = ({ params }: InstructorLogsPageProps) => {
  const { instructorId } = use(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar instructorId={instructorId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Capstone Instructor System Logs
          </h1>
          <p className="text-muted-foreground">
            View all system activities and changes by capstone instructors
          </p>
        </div>
        <LogTable userRole={0} />
      </div>
    </div>
  );
};

export default InstructorLogsPage;
