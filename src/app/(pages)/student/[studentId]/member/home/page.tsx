"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { LatestDocumentsTable } from "../../components/LatestDocumentsTable";

interface MemberHomeProps {
  params: Promise<{ studentId: string }>;
}

const MemberHomePage = ({ params }: MemberHomeProps) => {
  const { studentId } = use(params);

  // Fetch data
  const user = useQuery(api.fetch.getUserById, {
    id: studentId as Id<"users">,
  });
  const studentGroup = useQuery(api.fetch.getStudentGroup, {
    userId: studentId as Id<"users">,
  });
  const groupDetails = useQuery(
    api.fetch.getGroupById,
    studentGroup?.group_id ? { groupId: studentGroup.group_id } : "skip",
  );
  const adviser = useQuery(
    api.fetch.getUserById,
    groupDetails?.adviser_id ? { id: groupDetails.adviser_id } : "skip",
  );
  const latestDocuments = useQuery(
    api.fetch.getLatestDocuments,
    studentGroup?.group_id ? { groupId: studentGroup.group_id } : "skip",
  );
  const requestedAdviser = useQuery(
    api.fetch.getUserById,
    groupDetails?.requested_adviser
      ? { id: groupDetails.requested_adviser }
      : "skip",
  );
  const taskAssignments = useQuery(
    api.fetch.getTaskAssignments,
    studentGroup?.group_id ? { groupId: studentGroup.group_id } : "skip",
  );

  // Determine loading state
  const isLoading =
    user === undefined ||
    studentGroup === undefined ||
    groupDetails === undefined ||
    (studentGroup?.group_id && latestDocuments === undefined) ||
    (studentGroup?.group_id && taskAssignments === undefined) ||
    (groupDetails?.adviser_id && adviser === undefined) ||
    (groupDetails?.requested_adviser && requestedAdviser === undefined);

  // Adviser UI logic for member
  const isLoadingAdviser =
    groupDetails === undefined ||
    (groupDetails?.adviser_id
      ? adviser === undefined
      : groupDetails?.requested_adviser
        ? requestedAdviser === undefined
        : false);
  let adviserObj = undefined;

  if (!isLoadingAdviser) {
    if (groupDetails?.adviser_id && adviser?.first_name) {
      adviserObj = {
        first_name: adviser.first_name,
        middle_name: adviser.middle_name,
        last_name: adviser.last_name,
      };
    } else if (
      groupDetails?.requested_adviser &&
      !groupDetails.adviser_id &&
      requestedAdviser?.first_name
    ) {
      adviserObj = {
        first_name: requestedAdviser.first_name,
        middle_name: requestedAdviser.middle_name,
        last_name: requestedAdviser.last_name,
        pending: true,
        pendingName: `${requestedAdviser.first_name} ${requestedAdviser.last_name}`,
      };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar studentId={studentId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Welcome Back, {user?.first_name ?? "Member"}!
          </h1>
          <p className="text-muted-foreground">
            Overview of your group&apos;s documents
          </p>
        </div>
        {/* Latest Documents Table */}
        <div className="container mx-auto px-4 pb-8">
          <LatestDocumentsTable
            documents={latestDocuments?.documents ?? []}
            status={
              isLoading
                ? "loading"
                : !studentGroup?.group_id
                  ? "no_group"
                  : "idle"
            }
            currentUserId={studentId as Id<"users">}
            capstoneTitle={groupDetails?.capstone_title ?? "Capstone Documents"}
            grade={groupDetails?.grade}
            adviser={adviserObj}
            onShowAdviserPopup={() => {}} // No popup for member
            isSubmitting={false}
            mode="member"
            tasks={taskAssignments?.tasks ?? []}
          />
        </div>
      </div>
    </div>
  );
};

export default MemberHomePage;
