import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateUniqueAdviserCode } from "./utils/adviserCode";
import {
  logCreateUser,
  logUpdateUser,
  logDeleteUser,
  logResetPassword,
  logCreateGroup,
  logUpdateGroup,
  logDeleteGroup,
  logLockAccount,
  logAcceptGroupRequest,
  logRejectGroupRequest,
} from "./utils/log";
import { Id } from "./_generated/dataModel";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

// Backup types and validation
interface ConvexBackup {
  timestamp: string;
  version: string;
  tables: {
    users: unknown[];
    groups: unknown[];
    students: unknown[];
    advisers: unknown[];
    logs: unknown[];
    documents: unknown[];
    taskAssignments: unknown[];
    documentStatus: unknown[];
    images: unknown[];
  };
}

function validateBackupFile(file: unknown): file is ConvexBackup {
  if (!file || typeof file !== "object") {
    throw new Error("Invalid backup file format");
  }

  const backup = file as ConvexBackup;
  if (!backup.timestamp || !backup.version || !backup.tables) {
    throw new Error("Backup file is missing required fields");
  }

  // Validate each table exists and has data
  const requiredTables = [
    "users",
    "groups",
    "students",
    "advisers",
    "logs",
    "documents",
    "taskAssignments",
    "documentStatus",
    "images",
  ];
  for (const table of requiredTables) {
    if (
      !backup.tables[table as keyof typeof backup.tables] ||
      !Array.isArray(backup.tables[table as keyof typeof backup.tables])
    ) {
      throw new Error(`Backup file is missing or has invalid ${table} table`);
    }
  }

  // Validate advisers table has required fields
  const advisers = backup.tables.advisers as Array<{
    adviser_id: string;
    code: string;
    group_ids?: string[];
    requests_group_ids?: string[];
  }>;

  for (const adviser of advisers) {
    if (!adviser.adviser_id || !adviser.code) {
      throw new Error("Adviser record is missing required fields");
    }
  }

  return true;
}

// =========================================
// CREATE OPERATIONS
// =========================================

export const createUser = mutation({
  args: {
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    role: v.number(),
    middle_name: v.optional(v.string()),
    instructorId: v.id("users"),
    subrole: v.optional(v.number()),
    clerk_id: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; userId: Id<"users"> }> => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Get instructor first to fail fast if not found
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");

    // Check if user already exists in Convex by clerk_id first
    const existingUserByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
      .first();

    if (existingUserByClerkId) {
      // If user exists with this clerk_id, return success with existing user ID
      return { success: true, userId: existingUserByClerkId._id };
    }

    // Then check by email as a fallback
    const existingUserByEmail = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingUserByEmail) {
      // If user exists with this email but different clerk_id, something is wrong
      throw new Error(
        "Email already registered with a different account. Please contact support."
      );
    }

    try {
      // Create new user in Convex
      const userId = await ctx.db.insert("users", {
        clerk_id: args.clerk_id,
        email: args.email,
        email_verified: false,
        first_name: args.first_name,
        middle_name: args.middle_name,
        last_name: args.last_name,
        role: args.role,
        subrole: args.subrole,
      });

      // If the user is a student (role 0), create an entry in studentsTable
      if (args.role === 0) {
        await ctx.db.insert("studentsTable", {
          user_id: userId,
          group_id: null, // No group assigned yet
          gender: undefined,
          dateOfBirth: undefined,
          placeOfBirth: undefined,
          nationality: undefined,
          civilStatus: undefined,
          religion: undefined,
          homeAddress: undefined,
          contact: undefined,
          tertiaryDegree: undefined,
          tertiarySchool: undefined,
          secondarySchool: undefined,
          secondaryAddress: undefined,
          primarySchool: undefined,
          primaryAddress: undefined,
        });
      }

      // If the user is an adviser, generate a code
      if (args.role === 1) {
        const code = await generateUniqueAdviserCode(ctx);
        await ctx.db.insert("advisersTable", {
          adviser_id: userId,
          code,
          group_ids: [],
        });
      }

      // Log the user creation with user info
      await logCreateUser(
        ctx,
        args.instructorId,
        0, // instructor role
        userId,
        {
          first_name: args.first_name,
          middle_name: args.middle_name,
          last_name: args.last_name,
          email: args.email,
        },
        {
          first_name: instructor.first_name,
          middle_name: instructor.middle_name,
          last_name: instructor.last_name,
          email: instructor.email,
        }
      );
      return { success: true, userId };
    } catch (error) {
      throw error; // Re-throw the original error
    }
  },
});

export const createGroup = mutation({
  args: {
    project_manager_id: v.id("users"),
    member_ids: v.array(v.id("users")),
    adviser_id: v.optional(v.id("users")),
    capstone_title: v.string(),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");
    const project_manager = await ctx.db.get(args.project_manager_id);
    if (!project_manager) throw new Error("Project manager not found");
    if (args.adviser_id) {
      const adviser = await ctx.db.get(args.adviser_id);
      if (!adviser) throw new Error("Adviser not found");
    }
    // Create the group
    const groupId = await ctx.db.insert("groupsTable", {
      project_manager_id: args.project_manager_id,
      member_ids: args.member_ids,
      adviser_id: args.adviser_id,
      capstone_title: args.capstone_title,
    });

    // Create student table entries for project manager and all members
    const allMembers = [args.project_manager_id, ...args.member_ids];
    for (const memberId of allMembers) {
      const existingEntry = await ctx.db
        .query("studentsTable")
        .withIndex("by_user", (q) => q.eq("user_id", memberId))
        .first();

      if (existingEntry) {
        await ctx.db.patch(existingEntry._id, {
          group_id: groupId,
        });
      } else {
        await ctx.db.insert("studentsTable", {
          user_id: memberId,
          group_id: groupId,
          gender: undefined,
          dateOfBirth: undefined,
          placeOfBirth: undefined,
          nationality: undefined,
          civilStatus: undefined,
          religion: undefined,
          homeAddress: undefined,
          contact: undefined,
          tertiaryDegree: undefined,
          tertiarySchool: undefined,
          secondarySchool: undefined,
          secondaryAddress: undefined,
          primarySchool: undefined,
          primaryAddress: undefined,
        });
      }
    }

    // Create documents for all parts
    const partsAndTitles = [
      ["title_page", "Title Page"],
      ["acknowledgment", "Acknowledgement"],
      ["abstract", "Abstract"],
      ["table_of_contents", "Table of Contents"],
      ["chapter_1", "Chapter 1"],
      ["chapter_2", "Chapter 2"],
      ["chapter_3", "Chapter 3"],
      ["chapter_4", "Chapter 4"],
      ["chapter_5", "Chapter 5"],
      ["references", "References"],
      ["appendix_a", "Appendix A"],
      ["appendix_b", "Appendix B"],
      ["appendix_c", "Appendix C"],
      ["appendix_d", "Appendix D"],
      ["appendix_e", "Appendix E"],
      ["appendix_f", "Appendix F"],
      ["appendix_g", "Appendix G"],
      ["appendix_h", "Appendix H"],
      ["appendix_i", "Appendix I"],
    ];
    for (const [chapter, title] of partsAndTitles) {
      await ctx.db.insert("documents", {
        group_id: groupId,
        chapter,
        title,
        content: "",
      });
    }

    // Create task assignments for all documents and subparts
    const taskAssignments: Array<{
      chapter: string;
      section: string;
      title: string;
    }> = [
      // Regular documents
      {
        chapter: "acknowledgment",
        section: "acknowledgment",
        title: "Acknowledgement",
      },
      { chapter: "abstract", section: "abstract", title: "Abstract" },
      {
        chapter: "table_of_contents",
        section: "table_of_contents",
        title: "Table of Contents",
      },
      { chapter: "chapter_2", section: "chapter_2", title: "Chapter 2" },
      { chapter: "chapter_5", section: "chapter_5", title: "Chapter 5" },
      { chapter: "references", section: "references", title: "References" },
      { chapter: "appendix_b", section: "appendix_b", title: "Appendix B" },
      { chapter: "appendix_c", section: "appendix_c", title: "Appendix C" },
      { chapter: "appendix_e", section: "appendix_e", title: "Appendix E" },
      { chapter: "appendix_f", section: "appendix_f", title: "Appendix F" },
      { chapter: "appendix_g", section: "appendix_g", title: "Appendix G" },
      { chapter: "appendix_h", section: "appendix_h", title: "Appendix H" },
      { chapter: "appendix_i", section: "appendix_i", title: "Appendix I" },

      // Chapter 1 subparts
      {
        chapter: "chapter_1",
        section: "1.1 Project Context",
        title: "1.1 Project Context",
      },
      {
        chapter: "chapter_1",
        section: "1.2 Purpose and Description",
        title: "1.2 Purpose and Description",
      },
      {
        chapter: "chapter_1",
        section: "1.3 Objectives",
        title: "1.3 Objectives",
      },
      {
        chapter: "chapter_1",
        section: "1.4 Scope and Limitations",
        title: "1.4 Scope and Limitations",
      },

      // Chapter 3 subparts
      {
        chapter: "chapter_3",
        section: "3.1 Development",
        title: "3.1 Development",
      },
      {
        chapter: "chapter_3",
        section: "3.2 Implementation",
        title: "3.2 Implementation",
      },

      // Chapter 4 subparts
      {
        chapter: "chapter_4",
        section: "4.1 Methodology",
        title: "4.1 Methodology",
      },
      {
        chapter: "chapter_4",
        section: "4.2 Environment",
        title: "4.2 Environment",
      },
      {
        chapter: "chapter_4",
        section: "4.3 Requirements Specifications",
        title: "4.3 Requirements Specifications",
      },
      { chapter: "chapter_4", section: "4.4 Design", title: "4.4 Design" },
      {
        chapter: "chapter_4",
        section: "4.5 Development",
        title: "4.5 Development",
      },
      {
        chapter: "chapter_4",
        section: "4.6 Verification, Validation, Testing",
        title: "4.6 Verification, Validation, Testing",
      },
      {
        chapter: "chapter_4",
        section: "4.7 Implementation Plan",
        title: "4.7 Implementation Plan",
      },
      {
        chapter: "chapter_4",
        section: "4.8 Installation Processes",
        title: "4.8 Installation Processes",
      },
    ];

    for (const task of taskAssignments) {
      await ctx.db.insert("taskAssignments", {
        group_id: groupId,
        chapter: task.chapter,
        section: task.section,
        title: task.title,
        task_status: 0, // 0 = incomplete
        assigned_student_ids: [],
      });
    }

    // Create document status entries for all documents
    const documentParts = [
      "title_page",
      "acknowledgment",
      "abstract",
      "table_of_contents",
      "chapter_1",
      "chapter_2",
      "chapter_3",
      "chapter_4",
      "chapter_5",
      "references",
      "appendix_a",
      "appendix_b",
      "appendix_c",
      "appendix_d",
      "appendix_e",
      "appendix_f",
      "appendix_g",
      "appendix_h",
      "appendix_i",
    ];

    for (const documentPart of documentParts) {
      const isPreApproved = ["title_page", "appendix_a", "appendix_d"].includes(
        documentPart
      );

      await ctx.db.insert("documentStatus", {
        group_id: groupId,
        document_part: documentPart,
        review_status: isPreApproved ? 2 : 0, // 2 = approved, 0 = not_submitted
        note_ids: undefined,
        last_modified: undefined,
      });
    }

    // Update adviser's group_ids if exists
    if (args.adviser_id) {
      const adviserCode = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviser_id!))
        .first();
      if (adviserCode) {
        await ctx.db.patch(adviserCode._id, {
          group_ids: [...(adviserCode.group_ids || []), groupId],
        });
      }
    }

    // Log the group creation with instructor and project manager info
    await logCreateGroup(
      ctx,
      args.instructorId,
      0, // instructor role
      groupId,
      {
        first_name: instructor.first_name,
        middle_name: instructor.middle_name,
        last_name: instructor.last_name,
        email: instructor.email,
      },
      {
        first_name: project_manager.first_name,
        middle_name: project_manager.middle_name,
        last_name: project_manager.last_name,
        email: project_manager.email,
      }
    );

    return { success: true, groupId };
  },
});

// =========================================
// UPDATE OPERATIONS
// =========================================

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    instructorId: v.id("users"),
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    middle_name: v.optional(v.string()),
    clerk_id: v.optional(v.string()),
    subrole: v.optional(v.number()),
    role: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("instructor not found");

    // Handle subrole changes
    if (args.subrole !== undefined && args.subrole !== user.subrole) {
      // If promoting to manager (subrole 0 -> 1)
      if (args.subrole === 1) {
        // Find and update user's group_id to null in studentsTable
        const existingMemberships = await ctx.db
          .query("studentsTable")
          .withIndex("by_user", (q) => q.eq("user_id", args.userId))
          .collect();

        for (const membership of existingMemberships) {
          // Update studentsTable to set group_id to null
          await ctx.db.patch(membership._id, { group_id: null });

          // Update the group's member_ids if group_id exists
          if (membership.group_id) {
            const group = await ctx.db.get(membership.group_id);
            if (group) {
              await ctx.db.patch(group._id, {
                member_ids: group.member_ids.filter((id) => id !== args.userId),
              });

              // Also remove from any task assignments in that group
              const tasks = await ctx.db
                .query("taskAssignments")
                .withIndex("by_group", (q) =>
                  q.eq("group_id", membership.group_id!)
                )
                .collect();
              for (const task of tasks) {
                const newAssignments = task.assigned_student_ids.filter(
                  (id) => id !== args.userId
                );
                if (
                  newAssignments.length !== task.assigned_student_ids.length
                ) {
                  await ctx.db.patch(task._id, {
                    assigned_student_ids: newAssignments,
                  });
                }
              }
            }
          }
        }
      }

      // If demoting from manager (subrole 1 -> 0)
      if (user.subrole === 1 && args.subrole === 0) {
        // Find groups where user is project manager
        const managedGroups = await ctx.db
          .query("groupsTable")
          .withIndex("by_project_manager", (q) =>
            q.eq("project_manager_id", args.userId)
          )
          .collect();

        for (const group of managedGroups) {
          // Update all members' group_id to null in studentsTable
          const memberships = await ctx.db
            .query("studentsTable")
            .withIndex("by_group", (q) => q.eq("group_id", group._id))
            .collect();

          for (const membership of memberships) {
            await ctx.db.patch(membership._id, { group_id: null });
          }

          // Update adviser's group_ids if exists
          if (group.adviser_id) {
            const adviserCode = await ctx.db
              .query("advisersTable")
              .withIndex("by_adviser", (q) =>
                q.eq("adviser_id", group.adviser_id!)
              )
              .first();

            if (adviserCode) {
              await ctx.db.patch(adviserCode._id, {
                group_ids: (adviserCode.group_ids || []).filter(
                  (id) => id !== group._id
                ),
              });
            }
          }

          // Also remove group from any pending adviser requests
          if (group.requested_adviser) {
            const adviser = await ctx.db
              .query("advisersTable")
              .withIndex("by_adviser", (q) =>
                q.eq("adviser_id", group.requested_adviser!)
              )
              .first();
            if (adviser && adviser.requests_group_ids) {
              await ctx.db.patch(adviser._id, {
                requests_group_ids: adviser.requests_group_ids.filter(
                  (id) => id !== group._id
                ),
              });
            }
          }

          // Delete all documents associated with this group
          const docs = await ctx.db
            .query("documents")
            .withIndex("by_group_chapter", (q) => q.eq("group_id", group._id))
            .collect();
          for (const doc of docs) {
            await ctx.db.delete(doc._id);
          }

          // Delete all task assignments associated with this group
          const taskAssignments = await ctx.db
            .query("taskAssignments")
            .withIndex("by_group", (q) => q.eq("group_id", group._id))
            .collect();
          for (const task of taskAssignments) {
            await ctx.db.delete(task._id);
          }

          // Delete all document status entries associated with this group
          const documentStatuses = await ctx.db
            .query("documentStatus")
            .withIndex("by_group", (q) => q.eq("group_id", group._id))
            .collect();
          for (const status of documentStatuses) {
            await ctx.db.delete(status._id);
          }

          // Delete all images associated with this group
          const images = await ctx.db
            .query("images")
            .withIndex("by_group", (q) => q.eq("group_id", group._id))
            .collect();
          for (const image of images) {
            await ctx.db.delete(image._id);
          }

          // Delete the group
          await ctx.db.delete(group._id);
        }
      }
    }

    const updates: Record<string, unknown> = {
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
    };
    // Only update middle_name if it has been changed
    if (args.middle_name !== user.middle_name) {
      updates.middle_name = args.middle_name || undefined;
    }
    if (args.clerk_id !== undefined) {
      updates.clerk_id = args.clerk_id;
      updates.email_verified = false;
    } else if (args.email !== user.email) {
      updates.email_verified = false;
    }
    if (args.subrole !== undefined) {
      updates.subrole = args.subrole;
    }
    if (args.role !== undefined) {
      updates.role = args.role;
    }
    await ctx.db.patch(args.userId, updates);
    // Create human-readable details for edited fields
    const changes = [];
    if (args.first_name !== user.first_name) {
      changes.push(`First Name: ${user.first_name} → ${args.first_name}`);
    }
    if (args.middle_name !== user.middle_name) {
      const oldMiddleName = user.middle_name || "none";
      const newMiddleName = args.middle_name || "none";
      if (oldMiddleName !== newMiddleName) {
        changes.push(`Middle Name: ${oldMiddleName} → ${newMiddleName}`);
      }
    }
    if (args.last_name !== user.last_name) {
      changes.push(`Last Name: ${user.last_name} → ${args.last_name}`);
    }
    if (args.email !== user.email) {
      changes.push(`Email: ${user.email} → ${args.email}`);
    }
    if (args.subrole !== undefined && args.subrole !== user.subrole) {
      const oldRole =
        user.subrole === 0 ? "Member" : user.subrole === 1 ? "Manager" : "None";
      const newRole =
        args.subrole === 0 ? "Member" : args.subrole === 1 ? "Manager" : "None";
      changes.push(`Role: ${oldRole} → ${newRole}`);
    }
    if (args.role !== undefined && args.role !== user.role) {
      const oldRole =
        user.role === 0
          ? "Student"
          : user.role === 1
            ? "Adviser"
            : "Instructor";
      const newRole =
        args.role === 0
          ? "Student"
          : args.role === 1
            ? "Adviser"
            : "Instructor";
      changes.push(`User Type: ${oldRole} → ${newRole}`);
    }
    // Only log if there are actual changes
    if (changes.length > 0) {
      await logUpdateUser(
        ctx,
        args.instructorId,
        0, // instructor role
        args.userId,
        changes.join("\n"),
        {
          first_name: args.first_name,
          middle_name: args.middle_name,
          last_name: args.last_name,
          email: args.email,
        },
        {
          first_name: instructor.first_name,
          middle_name: instructor.middle_name,
          last_name: instructor.last_name,
          email: instructor.email,
        }
      );
    }
    return { success: true };
  },
});

export const updateGroup = mutation({
  args: {
    groupId: v.id("groupsTable"),
    project_manager_id: v.id("users"),
    member_ids: v.array(v.id("users")),
    adviser_id: v.optional(v.id("users")),
    capstone_title: v.string(),
    grade: v.number(),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");
    const project_manager = await ctx.db.get(args.project_manager_id);
    if (!project_manager) throw new Error("Project manager not found");
    if (args.adviser_id) {
      const adviser = await ctx.db.get(args.adviser_id);
      if (!adviser) throw new Error("Adviser not found");
    }

    // Get old members for cleanup
    const oldMembers = [group.project_manager_id, ...group.member_ids];
    const newMembers = [args.project_manager_id, ...args.member_ids];
    const removedMembers = oldMembers.filter((id) => !newMembers.includes(id));

    // Remove old members from studentsTable if they're no longer in the group
    for (const memberId of removedMembers) {
      const studentEntry = await ctx.db
        .query("studentsTable")
        .withIndex("by_user", (q) => q.eq("user_id", memberId))
        .first();
      if (studentEntry) {
        await ctx.db.patch(studentEntry._id, { group_id: null });
      }
    }

    // Also remove them from any task assignments in this group
    if (removedMembers.length > 0) {
      const tasks = await ctx.db
        .query("taskAssignments")
        .withIndex("by_group", (q) => q.eq("group_id", args.groupId))
        .collect();

      for (const task of tasks) {
        const newAssignments = task.assigned_student_ids.filter(
          (id) => !removedMembers.includes(id)
        );
        if (newAssignments.length !== task.assigned_student_ids.length) {
          await ctx.db.patch(task._id, {
            assigned_student_ids: newAssignments,
          });
        }
      }
    }

    // Add new members to studentsTable if they weren't in the group before
    for (const memberId of newMembers) {
      if (!oldMembers.includes(memberId)) {
        const existingEntry = await ctx.db
          .query("studentsTable")
          .withIndex("by_user", (q) => q.eq("user_id", memberId))
          .first();

        if (existingEntry) {
          await ctx.db.patch(existingEntry._id, {
            group_id: args.groupId,
          });
        } else {
          await ctx.db.insert("studentsTable", {
            user_id: memberId,
            group_id: args.groupId,
            gender: undefined,
            dateOfBirth: undefined,
            placeOfBirth: undefined,
            nationality: undefined,
            civilStatus: undefined,
            religion: undefined,
            homeAddress: undefined,
            contact: undefined,
            tertiaryDegree: undefined,
            tertiarySchool: undefined,
            secondarySchool: undefined,
            secondaryAddress: undefined,
            primarySchool: undefined,
            primaryAddress: undefined,
          });
        }
      }
    }

    // Handle adviser changes
    if (group.adviser_id !== args.adviser_id) {
      // Remove from old adviser's group_ids
      if (group.adviser_id) {
        const oldAdviserCode = await ctx.db
          .query("advisersTable")
          .withIndex("by_adviser", (q) => q.eq("adviser_id", group.adviser_id!))
          .first();
        if (oldAdviserCode) {
          await ctx.db.patch(oldAdviserCode._id, {
            group_ids: (oldAdviserCode.group_ids || []).filter(
              (id) => id !== group._id
            ),
          });
        }
      }

      // Add to new adviser's group_ids
      if (args.adviser_id) {
        const newAdviserCode = await ctx.db
          .query("advisersTable")
          .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviser_id!))
          .first();
        if (newAdviserCode) {
          await ctx.db.patch(newAdviserCode._id, {
            group_ids: [...(newAdviserCode.group_ids || []), args.groupId],
          });
        }
      }
    }

    // Update the group
    await ctx.db.patch(args.groupId, {
      project_manager_id: args.project_manager_id,
      member_ids: args.member_ids,
      adviser_id: args.adviser_id ? args.adviser_id : undefined,
      capstone_title: args.capstone_title,
      grade: args.grade,
    });

    // Create human-readable details for edited fields
    const changes = [];

    // Check capstone title changes
    if (args.capstone_title !== group.capstone_title) {
      changes.push(
        `Capstone Title: ${group.capstone_title || "None"} → ${args.capstone_title}`
      );
    }

    // Check member changes
    const addedMembers = newMembers.filter((id) => !oldMembers.includes(id));

    if (removedMembers.length > 0) {
      changes.push(
        `Members: Removed ${removedMembers.length} Member${removedMembers.length > 1 ? "s" : ""}`
      );
    }
    if (addedMembers.length > 0) {
      changes.push(
        `Members: Added ${addedMembers.length} Member${addedMembers.length > 1 ? "s" : ""}`
      );
    }

    // Check adviser changes
    if (!group.adviser_id && args.adviser_id) {
      const newAdviser = await ctx.db.get(args.adviser_id);
      if (newAdviser) {
        changes.push(
          `Adviser: None -> ${newAdviser.first_name} ${newAdviser.last_name}`
        );
      }
    } else if (group.adviser_id && !args.adviser_id) {
      if (group.adviser_id !== undefined) {
        const oldAdviser = await ctx.db.get(group.adviser_id);
        if (oldAdviser) {
          changes.push(
            `Adviser: ${oldAdviser.first_name} ${oldAdviser.last_name} -> Removed`
          );
        }
      }
    } else if (
      group.adviser_id !== undefined &&
      args.adviser_id !== undefined &&
      group.adviser_id !== args.adviser_id
    ) {
      const oldAdviser = await ctx.db.get(group.adviser_id);
      const newAdviser = await ctx.db.get(args.adviser_id);
      if (oldAdviser && newAdviser) {
        changes.push(
          `Adviser: ${oldAdviser.first_name} ${oldAdviser.last_name} -> ${newAdviser.first_name} ${newAdviser.last_name}`
        );
      }
    }

    // Check grade changes
    if (args.grade !== group.grade) {
      const gradeMap: Record<number, string> = {
        0: "No Grade",
        1: "Failed",
        2: "Redefense",
        3: "Passed",
      };
      const oldGrade =
        group.grade !== undefined ? gradeMap[group.grade] : "None";
      const newGrade = gradeMap[args.grade];
      changes.push(`Grade: ${oldGrade} → ${newGrade}`);
    }

    // Log the update with instructor and project manager info
    await logUpdateGroup(
      ctx,
      args.instructorId,
      0, // instructor role
      args.groupId,
      changes.join("\n"),
      {
        first_name: instructor.first_name,
        middle_name: instructor.middle_name,
        last_name: instructor.last_name,
        email: instructor.email,
      },
      {
        first_name: project_manager.first_name,
        middle_name: project_manager.middle_name,
        last_name: project_manager.last_name,
        email: project_manager.email,
      }
    );

    return { success: true };
  },
});

export const updateEmailStatus = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Only update if email is not already verified
    if (!user.email_verified) {
      await ctx.db.patch(args.userId, {
        email_verified: true,
      });
    }

    return { success: true };
  },
});

export const updateStudentProfile = mutation({
  args: {
    userId: v.id("users"),
    section: v.string(), // "secondary" or "education"
    gender: v.optional(v.number()),
    dateOfBirth: v.optional(v.string()),
    placeOfBirth: v.optional(v.string()),
    nationality: v.optional(v.string()),
    civilStatus: v.optional(v.number()),
    religion: v.optional(v.string()),
    homeAddress: v.optional(v.string()),
    contact: v.optional(v.string()),
    tertiaryDegree: v.optional(v.string()),
    tertiarySchool: v.optional(v.string()),
    secondarySchool: v.optional(v.string()),
    secondaryAddress: v.optional(v.string()),
    primarySchool: v.optional(v.string()),
    primaryAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the student row
    const student = await ctx.db
      .query("studentsTable")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
    if (!student) return { success: false, message: "Student not found" };

    // Sanitize and validate
    const sanitize = (val: string | undefined) =>
      sanitizeInput(val || "", {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true,
        maxLength: 255,
      });

    const updates: Record<string, unknown> = {};
    if (args.section === "secondary") {
      if (args.gender !== undefined) updates.gender = args.gender;
      if (args.dateOfBirth !== undefined)
        updates.dateOfBirth =
          args.dateOfBirth === "" ? undefined : sanitize(args.dateOfBirth);
      if (args.placeOfBirth !== undefined)
        updates.placeOfBirth =
          args.placeOfBirth === "" ? undefined : sanitize(args.placeOfBirth);
      if (args.nationality !== undefined)
        updates.nationality =
          args.nationality === "" ? undefined : sanitize(args.nationality);
      if (args.civilStatus !== undefined)
        updates.civilStatus = args.civilStatus;
      if (args.religion !== undefined)
        updates.religion =
          args.religion === "" ? undefined : sanitize(args.religion);
      if (args.homeAddress !== undefined)
        updates.homeAddress =
          args.homeAddress === "" ? undefined : sanitize(args.homeAddress);
      if (args.contact !== undefined) {
        const contact = args.contact.replace(/[^0-9]/g, "");
        if (contact.length !== 0 && contact.length !== 11) {
          return {
            success: false,
            message: "Contact number must be 11 digits (Philippines).",
          };
        }
        updates.contact = contact === "" ? undefined : contact;
      }
    } else if (args.section === "education") {
      if (args.tertiaryDegree !== undefined)
        updates.tertiaryDegree =
          args.tertiaryDegree === ""
            ? undefined
            : sanitize(args.tertiaryDegree);
      if (args.tertiarySchool !== undefined)
        updates.tertiarySchool =
          args.tertiarySchool === ""
            ? undefined
            : sanitize(args.tertiarySchool);
      if (args.secondarySchool !== undefined)
        updates.secondarySchool =
          args.secondarySchool === ""
            ? undefined
            : sanitize(args.secondarySchool);
      if (args.secondaryAddress !== undefined)
        updates.secondaryAddress =
          args.secondaryAddress === ""
            ? undefined
            : sanitize(args.secondaryAddress);
      if (args.primarySchool !== undefined)
        updates.primarySchool =
          args.primarySchool === "" ? undefined : sanitize(args.primarySchool);
      if (args.primaryAddress !== undefined)
        updates.primaryAddress =
          args.primaryAddress === ""
            ? undefined
            : sanitize(args.primaryAddress);
    }
    if (Object.keys(updates).length === 0) {
      return { success: false, message: "No changes to save." };
    }
    await ctx.db.patch(student._id, updates);
    return { success: true };
  },
});

// =========================================
// DELETE OPERATIONS
// =========================================

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    instructorId: v.id("users"),
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");

    // Store user info for logging
    const userInfo = {
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      email: user.email,
    };

    // Student (member)
    if (user.role === 0 && user.subrole === 0) {
      // Remove from studentsTable
      const studentEntry = await ctx.db
        .query("studentsTable")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId))
        .first();
      if (studentEntry) {
        // Remove from group member_ids if in a group
        if (studentEntry.group_id) {
          const group = await ctx.db.get(studentEntry.group_id);
          if (group) {
            await ctx.db.patch(group._id, {
              member_ids: group.member_ids.filter((id) => id !== args.userId),
            });
          }

          // Also remove user from any task assignments in that group
          const tasks = await ctx.db
            .query("taskAssignments")
            .withIndex("by_group", (q) =>
              q.eq("group_id", studentEntry.group_id!)
            )
            .collect();
          for (const task of tasks) {
            const newAssignments = task.assigned_student_ids.filter(
              (id) => id !== args.userId
            );
            if (newAssignments.length !== task.assigned_student_ids.length) {
              await ctx.db.patch(task._id, {
                assigned_student_ids: newAssignments,
              });
            }
          }
        }
        await ctx.db.delete(studentEntry._id);
      }
    }

    // Student (project manager)
    else if (user.role === 0 && user.subrole === 1) {
      // For each group where user is project_manager_id
      const managedGroups = await ctx.db
        .query("groupsTable")
        .withIndex("by_project_manager", (q) =>
          q.eq("project_manager_id", args.userId)
        )
        .collect();
      for (const group of managedGroups) {
        // For each member, set their studentsTable group_id to null
        for (const memberId of group.member_ids) {
          const memberEntry = await ctx.db
            .query("studentsTable")
            .withIndex("by_user", (q) => q.eq("user_id", memberId))
            .first();
          if (memberEntry) {
            await ctx.db.patch(memberEntry._id, { group_id: null });
          }
        }
        // Remove group from adviser's group_ids
        if (group.adviser_id) {
          const adviserCode = await ctx.db
            .query("advisersTable")
            .withIndex("by_adviser", (q) =>
              q.eq("adviser_id", group.adviser_id!)
            )
            .first();
          if (adviserCode) {
            await ctx.db.patch(adviserCode._id, {
              group_ids: (adviserCode.group_ids || []).filter(
                (id) => id !== group._id
              ),
            });
          }
        }
        // Also remove group from any pending adviser requests
        if (group.requested_adviser) {
          const adviser = await ctx.db
            .query("advisersTable")
            .withIndex("by_adviser", (q) =>
              q.eq("adviser_id", group.requested_adviser!)
            )
            .first();
          if (adviser && adviser.requests_group_ids) {
            await ctx.db.patch(adviser._id, {
              requests_group_ids: adviser.requests_group_ids.filter(
                (id) => id !== group._id
              ),
            });
          }
        }
        // Delete all documents associated with this group
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_group_chapter", (q) => q.eq("group_id", group._id))
          .collect();
        for (const doc of docs) {
          await ctx.db.delete(doc._id);
        }

        // Delete all task assignments associated with this group
        const taskAssignments = await ctx.db
          .query("taskAssignments")
          .withIndex("by_group", (q) => q.eq("group_id", group._id))
          .collect();
        for (const task of taskAssignments) {
          await ctx.db.delete(task._id);
        }

        // Delete all document status entries associated with this group
        const documentStatuses = await ctx.db
          .query("documentStatus")
          .withIndex("by_group", (q) => q.eq("group_id", group._id))
          .collect();
        for (const status of documentStatuses) {
          await ctx.db.delete(status._id);
        }

        // Delete all images associated with this group
        const images = await ctx.db
          .query("images")
          .withIndex("by_group", (q) => q.eq("group_id", group._id))
          .collect();
        for (const image of images) {
          await ctx.db.delete(image._id);
        }

        // Delete the group
        await ctx.db.delete(group._id);
      }
      // Delete their studentsTable entry if exists
      const studentEntry = await ctx.db
        .query("studentsTable")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId))
        .first();
      if (studentEntry) {
        await ctx.db.delete(studentEntry._id);
      }
    }

    // Adviser
    else if (user.role === 1) {
      // For each group where user is adviser, set adviser_id to null
      const advisedGroups = await ctx.db
        .query("groupsTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.userId))
        .collect();
      for (const group of advisedGroups) {
        await ctx.db.patch(group._id, { adviser_id: undefined });
      }

      // Also clear any pending requests for this adviser
      const requestingGroups = await ctx.db
        .query("groupsTable")
        .filter((q) => q.eq(q.field("requested_adviser"), args.userId))
        .collect();
      for (const group of requestingGroups) {
        await ctx.db.patch(group._id, { requested_adviser: undefined });
      }

      // Delete advisersTable entry
      const adviserCode = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.userId))
        .first();
      if (adviserCode) {
        await ctx.db.delete(adviserCode._id);
      }
    }

    // Delete from users table
    await ctx.db.delete(args.userId);

    // Log the deletion with user info
    await logDeleteUser(ctx, args.instructorId, 0, args.userId, userInfo, {
      first_name: instructor.first_name,
      middle_name: instructor.middle_name,
      last_name: instructor.last_name,
      email: instructor.email,
    });

    return { success: true };
  },
});

export const deleteGroup = mutation({
  args: {
    groupId: v.id("groupsTable"),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");
    const project_manager = await ctx.db.get(group.project_manager_id);
    if (!project_manager) throw new Error("Project manager not found");

    // Get all members including project manager
    const allMembers = [group.project_manager_id, ...group.member_ids];

    // Set group_id to null for all members in studentsTable
    for (const memberId of allMembers) {
      const studentEntry = await ctx.db
        .query("studentsTable")
        .withIndex("by_user", (q) => q.eq("user_id", memberId))
        .first();
      if (studentEntry) {
        await ctx.db.patch(studentEntry._id, { group_id: null });
      }
    }

    // Update adviser's group_ids if exists
    if (group.adviser_id) {
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", group.adviser_id!))
        .first();
      if (adviser) {
        await ctx.db.patch(adviser._id, {
          group_ids: (adviser.group_ids || []).filter(
            (id) => id !== args.groupId
          ),
        });
      }
    }

    // Also remove group from any pending adviser requests
    if (group.requested_adviser) {
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) =>
          q.eq("adviser_id", group.requested_adviser!)
        )
        .first();
      if (adviser && adviser.requests_group_ids) {
        await ctx.db.patch(adviser._id, {
          requests_group_ids: adviser.requests_group_ids.filter(
            (id) => id !== group._id
          ),
        });
      }
    }

    // Delete all associated documents
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_group_chapter", (q) => q.eq("group_id", args.groupId))
      .collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    // Delete all task assignments associated with this group
    const taskAssignments = await ctx.db
      .query("taskAssignments")
      .withIndex("by_group", (q) => q.eq("group_id", group._id))
      .collect();
    for (const task of taskAssignments) {
      await ctx.db.delete(task._id);
    }

    // Delete all document status entries associated with this group
    const documentStatuses = await ctx.db
      .query("documentStatus")
      .withIndex("by_group", (q) => q.eq("group_id", group._id))
      .collect();
    for (const status of documentStatuses) {
      await ctx.db.delete(status._id);
    }

    // Delete all images associated with this group
    const images = await ctx.db
      .query("images")
      .withIndex("by_group", (q) => q.eq("group_id", group._id))
      .collect();
    for (const image of images) {
      await ctx.db.delete(image._id);
    }

    // Delete the group
    await ctx.db.delete(args.groupId);

    // Log the deletion with instructor and project manager info
    await logDeleteGroup(
      ctx,
      args.instructorId,
      0, // instructor role
      args.groupId,
      {
        first_name: instructor.first_name,
        middle_name: instructor.middle_name,
        last_name: instructor.last_name,
        email: instructor.email,
      },
      {
        first_name: project_manager.first_name,
        middle_name: project_manager.middle_name,
        last_name: project_manager.last_name,
        email: project_manager.email,
      }
    );

    return { success: true };
  },
});

// =========================================
// MISCELLANEOUS OPERATIONS
// =========================================

export const resetPassword = mutation({
  args: {
    userId: v.id("users"),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");

    // Log the password reset with correct user and instructor info
    await logResetPassword(
      ctx,
      args.instructorId,
      0, // instructor role
      args.userId,
      {
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        email: user.email,
      },
      {
        first_name: instructor.first_name,
        middle_name: instructor.middle_name,
        last_name: instructor.last_name,
        email: instructor.email,
      }
    );
    return { success: true };
  },
});

// =========================================
// BACKUP OPERATIONS
// =========================================

export const downloadConvexBackup = mutation({
  args: {
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");

    // Fetch all data from each table
    const users = await ctx.db.query("users").collect();
    const groups = await ctx.db.query("groupsTable").collect();
    const students = await ctx.db.query("studentsTable").collect();
    const advisers = await ctx.db.query("advisersTable").collect();
    const logs = await ctx.db.query("LogsTable").collect();
    const documents = await ctx.db.query("documents").collect();
    const taskAssignments = await ctx.db.query("taskAssignments").collect();
    const documentStatus = await ctx.db.query("documentStatus").collect();
    const images = await ctx.db.query("images").collect();

    // Create backup object with timestamp
    const backup: ConvexBackup = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      tables: {
        users,
        groups,
        students,
        advisers,
        logs,
        documents,
        taskAssignments,
        documentStatus,
        images,
      },
    };

    // Validate the backup before returning
    validateBackupFile(backup);

    return backup;
  },
});

export const acceptGroupRequest = mutation({
  args: {
    adviserId: v.id("users"),
    groupId: v.id("groupsTable"),
  },
  handler: async (ctx, args) => {
    // Get the adviser's record
    const adviserCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();

    if (!adviserCode) {
      throw new Error("Adviser not found");
    }

    // Verify the group is in requests_group_ids
    if (!adviserCode.requests_group_ids?.includes(args.groupId)) {
      throw new Error("Group is not in pending requests");
    }

    // Get group and user data for logging
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    
    const adviser = await ctx.db.get(args.adviserId);
    const projectManager = await ctx.db.get(group.project_manager_id);
    
    if (!adviser || !projectManager) {
      throw new Error("User data not found");
    }

    // Update the group's adviser_id to requested_adviser and clear requested_adviser
    await ctx.db.patch(args.groupId, {
      adviser_id: group.requested_adviser,
      requested_adviser: undefined,
    });

    // Update adviser's records
    await ctx.db.patch(adviserCode._id, {
      requests_group_ids: adviserCode.requests_group_ids.filter(
        (id) => id !== args.groupId
      ),
      group_ids: [...(adviserCode.group_ids || []), args.groupId],
    });

    // Log the acceptance of the group request
    await logAcceptGroupRequest(
      ctx,
      args.adviserId,
      args.groupId,
      {
        first_name: adviser.first_name,
        middle_name: adviser.middle_name,
        last_name: adviser.last_name,
        email: adviser.email,
      },
      {
        first_name: projectManager.first_name,
        middle_name: projectManager.middle_name,
        last_name: projectManager.last_name,
        email: projectManager.email,
      }
    );

    return { success: true };
  },
});

export const rejectGroupRequest = mutation({
  args: {
    adviserId: v.id("users"),
    groupId: v.id("groupsTable"),
  },
  handler: async (ctx, args) => {
    // Get the adviser's record
    const adviserCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();

    if (!adviserCode) {
      throw new Error("Adviser not found");
    }

    // Verify the group is in requests_group_ids
    if (!adviserCode.requests_group_ids?.includes(args.groupId)) {
      throw new Error("Group is not in pending requests");
    }

    // Get group and user data for logging
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    
    const adviser = await ctx.db.get(args.adviserId);
    const projectManager = await ctx.db.get(group.project_manager_id);
    
    if (!adviser || !projectManager) {
      throw new Error("User data not found");
    }

    // Remove the group from requests_group_ids
    await ctx.db.patch(adviserCode._id, {
      requests_group_ids: adviserCode.requests_group_ids.filter(
        (id) => id !== args.groupId
      ),
    });

    // Clear requested_adviser on the group if it matches this adviser
    if (group.requested_adviser === args.adviserId) {
      await ctx.db.patch(args.groupId, {
        requested_adviser: undefined,
      });
    }

    // Log the rejection of the group request
    await logRejectGroupRequest(
      ctx,
      args.adviserId,
      args.groupId,
      {
        first_name: adviser.first_name,
        middle_name: adviser.middle_name,
        last_name: adviser.last_name,
        email: adviser.email,
      },
      {
        first_name: projectManager.first_name,
        middle_name: projectManager.middle_name,
        last_name: projectManager.last_name,
        email: projectManager.email,
      }
    );

    return { success: true };
  },
});

export const logLockAccountMutation = mutation({
  args: {
    instructorId: v.id("users"),
    affectedEntityId: v.id("users"),
    action: v.union(v.literal("lock"), v.literal("unlock")),
    affectedUserInfo: v.object({
      first_name: v.string(),
      middle_name: v.optional(v.string()),
      last_name: v.string(),
      email: v.string(),
    }),
    instructorInfo: v.object({
      first_name: v.string(),
      middle_name: v.optional(v.string()),
      last_name: v.string(),
      email: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await logLockAccount(
      ctx,
      args.instructorId,
      0, // instructor role
      args.affectedEntityId,
      args.action,
      args.affectedUserInfo,
      args.instructorInfo
    );
  },
});

export const requestAdviserCode = mutation({
  args: {
    adviserCode: v.string(),
    groupId: v.id("groupsTable"),
  },
  handler: async (ctx, args) => {
    const adviser = await ctx.db
      .query("advisersTable")
      .withIndex("by_code", (q) => q.eq("code", args.adviserCode))
      .first();
    if (!adviser) throw new Error("Adviser code not found");
    // Add groupId to requests_group_ids if not already present
    const requests = adviser.requests_group_ids || [];
    if (!requests.includes(args.groupId)) {
      await ctx.db.patch(adviser._id, {
        requests_group_ids: [...requests, args.groupId],
      });
    }
    // Set requested_adviser on the group
    await ctx.db.patch(args.groupId, {
      requested_adviser: adviser.adviser_id,
    });
    return { success: true };
  },
});

export const cancelAdviserRequest = mutation({
  args: {
    adviserCode: v.string(),
    groupId: v.id("groupsTable"),
  },
  handler: async (ctx, args) => {
    const adviser = await ctx.db
      .query("advisersTable")
      .withIndex("by_code", (q) => q.eq("code", args.adviserCode))
      .first();
    if (!adviser) throw new Error("Adviser code not found");
    const requests = adviser.requests_group_ids || [];
    await ctx.db.patch(adviser._id, {
      requests_group_ids: requests.filter((id) => id !== args.groupId),
    });
    // Also clear requested_adviser on the group if it matches this adviser
    const group = await ctx.db.get(args.groupId);
    if (group && group.requested_adviser === adviser.adviser_id) {
      await ctx.db.patch(args.groupId, {
        requested_adviser: undefined,
      });
    }
    return { success: true };
  },
});

// =========================================
// TASK ASSIGNMENT OPERATIONS
// =========================================

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("taskAssignments"),
    newStatus: v.number(), // 0 = incomplete, 1 = completed
    userId: v.id("users"), // User making the change
  },
  handler: async (ctx, args) => {
    // Get the task
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Get the user making the change
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Check if user has permission to update this task
    // Managers can update any task, members can only update tasks they're assigned to
    const isManager = user.subrole === 1;
    const isAssigned = task.assigned_student_ids.includes(args.userId);

    if (!isManager && !isAssigned) {
      throw new Error("You don't have permission to update this task");
    }

    // Update the task status
    await ctx.db.patch(args.taskId, {
      task_status: args.newStatus,
    });

    return { success: true };
  },
});

export const updateTaskAssignment = mutation({
  args: {
    taskId: v.id("taskAssignments"),
    assignedStudentIds: v.array(v.id("users")),
    userId: v.id("users"), // User making the change (should be manager)
  },
  handler: async (ctx, args) => {
    // Get the task
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Get the user making the change
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Only managers can assign tasks
    if (user.subrole !== 1) {
      throw new Error("Only managers can assign tasks");
    }

    // Verify all assigned students are valid
    for (const studentId of args.assignedStudentIds) {
      const student = await ctx.db.get(studentId);
      if (!student || student.role !== 0) {
        throw new Error("Invalid student ID");
      }
    }

    // Update the task assignment
    await ctx.db.patch(args.taskId, {
      assigned_student_ids: args.assignedStudentIds,
    });

    return { success: true };
  },
});

// =========================================
// DOCUMENT STATUS OPERATIONS
// =========================================

export const updateDocumentStatus = mutation({
  args: {
    groupId: v.id("groupsTable"),
    documentPart: v.string(),
    newStatus: v.number(), // 0 = not_submitted, 1 = submitted, 2 = approved, 3 = rejected
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { groupId, documentPart, newStatus, userId } = args;

    try {
      // Check if the user is an adviser
      const user = await ctx.db.get(userId);
      if (!user || user.role !== 1) {
        throw new Error("Only advisers can update document status");
      }

      // Check if the adviser is assigned to this group
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", userId))
        .first();

      if (!adviser?.group_ids?.includes(groupId)) {
        throw new Error("Adviser is not assigned to this group");
      }

      // Check if document status already exists
      const existingStatus = await ctx.db
        .query("documentStatus")
        .withIndex("by_group_document", (q) =>
          q.eq("group_id", groupId).eq("document_part", documentPart)
        )
        .first();

      if (existingStatus) {
        // Update existing status
        await ctx.db.patch(existingStatus._id, {
          review_status: newStatus,
        });
      } else {
        // Create new status entry
        await ctx.db.insert("documentStatus", {
          group_id: groupId,
          document_part: documentPart,
          review_status: newStatus,
          last_modified: Date.now(),
        });
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  },
});

// =========================================
// DOCUMENT OPERATIONS
// =========================================

export const updateDocumentContent = mutation({
  args: {
    documentId: v.id("documents"),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Get the document
      const document = await ctx.db.get(args.documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Get the user
      const user = await ctx.db.get(args.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if user has permission to edit this document
      // Get the group to check membership
      const group = await ctx.db.get(document.group_id);
      if (!group) {
        throw new Error("Group not found");
      }

      // Check if user is part of this group (project manager, member, or adviser)
      const isProjectManager = group.project_manager_id === args.userId;
      const isMember = group.member_ids.includes(args.userId);
      const isAdviser = group.adviser_id === args.userId;
      
      if (!isProjectManager && !isMember && !isAdviser) {
        throw new Error("You don't have permission to edit this document");
      }

      // Update the document content
      await ctx.db.patch(args.documentId, {
        content: args.content,
      });

      // Update the documentStatus last_modified field and status
      const documentStatus = await ctx.db
        .query("documentStatus")
        .withIndex("by_group_document", (q) =>
          q.eq("group_id", document.group_id).eq("document_part", document.chapter)
        )
        .first();

      if (documentStatus) {
        // If the document was rejected (status 3), change it back to not_submitted (status 0)
        // since the user is making changes to address the rejection
        const newStatus = documentStatus.review_status === 3 ? 0 : documentStatus.review_status;
        
        await ctx.db.patch(documentStatus._id, {
          last_modified: Date.now(),
          review_status: newStatus,
        });
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  },
});

export const updateDocumentRoomId = mutation({
  args: {
    documentId: v.id("documents"),
    roomId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Get the document
      const document = await ctx.db.get(args.documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Get the user
      const user = await ctx.db.get(args.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if user has permission to edit this document
      // Get the group to check membership
      const group = await ctx.db.get(document.group_id);
      if (!group) {
        throw new Error("Group not found");
      }

      // Check if user is part of this group (project manager, member, or adviser)
      const isProjectManager = group.project_manager_id === args.userId;
      const isMember = group.member_ids.includes(args.userId);
      const isAdviser = group.adviser_id === args.userId;
      
      if (!isProjectManager && !isMember && !isAdviser) {
        throw new Error("You don't have permission to edit this document");
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  },
});

export const createDocumentVersion = mutation({
  args: {
    groupId: v.id("groupsTable"),
    chapter: v.string(),
    userId: v.id("users"), // User creating the version
  },
  handler: async (ctx, args) => {
    try {
      // Check if user has permission (must be project manager)
      const group = await ctx.db.get(args.groupId);
      if (!group) {
        throw new Error("Group not found");
      }

      // Only project manager can create versions
      if (group.project_manager_id !== args.userId) {
        throw new Error("Only the project manager can create document versions");
      }

      // Get the live document (oldest by creation time - the one with room ID)
      const liveDocument = await ctx.db
        .query("documents")
        .withIndex("by_group_chapter", (q) => 
          q.eq("group_id", args.groupId).eq("chapter", args.chapter)
        )
        .order("asc") // Oldest first (live document with room ID)
        .first();

      if (!liveDocument) {
        throw new Error("No live document found to create version from");
      }

      // Create a new version by copying the live document data
      const newVersionId = await ctx.db.insert("documents", {
        group_id: liveDocument.group_id,
        chapter: liveDocument.chapter,
        title: liveDocument.title,
        content: liveDocument.content,
      });

      return {
        success: true,
        versionId: newVersionId,
        message: "Document version created successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create version",
      };
    }
  },
});

export const approveDocumentVersion = mutation({
  args: {
    versionId: v.id("documents"), // The version to approve
    userId: v.id("users"), // User approving (must be project manager)
  },
  handler: async (ctx, args) => {
    try {
      // Get the version to approve
      const versionDocument = await ctx.db.get(args.versionId);
      if (!versionDocument) {
        throw new Error("Version document not found");
      }

      // Check if user has permission (must be project manager)
      const group = await ctx.db.get(versionDocument.group_id);
      if (!group) {
        throw new Error("Group not found");
      }

      // Only project manager can approve versions
      if (group.project_manager_id !== args.userId) {
        throw new Error("Only the project manager can approve document versions");
      }

      // Find the live document (original/first document by creation time ASC)
      const liveDocument = await ctx.db
        .query("documents")
        .withIndex("by_group_chapter", (q) => 
          q.eq("group_id", versionDocument.group_id).eq("chapter", versionDocument.chapter)
        )
        .order("asc") // Oldest first (original document with room ID)
        .first();

      if (!liveDocument) {
        throw new Error("Live document not found");
      }

      // Prevent approving the live document itself
      if (liveDocument._id === args.versionId) {
        throw new Error("Cannot approve the live document - it's already active");
      }

      // Copy content from version to live document (DATABASE UPDATE)
      await ctx.db.patch(liveDocument._id, {
        content: versionDocument.content,
        title: versionDocument.title, // Also update title if changed
      });

      // NOTE: Frontend must also update the Liveblocks room content after this mutation succeeds
      // The editor should call editor.commands.setContent(versionDocument.content) to sync Liveblocks

      return {
        success: true,
        message: "Version approved and applied to live document",
        liveDocumentId: liveDocument._id,
        approvedContent: versionDocument.content, // Return content for frontend sync
        approvedTitle: versionDocument.title,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to approve version",
      };
    }
  },
});

export const deleteDocumentVersion = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    const group = await ctx.db.get(document.group_id);
    if (!group) throw new Error("Group not found");
    if (group.project_manager_id !== args.userId) {
      throw new Error("Only the project manager can delete document versions");
    }
    await ctx.db.delete(args.documentId);
    return { success: true };
  },
});

// =========================================
// NOTES OPERATIONS
// =========================================

export const createNote = mutation({
  args: {
    groupId: v.id("groupsTable"),
    documentPart: v.string(),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Check if the user is an adviser
      const user = await ctx.db.get(args.userId);
      if (!user || user.role !== 1) {
        throw new Error("Only advisers can create notes");
      }

      // Check if the adviser is assigned to this group
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.userId))
        .first();

      if (!adviser?.group_ids?.includes(args.groupId)) {
        throw new Error("Adviser is not assigned to this group");
      }

      // Create the note
      const noteId = await ctx.db.insert("notes", {
        group_id: args.groupId,
        document_part: args.documentPart,
        content: args.content,
      });

      // Update documentStatus to include the new note
      const existingStatus = await ctx.db
        .query("documentStatus")
        .withIndex("by_group_document", (q) =>
          q.eq("group_id", args.groupId).eq("document_part", args.documentPart)
        )
        .first();

      if (existingStatus) {
        // Update existing status with new note
        await ctx.db.patch(existingStatus._id, {
          note_ids: [...(existingStatus.note_ids || []), noteId],
        });
      } else {
        // Create new status entry with note
        await ctx.db.insert("documentStatus", {
          group_id: args.groupId,
          document_part: args.documentPart,
          review_status: 0, // Default to not_submitted
          note_ids: [noteId],
          last_modified: Date.now(),
        });
      }

      return { success: true, noteId };
    } catch (error) {
      throw error;
    }
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Check if the user is an adviser
      const user = await ctx.db.get(args.userId);
      if (!user || user.role !== 1) {
        throw new Error("Only advisers can update notes");
      }

      // Get the note
      const note = await ctx.db.get(args.noteId);
      if (!note) {
        throw new Error("Note not found");
      }

      // Check if the adviser is assigned to this group
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.userId))
        .first();

      if (!adviser?.group_ids?.includes(note.group_id)) {
        throw new Error("Adviser is not assigned to this group");
      }

      // Update the note
      await ctx.db.patch(args.noteId, {
        content: args.content,
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Check if the user is an adviser
      const user = await ctx.db.get(args.userId);
      if (!user || user.role !== 1) {
        throw new Error("Only advisers can delete notes");
      }

      // Get the note
      const note = await ctx.db.get(args.noteId);
      if (!note) {
        throw new Error("Note not found");
      }

      // Check if the adviser is assigned to this group
      const adviser = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.userId))
        .first();

      if (!adviser?.group_ids?.includes(note.group_id)) {
        throw new Error("Adviser is not assigned to this group");
      }

      // Remove the note from documentStatus
      const existingStatus = await ctx.db
        .query("documentStatus")
        .withIndex("by_group_document", (q) =>
          q.eq("group_id", note.group_id).eq("document_part", note.document_part)
        )
        .first();

      if (existingStatus && existingStatus.note_ids) {
        const updatedNoteIds = existingStatus.note_ids.filter(id => id !== args.noteId);
        await ctx.db.patch(existingStatus._id, {
          note_ids: updatedNoteIds.length > 0 ? updatedNoteIds : undefined,
        });
      }

      // Delete the note
      await ctx.db.delete(args.noteId);

      return { success: true };
    } catch (error) {
      throw error;
    }
  },
});
