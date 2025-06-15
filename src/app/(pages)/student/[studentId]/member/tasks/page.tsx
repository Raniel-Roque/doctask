"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";

interface MemberTasksPageProps {
    params: Promise<{ studentId: string }>
};

const MemberTasksPage = ({ params }: MemberTasksPageProps) => {
    const { studentId } = use(params);

    return ( 
        <div className="min-h-screen bg-gray-50">
            <Navbar studentId={studentId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Member Tasks</h1>
                    <p className="text-muted-foreground">View your tasks</p>
                </div>
            </div>
        </div>
    );
}
 
export default MemberTasksPage;