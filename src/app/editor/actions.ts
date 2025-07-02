"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Generate consistent colors for users based on their ID
const generateUserColor = (userId: string, index: number): string => {
  const colors = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F56565", // red
    "#8B5CF6", // purple
    "#F59E0B", // yellow
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#F97316", // orange
    "#6366F1", // indigo
  ];

  // Use a combination of index and userId hash for consistency
  const hash = userId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  return colors[Math.abs(hash + index) % colors.length];
};

export async function getDocuments(ids: Id<"documents">[]) {
  // Get documents by IDs - implementing basic version since getByIds doesn't exist
  const documents = await Promise.all(
    ids.map(async (id) => {
      try {
        return await convex.query(api.fetch.getDocument, { documentId: id });
      } catch {
        return null;
      }
    }),
  );
  return documents.filter(Boolean);
}

export async function getUsers(documentId?: Id<"documents">) {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  const clerk = await clerkClient();

  try {
    // Get current user from Convex using Clerk ID
    const currentUser = await convex.query(api.fetch.getUserByClerkId, {
      clerkId: userId,
    });

    if (!currentUser) {
      return [];
    }

    // Handle different user roles
    if (currentUser.role === 0) {
      // Student - get group members
      return await getStudentUsers(currentUser, clerk, documentId);
    } else if (currentUser.role === 1) {
      // Adviser - get their groups and members (only if they have access to the document)
      return await getAdviserUsers(currentUser, clerk, documentId);
    } else {
      // Other roles (instructors, etc.) - return empty array
      return [];
    }
  } catch {
    return [];
  }
}

async function getStudentUsers(currentUser: { _id: Id<"users"> }, clerk: Awaited<ReturnType<typeof clerkClient>>, documentId?: Id<"documents">) {
  // If documentId is provided, check if student has access to this specific document
  if (documentId) {
    const documentAccess = await convex.query(api.fetch.getUserDocumentAccess, {
      documentId,
      userId: currentUser._id,
    });

    // If student doesn't have access to this document, return empty array
    if (!documentAccess.hasAccess) {
      return [];
    }
  }

  // Get the student's group information
  const studentGroup = await convex.query(api.fetch.getStudentGroup, {
    userId: currentUser._id,
  });

  if (!studentGroup?.group_id) {
    // Student is not in a group
    return [];
  }

  // Get the group details
  const group = await convex.query(api.fetch.getGroupById, {
    groupId: studentGroup.group_id,
  });

  if (!group) {
    return [];
  }

  // Get all group members (project manager + members + adviser if assigned)
  const allMemberIds = [group.project_manager_id, ...group.member_ids];
  
  // Add the adviser if one is assigned to this group
  if (group.adviser_id) {
    allMemberIds.push(group.adviser_id);
  }

  // Get all users from Convex
  const groupMembers = await Promise.all(
    allMemberIds.map(async (memberId) => {
      return await convex.query(api.fetch.getUserById, { id: memberId });
    }),
  );

  // Filter out null users and get their Clerk profiles for avatars
  const validMembers = groupMembers.filter(
    (member): member is NonNullable<typeof member> => member !== null,
  );

  const users = await Promise.all(
    validMembers.map(async (member, index) => {
      try {
        // Get avatar from Clerk
        const clerkUser = await clerk.users.getUser(member.clerk_id);

        return {
          id: member.clerk_id,
          name: `${member.first_name} ${member.last_name}`,
          avatar: clerkUser.imageUrl || "",
          color: generateUserColor(member.clerk_id, index),
        };
      } catch {
        // If Clerk user not found, return without avatar
        return {
          id: member.clerk_id,
          name: `${member.first_name} ${member.last_name}`,
          avatar: "",
          color: generateUserColor(member.clerk_id, index),
        };
      }
    }),
  );

  return users;
}

async function getAdviserUsers(currentUser: { _id: Id<"users"> }, clerk: Awaited<ReturnType<typeof clerkClient>>, documentId?: Id<"documents">) {
  // If documentId is provided, check if adviser has access to this specific document
  if (documentId) {
    const documentAccess = await convex.query(api.fetch.getUserDocumentAccess, {
      documentId,
      userId: currentUser._id,
    });

    // If adviser doesn't have access to this document, return empty array
    if (!documentAccess.hasAccess) {
      return [];
    }
  }

  // Get adviser's groups
  const adviserGroups = await convex.query(api.fetch.getAdviserGroups, {
    adviserId: currentUser._id,
  });

  if (!adviserGroups || adviserGroups.length === 0) {
    return [];
  }

  // Get all group members from all adviser's groups
  const allMemberIds = new Set<Id<"users">>();
  
  for (const group of adviserGroups) {
    // Add project manager and members from each group
    if (group.project_manager_id) {
      allMemberIds.add(group.project_manager_id);
    }
    if (group.member_ids) {
      group.member_ids.forEach((id: Id<"users">) => allMemberIds.add(id));
    }
  }

  // Add the adviser themselves
  allMemberIds.add(currentUser._id);

  // Get all users from Convex
  const groupMembers = await Promise.all(
    Array.from(allMemberIds).map(async (memberId) => {
      return await convex.query(api.fetch.getUserById, { id: memberId });
    }),
  );

  // Filter out null users and get their Clerk profiles for avatars
  const validMembers = groupMembers.filter(
    (member): member is NonNullable<typeof member> => member !== null,
  );

  const users = await Promise.all(
    validMembers.map(async (member, index) => {
      try {
        // Get avatar from Clerk
        const clerkUser = await clerk.users.getUser(member.clerk_id);

        return {
          id: member.clerk_id,
          name: `${member.first_name} ${member.last_name}`,
          avatar: clerkUser.imageUrl || "",
          color: generateUserColor(member.clerk_id, index),
        };
      } catch {
        // If Clerk user not found, return without avatar
        return {
          id: member.clerk_id,
          name: `${member.first_name} ${member.last_name}`,
          avatar: "",
          color: generateUserColor(member.clerk_id, index),
        };
      }
    }),
  );

  return users;
}
