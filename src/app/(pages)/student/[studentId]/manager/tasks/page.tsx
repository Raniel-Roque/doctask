"use client";

import { Navbar } from "../components/navbar";
import { TaskAssignmentTable } from "../../components/TaskAssignmentTable";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "../../../../../../../convex/_generated/dataModel";

interface ManagerTasksPageProps {
  params: Promise<{ studentId: string }>;
}

const ManagerTasksPage = ({ params }: ManagerTasksPageProps) => {
  const { studentId } = use(params);
  const [groupId, setGroupId] = useState<string | null>(null);

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

  // Transform task assignments to match the Task interface
  const transformTasks = () => {
    if (!taskAssignments?.tasks) return [];

    return taskAssignments.tasks;
  };

  // Construct group object from available data
  const constructGroup = () => {
    if (!groupId || !taskAssignments?.groupMembers) return undefined;
    
    const projectManager = taskAssignments.groupMembers.find(member => member.isProjectManager);
    const members = taskAssignments.groupMembers.filter(member => !member.isProjectManager);
    
    return {
      _id: groupId as Id<"groupsTable">,
      project_manager_id: projectManager?._id as Id<"users">,
      member_ids: members.map(member => member._id as Id<"users">)
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar studentId={studentId} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Task Assignment</h1>
          <p className="text-muted-foreground">
            View and manage tasks for your group
          </p>
        </div>
        <TaskAssignmentTable
          tasks={transformTasks()}
          status={getStatus()}
          currentUserId={studentId}
          mode="manager"
          groupMembers={taskAssignments?.groupMembers}
          documents={documents?.documents || []}
          group={constructGroup()}
        />
      </div>
    </div>
  );
};

export default ManagerTasksPage;
