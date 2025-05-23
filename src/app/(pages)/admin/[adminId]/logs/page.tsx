"use client";

import { Navbar } from "../components/navbar";
import { LogTable } from "./components/LogTable";
import { api } from "../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";

interface LogsPageProps {
    params: Promise<{ adminId: string }>
};

const LogsPage = ({ params }: LogsPageProps) => {
    const { adminId } = use(params);
    const logs = useQuery(api.documents.getLogs);

    return ( 
        <div className="min-h-screen bg-gray-50">
            <Navbar adminId={adminId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">System Logs</h1>
                    <p className="text-muted-foreground">View all system activities and changes</p>
                </div>

                {logs && <LogTable logs={logs} />}
            </div>
        </div>
    );
}
 
export default LogsPage;