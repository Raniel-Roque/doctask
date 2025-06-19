"use client";

import { Navbar } from "../components/navbar";
import { TaskAssignmentTable } from "../../components/TaskAssignmentTable";
import { use } from "react";

interface ManagerTasksPageProps {
    params: Promise<{ studentId: string }>
};

const ManagerTasksPage = ({ params }: ManagerTasksPageProps) => {
    const { studentId } = use(params);

    return ( 
        <div className="min-h-screen bg-gray-50">
            <Navbar studentId={studentId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Task Assignment</h1>
                    <p className="text-muted-foreground">View and manage tasks for your group</p>
                </div>
                <TaskAssignmentTable 
                    tasks={[]}
                    status="idle"
                    currentUserId={studentId}
                    mode="manager"
                />
            </div>
        </div>
    );
}
 
export default ManagerTasksPage;