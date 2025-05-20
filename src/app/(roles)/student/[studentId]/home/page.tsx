'use client';

import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { HomeManager } from "../../manager/home-manager";
import { HomeMember } from "../../member/home-member";
import { useParams } from "next/navigation";

export default function StudentHomePage() {
    const { user } = useUser();
    const params = useParams();

    // `studentId` is retrieved from the URL
    const studentId = params.studentId as string;

    const convexUser = useQuery(api.documents.getUserByClerkId, {
        clerkId: user?.id ?? "",
    });

    if (!convexUser) {
        return <div className="p-4">Loading user data...</div>;
    }

    const isManager = convexUser.subrole === BigInt(1);

    return (
        <div className="min-h-screen flex flex-col">
            <div className="mt-16">
                {isManager ? (
                    <HomeManager studentId={studentId} />
                        ) : (
                    <HomeMember studentId={studentId} />
                )}
            </div>
        </div>
    );
}
