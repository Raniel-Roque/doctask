"use client";

import { use } from "react";
import { Navbar } from "../components/navbar";
import { api } from "../../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { LatestDocumentsTable } from "./components/LatestDocumentsTable";

interface ManagerHomeProps {
    params: Promise<{ studentId: string }>
};

interface StudentGroup {
    _id: Id<"studentsTable">;
    user_id: Id<"users">;
    group_id: Id<"groupsTable"> | null;
}

const ManagerHomePage = ({ params }: ManagerHomeProps) => {
    const { studentId } = use(params);

    console.log("Current studentId:", studentId);

    // Fetch user data
    const user = useQuery(api.fetch.getUserById, {
        id: studentId as Id<"users">,
    });
    console.log("User data:", user);

    // Fetch student's group from studentsTable
    const studentGroup = useQuery(api.fetch.getStudentGroup, {
        userId: studentId as Id<"users">,
    }) as StudentGroup | null;
    console.log("Student group data:", studentGroup);

    // Fetch group details if we have a group ID
    const groupDetails = useQuery(
        api.fetch.getGroupById,
        studentGroup?.group_id ? {
            groupId: studentGroup.group_id,
        } : "skip"
    );
    console.log("Group details:", groupDetails);

    // Fetch latest documents only if we have a valid group ID
    const latestDocuments = useQuery(
        api.fetch.getLatestDocuments,
        studentGroup?.group_id ? {
            groupId: studentGroup.group_id,
        } : "skip"
    );
    console.log("Latest documents:", latestDocuments);

    // Determine loading state - only check latestDocuments if we have a group
    const isLoading = user === undefined || 
                     studentGroup === undefined || 
                     (studentGroup?.group_id && (latestDocuments === undefined || !latestDocuments.done));
    console.log("Loading state:", isLoading);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar studentId={studentId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Welcome, {user?.first_name ?? "Manager"}!</h1>
                    <p className="text-muted-foreground">This is your Home Page.</p>
                </div>

                {/* Latest Documents Table */}
                <div className="container mx-auto px-4 pb-8">
                    <LatestDocumentsTable 
                        documents={latestDocuments?.documents ?? []}
                        status={isLoading ? 'loading' : (!studentGroup?.group_id ? 'no_group' : 'idle')}
                        hasResults={(latestDocuments?.documents?.length ?? 0) > 0}
                        currentUserId={studentId as Id<"users">}
                        capstoneTitle={groupDetails?.capstone_title ?? "Capstone Documents"}
                        grade={groupDetails?.grade}
                    />
                </div>
            </div>
        </div>
    );
}
 
export default ManagerHomePage;

 
