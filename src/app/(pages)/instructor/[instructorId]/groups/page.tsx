"use client";

import { Navbar } from "../components/navbar";
import { useState, use } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

// Import components
import GroupsTable from "./components/GroupsTable";
import AddGroupForm from "./components/AddGroupForm";

interface GroupsPageProps {
    params: Promise<{ instructorId: string }>
};

// Define proper types based on our schema
interface User {
  _id: Id<"users">;
  _creationTime: number;
  clerk_id: string;
  email: string;
  email_verified: boolean;
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: number;
  subrole?: number;
}

interface Group {
  _id: Id<"groupsTable">;
  capstone_title?: string;
  grade?: number;
  project_manager_id: Id<"users">;
  member_ids: Id<"users">[];
  adviser_id?: Id<"users">;
  // Additional fields for display
  projectManager?: User;
  members?: User[];
  adviser?: User;
  name?: string; // Added for display name
}

const GroupsPage = ({ params }: GroupsPageProps) => {
    const { instructorId } = use(params);

    // State management
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [networkError, setNetworkError] = useState<string | null>(null);

    // Fetch groups and users data
    const groups = useQuery(api.fetch.getGroups) || [];
    const users = useQuery(api.fetch.getUsers) || [];

    // Filter project managers (role 0, subrole 1, not already a project manager)
    const usedManagerIds = new Set(groups.map(g => g.project_manager_id));
    const projectManagers = users.filter(
      u => u.role === 0 && u.subrole === 1 && !usedManagerIds.has(u._id)
    );

    // Filter members (role 0, subrole 0, not already in a group)
    const usedMemberIds = new Set(groups.flatMap(g => g.member_ids));
    const members = users.filter(
      u => u.role === 0 && u.subrole === 0 && !usedMemberIds.has(u._id)
    );

    // Filter advisers (role 1)
    const advisers = users.filter(u => u.role === 1);

    // Process groups data to include user information
    const processedGroups: Group[] = groups.map(group => {
        const projectManager = users.find(user => user._id === group.project_manager_id);
        const members = group.member_ids
            .map(memberId => users.find(user => user._id === memberId))
            .filter((user): user is User => user !== undefined);
        const adviser = users.find(user => user._id === group.adviser_id);

        // Format group name as "Last Name et al"
        const name = projectManager ? `${projectManager.last_name} et al` : 'Unknown Group';

        return {
            ...group,
            projectManager,
            members,
            adviser,
            grade: group.grade,
            name,
            adviser_id: group.adviser_id
        };
    });

    // Handlers
    const createGroupWithMembers = useMutation(api.mutations.createGroupWithMembers);

    const handleAddGroup = async (formData: {
      projectManager: string;
      members: string[];
      adviser: string | null;
      capstoneTitle: string;
    }) => {
      try {
        setIsSubmitting(true);
        setNetworkError(null);
        // Call the mutation
        await createGroupWithMembers({
          projectManagerId: formData.projectManager as Id<"users">,
          memberIds: formData.members.map(id => id as Id<"users">),
          adviserId: formData.adviser ? (formData.adviser as Id<"users">) : undefined,
          capstoneTitle: formData.capstoneTitle,
          instructorId: instructorId as Id<"users">,
        });
        setIsAddingGroup(false);
      } catch (error) {
        // Handle specific error cases
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            setNetworkError("Request timed out. Please try again.");
          } else if (error.message.includes('Network error')) {
            setNetworkError("Network error - please check your internet connection");
          } else if (error.message.includes('already exists')) {
            setNetworkError("A group with these members already exists");
          } else if (error.message.includes('not found')) {
            setNetworkError("One or more selected users could not be found");
          } else if (error.message.includes('permission denied')) {
            setNetworkError("You don't have permission to create this group");
          } else if (error.message.includes('ArgumentValidationError')) {
            setNetworkError("Please check your input and try again");
          } else {
            setNetworkError("Failed to create group. Please try again.");
          }
        } else {
          setNetworkError("An unexpected error occurred. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar instructorId={instructorId} />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Manage Groups</h1>
                    <p className="text-muted-foreground">View, create, update, and delete groups.</p>
                </div>

                {/* Groups Table */}
                <GroupsTable
                    groups={processedGroups}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  onAdd={() => setIsAddingGroup(true)}
                />

                {/* Add Group Form */}
                <AddGroupForm
                  isOpen={isAddingGroup}
                  onClose={() => setIsAddingGroup(false)}
                  onSubmit={handleAddGroup}
                  isSubmitting={isSubmitting}
                  networkError={networkError}
                  setNetworkError={setNetworkError}
                  projectManagers={projectManagers}
                  members={members}
                  advisers={advisers}
                />
            </div>
        </div>
    );
}

export default GroupsPage;