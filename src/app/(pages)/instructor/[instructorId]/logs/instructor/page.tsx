"use client";

import { Navbar } from "../../components/navbar";
import { LogTable } from ".././components/LogTable";
import { api } from "../../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";

interface InstructorLogsPageProps {
    params: Promise<{ instructorId: string }>
};

// Define the type for the logs returned from the query
interface LogQueryResult {
    _id: Id<"instructorLogs">;
    instructor_id: Id<"users">;
    instructor_name: string;
    affected_user_id: Id<"users"> | null;
    affected_user_name: string;
    affected_user_email: string;
    action: string;
    details: string;
    _creationTime: number;
}

const InstructorLogsPage = ({ params }: InstructorLogsPageProps) => {
    const { instructorId } = use(params);
    const logs = useQuery(api.fetch.getLogs) as LogQueryResult[] | undefined;

    return ( 
        <div className="min-h-screen bg-gray-50">
            <Navbar instructorId={instructorId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Capstone Instructor System Logs</h1>
                    <p className="text-muted-foreground">View all system activities and changes by capstone instructors</p>
                </div>

                {logs && <LogTable logs={logs} />}
            </div>
        </div>
    );
}
 
export default InstructorLogsPage;