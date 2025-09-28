"use client";

import { Navbar } from "../components/navbar";
import { use } from "react";
import { TaskAssignmentTable } from "../../components/TaskAssignmentTable";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";

interface MemberTasksPageProps {
  params: Promise<{ studentId: string }>;
}

const MemberTasksPage = ({ params }: MemberTasksPageProps) => {
  const { studentId } = use(params);
  const [groupId, setGroupId] = useState<string | null>(null);

  // Offline detection
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Check initial connection status
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Get the user's group using studentId directly (it's already a Convex user ID)
  const studentGroup = useQuery(api.fetch.getStudentGroup, {
    userId: studentId as Id<"users">,
  });

  // Get task assignments and group members when groupId is available
  const taskAssignments = useQuery(
    api.fetch.getTaskAssignments,
    groupId ? { groupId: groupId as Id<"groupsTable"> } : "skip",
  );

  // Get documents for the group using studentId directly
  const documents = useQuery(
    api.fetch.getDocumentsWithStatus,
    groupId
      ? {
          groupId: groupId as Id<"groupsTable">,
        }
      : "skip",
  );

  // Get group details and adviser information
  const groupDetails = useQuery(
    api.fetch.getGroupById,
    groupId ? { groupId: groupId as Id<"groupsTable"> } : "skip",
  );
  const adviser = useQuery(
    api.fetch.getUserById,
    groupDetails?.adviser_id ? { id: groupDetails.adviser_id } : "skip",
  );
  const requestedAdviser = useQuery(
    api.fetch.getUserById,
    groupDetails?.requested_adviser
      ? { id: groupDetails.requested_adviser }
      : "skip",
  );

  // Set groupId when studentGroup is loaded
  useEffect(() => {
    if (studentGroup?.group_id) {
      setGroupId(studentGroup.group_id);
    }
  }, [studentGroup]);

  // Determine status based on loading states
  const getStatus = () => {
    if (!studentGroup) return "loading";
    if (!studentGroup.group_id) return "no_group";
    if (!taskAssignments) return "loading";
    return "idle";
  };

  // Get task assignments directly from the database
  const transformTasks = () => {
    if (!taskAssignments?.tasks) return [];

    return taskAssignments.tasks;
  };

  // Construct group object from available data
  const constructGroup = () => {
    if (!groupId || !taskAssignments?.groupMembers) return undefined;

    const projectManager = taskAssignments.groupMembers.find(
      (member) => member.isProjectManager,
    );
    const members = taskAssignments.groupMembers.filter(
      (member) => !member.isProjectManager,
    );

    return {
      _id: groupId as Id<"groupsTable">,
      project_manager_id: projectManager?._id as Id<"users">,
      member_ids: members.map((member) => member._id as Id<"users">),
    };
  };

  // Construct adviser object
  const constructAdviser = () => {
    if (groupDetails?.adviser_id && adviser?.first_name) {
      return {
        first_name: adviser.first_name,
        middle_name: adviser.middle_name,
        last_name: adviser.last_name,
      };
    } else if (
      groupDetails?.requested_adviser &&
      !groupDetails.adviser_id &&
      requestedAdviser?.first_name
    ) {
      return {
        first_name: requestedAdviser.first_name,
        middle_name: requestedAdviser.middle_name,
        last_name: requestedAdviser.last_name,
        pending: true,
        pendingName: `${requestedAdviser.first_name} ${requestedAdviser.last_name}`,
      };
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar studentId={studentId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Task Assignment</h1>
          <p className="text-muted-foreground">
            View your group&apos;s assigned tasks
          </p>
        </div>
        <TaskAssignmentTable
          tasks={transformTasks()}
          status={getStatus()}
          currentUserId={studentId as Id<"users">}
          mode="member"
          groupMembers={taskAssignments?.groupMembers}
          documents={documents?.documents || []}
          group={constructGroup()}
          adviser={constructAdviser()}
          isOffline={isOffline}
        />
      </div>
    </div>
  );
};

export default MemberTasksPage;
