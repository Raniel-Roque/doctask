import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateUniqueAdviserCode } from "./utils/adviserCode";
import { logCreateUser, logUpdateUser, logDeleteUser, logResetPassword, logCreateGroup, logUpdateGroup, logDeleteGroup, logLockAccount } from "./utils/log";
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
    groupStatus: unknown[];
  };
}

function validateBackupFile(file: unknown): file is ConvexBackup {
  if (!file || typeof file !== 'object') {
    throw new Error("Invalid backup file format");
  }

  const backup = file as ConvexBackup;
  if (!backup.timestamp || !backup.version || !backup.tables) {
    throw new Error("Backup file is missing required fields");
  }

  // Validate each table exists and has data
  const requiredTables = ['users', 'groups', 'students', 'advisers', 'logs', 'documents', 'groupStatus'];
  for (const table of requiredTables) {
    if (!backup.tables[table as keyof typeof backup.tables] || 
        !Array.isArray(backup.tables[table as keyof typeof backup.tables])) {
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
  handler: async (ctx, args): Promise<{ success: boolean; userId: Id<"users"> }> => {
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
      throw new Error("Email already registered with a different account. Please contact support.");
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
      await logCreateUser(ctx, args.instructorId, userId, {
        first_name: args.first_name,
        middle_name: args.middle_name,
        last_name: args.last_name,
        email: args.email
      }, {
        first_name: instructor.first_name,
        middle_name: instructor.middle_name,
        last_name: instructor.last_name,
        email: instructor.email
      });
      return { success: true, userId };
    } catch (error) {
      throw error; // Re-throw the original error
    }
  },
});

export const createAdviserCode = mutation({
  args: {
    adviserId: v.id("users"),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the user is an adviser
    const adviser = await ctx.db.get(args.adviserId);
    if (!adviser) throw new Error("Adviser not found");
    if (adviser.role !== 1) throw new Error("User is not an adviser");
    // Check if adviser already has a code
    const existingCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();
    if (existingCode) {
      throw new Error("Adviser already has a code");
    }
    // Generate unique code
    const code = await generateUniqueAdviserCode(ctx);
    // Create adviser code record
    await ctx.db.insert("advisersTable", {
      adviser_id: args.adviserId,
      code,
      group_ids: [],
    });
    return { success: true, code };
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

    // Create initial documents for all parts
    const partsAndTitles: [string, string][] = [
      ["title_page", "Title Page"],
      ["acknowledgement", "Acknowledgement"],
      ["abstract", "Abstract"],
      ["table_of_contents", "Table of Contents"],
      ["chapter1", "Chapter 1"],
      ["chapter2", "Chapter 2"],
      ["chapter3", "Chapter 3"],
      ["chapter4", "Chapter 4"],
      ["chapter5", "Chapter 5"],
      ["references", "References"],
      ["resource_person", "Resource Person"],
      ["glossary", "Glossary"],
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
    for (const [part, title] of partsAndTitles) {
      await ctx.db.insert("documents", {
        group_id: groupId,
        part,
        room_id: "",
        title,
        content: "",
        student_ids: [args.project_manager_id],
      });
      await ctx.db.insert("groupStatus", {
        group_id: groupId,
        part,
        status: 0, // 0 = incomplete
        // last_opened is omitted on creation
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
    await logCreateGroup(ctx, args.instructorId, groupId, {
      first_name: instructor.first_name,
      middle_name: instructor.middle_name,
      last_name: instructor.last_name,
      email: instructor.email
    }, {
      first_name: project_manager.first_name,
      middle_name: project_manager.middle_name,
      last_name: project_manager.last_name,
      email: project_manager.email
    });

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
                member_ids: group.member_ids.filter(id => id !== args.userId)
              });
            }
          }
        }
      }
      
      // If demoting from manager (subrole 1 -> 0)
      if (user.subrole === 1 && args.subrole === 0) {
        // Find groups where user is project manager
        const managedGroups = await ctx.db
          .query("groupsTable")
          .withIndex("by_project_manager", (q) => q.eq("project_manager_id", args.userId))
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
              .withIndex("by_adviser", (q) => q.eq("adviser_id", group.adviser_id!))
              .first();
            
            if (adviserCode) {
              await ctx.db.patch(adviserCode._id, {
                group_ids: (adviserCode.group_ids || []).filter(id => id !== group._id)
              });
            }
          }
          
          // Delete all documents associated with this group
          const docs = await ctx.db
            .query("documents")
            .withIndex("by_group_part", (q) => q.eq("group_id", group._id))
            .collect();
          for (const doc of docs) {
            await ctx.db.delete(doc._id);
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
      const oldMiddleName = user.middle_name || 'none';
      const newMiddleName = args.middle_name || 'none';
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
      const oldRole = user.subrole === 0 ? 'Member' : user.subrole === 1 ? 'Manager' : 'None';
      const newRole = args.subrole === 0 ? 'Member' : args.subrole === 1 ? 'Manager' : 'None';
      changes.push(`Role: ${oldRole} → ${newRole}`);
    }
    if (args.role !== undefined && args.role !== user.role) {
      const oldRole = user.role === 0 ? 'Student' : user.role === 1 ? 'Adviser' : 'Instructor';
      const newRole = args.role === 0 ? 'Student' : args.role === 1 ? 'Adviser' : 'Instructor';
      changes.push(`User Type: ${oldRole} → ${newRole}`);
    }
    // Only log if there are actual changes
    if (changes.length > 0) {
      await logUpdateUser(ctx, args.instructorId, args.userId, changes.join("\n"), {
        first_name: args.first_name,
        middle_name: args.middle_name,
        last_name: args.last_name,
        email: args.email
      }, {
        first_name: instructor.first_name,
        middle_name: instructor.middle_name,
        last_name: instructor.last_name,
        email: instructor.email
      });
    }
    return { success: true };
  },
});

export const updateAdviserGroups = mutation({
  args: {
    adviserId: v.id("users"),
    groupIds: v.array(v.id("groupsTable")),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the adviser code exists
    const adviserCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();
    if (!adviserCode) {
      throw new Error("Adviser code not found");
    }
    // Update the groups
    await ctx.db.patch(adviserCode._id, {
      group_ids: args.groupIds,
    });
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

    // Remove old members from studentsTable if they're no longer in the group
    for (const memberId of oldMembers) {
      if (!newMembers.includes(memberId)) {
        const studentEntry = await ctx.db
          .query("studentsTable")
          .withIndex("by_user", (q) => q.eq("user_id", memberId))
          .first();
        if (studentEntry) {
          await ctx.db.patch(studentEntry._id, { group_id: null });
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
            group_ids: (oldAdviserCode.group_ids || []).filter(id => id !== args.groupId),
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
      changes.push(`Capstone Title: ${group.capstone_title || 'None'} → ${args.capstone_title}`);
    }

    // Check member changes
    const removedMembers = oldMembers.filter(id => !newMembers.includes(id));
    const addedMembers = newMembers.filter(id => !oldMembers.includes(id));
    
    if (removedMembers.length > 0) {
      changes.push(`Members: Removed ${removedMembers.length} Member${removedMembers.length > 1 ? 's' : ''}`);
    }
    if (addedMembers.length > 0) {
      changes.push(`Members: Added ${addedMembers.length} Member${addedMembers.length > 1 ? 's' : ''}`);
    }

    // Check adviser changes
    if (!group.adviser_id && args.adviser_id) {
      const newAdviser = await ctx.db.get(args.adviser_id);
      if (newAdviser) {
        changes.push(`Adviser: None -> ${newAdviser.first_name} ${newAdviser.last_name}`);
      }
    } else if (group.adviser_id && !args.adviser_id) {
      if (group.adviser_id !== undefined) {
        const oldAdviser = await ctx.db.get(group.adviser_id);
        if (oldAdviser) {
          changes.push(`Adviser: ${oldAdviser.first_name} ${oldAdviser.last_name} -> Removed`);
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
        changes.push(`Adviser: ${oldAdviser.first_name} ${oldAdviser.last_name} -> ${newAdviser.first_name} ${newAdviser.last_name}`);
      }
    }

    // Check grade changes
    if (args.grade !== group.grade) {
      const gradeMap: Record<number, string> = {
        0: 'No Grade',
        1: 'Failed',
        2: 'Redefense',
        3: 'Passed',
      };
      const oldGrade = group.grade !== undefined ? gradeMap[group.grade] : 'None';
      const newGrade = gradeMap[args.grade];
      changes.push(`Grade: ${oldGrade} → ${newGrade}`);
    }

    // Log the update with instructor and project manager info
    await logUpdateGroup(ctx, args.instructorId, args.groupId, changes.join("\n"), {
      first_name: instructor.first_name,
      middle_name: instructor.middle_name,
      last_name: instructor.last_name,
      email: instructor.email
    }, {
      first_name: project_manager.first_name,
      middle_name: project_manager.middle_name,
      last_name: project_manager.last_name,
      email: project_manager.email
    });

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
        email_verified: true
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
      sanitizeInput(val || "", { trim: true, removeHtml: true, escapeSpecialChars: true, maxLength: 255 });

    const updates: Record<string, unknown> = {};
    if (args.section === "secondary") {
      if (args.gender !== undefined) updates.gender = args.gender;
      if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth === "" ? undefined : sanitize(args.dateOfBirth);
      if (args.placeOfBirth !== undefined) updates.placeOfBirth = args.placeOfBirth === "" ? undefined : sanitize(args.placeOfBirth);
      if (args.nationality !== undefined) updates.nationality = args.nationality === "" ? undefined : sanitize(args.nationality);
      if (args.civilStatus !== undefined) updates.civilStatus = args.civilStatus;
      if (args.religion !== undefined) updates.religion = args.religion === "" ? undefined : sanitize(args.religion);
      if (args.homeAddress !== undefined) updates.homeAddress = args.homeAddress === "" ? undefined : sanitize(args.homeAddress);
      if (args.contact !== undefined) {
        const contact = args.contact.replace(/[^0-9]/g, "");
        if (contact.length !== 0 && contact.length !== 11) {
          return { success: false, message: "Contact number must be 11 digits (Philippines)." };
        }
        updates.contact = contact === "" ? undefined : contact;
      }
    } else if (args.section === "education") {
      if (args.tertiaryDegree !== undefined) updates.tertiaryDegree = args.tertiaryDegree === "" ? undefined : sanitize(args.tertiaryDegree);
      if (args.tertiarySchool !== undefined) updates.tertiarySchool = args.tertiarySchool === "" ? undefined : sanitize(args.tertiarySchool);
      if (args.secondarySchool !== undefined) updates.secondarySchool = args.secondarySchool === "" ? undefined : sanitize(args.secondarySchool);
      if (args.secondaryAddress !== undefined) updates.secondaryAddress = args.secondaryAddress === "" ? undefined : sanitize(args.secondaryAddress);
      if (args.primarySchool !== undefined) updates.primarySchool = args.primarySchool === "" ? undefined : sanitize(args.primarySchool);
      if (args.primaryAddress !== undefined) updates.primaryAddress = args.primaryAddress === "" ? undefined : sanitize(args.primaryAddress);
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
      email: user.email
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
              member_ids: group.member_ids.filter(id => id !== args.userId)
            });
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
        .withIndex("by_project_manager", (q) => q.eq("project_manager_id", args.userId))
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
            .withIndex("by_adviser", (q) => q.eq("adviser_id", group.adviser_id!))
            .first();
          if (adviserCode) {
            await ctx.db.patch(adviserCode._id, {
              group_ids: (adviserCode.group_ids || []).filter(id => id !== group._id)
            });
          }
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
    await logDeleteUser(ctx, args.instructorId, args.userId, userInfo, {
      first_name: instructor.first_name,
      middle_name: instructor.middle_name,
      last_name: instructor.last_name,
      email: instructor.email
    });

    return { success: true };
  },
});

export const deleteAdviserCode = mutation({
  args: {
    adviserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the adviser code
    const adviserCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();
    if (!adviserCode) {
      return { success: true }; // No code to delete
    }
    // Delete the adviser code
    await ctx.db.delete(adviserCode._id);
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
      const adviserCode = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", group.adviser_id!))
        .first();
      if (adviserCode) {
        await ctx.db.patch(adviserCode._id, {
          group_ids: (adviserCode.group_ids || []).filter(id => id !== args.groupId)
        });
      }
    }

    // Delete all documents associated with this group
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_group_part", (q) => q.eq("group_id", args.groupId))
      .collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    // Delete all groupStatus entries for this group
    const statuses = await ctx.db
      .query("groupStatus")
      .withIndex("by_group_part", (q) => q.eq("group_id", args.groupId))
      .collect();
    for (const status of statuses) {
      await ctx.db.delete(status._id);
    }

    // Delete the group
    await ctx.db.delete(args.groupId);

    // Log the deletion with instructor and project manager info
    await logDeleteGroup(ctx, args.instructorId, args.groupId, {
      first_name: instructor.first_name,
      middle_name: instructor.middle_name,
      last_name: instructor.last_name,
      email: instructor.email
    }, {
      first_name: project_manager.first_name,
      middle_name: project_manager.middle_name,
      last_name: project_manager.last_name,
      email: project_manager.email
    });

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
      args.userId,
      {
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        email: user.email
      },
      {
        first_name: instructor.first_name,
        middle_name: instructor.middle_name,
        last_name: instructor.last_name,
        email: instructor.email
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
    const logs = await ctx.db.query("instructorLogs").collect();
    const documents = await ctx.db.query("documents").collect();
    const groupStatus = await ctx.db.query("groupStatus").collect();

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
        groupStatus
      }
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

    // Update the group's adviser_id to requested_adviser and clear requested_adviser
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    await ctx.db.patch(args.groupId, {
      adviser_id: group.requested_adviser,
      requested_adviser: undefined,
    });

    // Update adviser's records
    await ctx.db.patch(adviserCode._id, {
      requests_group_ids: adviserCode.requests_group_ids.filter(id => id !== args.groupId),
      group_ids: [...(adviserCode.group_ids || []), args.groupId]
    });

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

    // Remove the group from requests_group_ids
    await ctx.db.patch(adviserCode._id, {
      requests_group_ids: adviserCode.requests_group_ids.filter(id => id !== args.groupId)
    });

    // Clear requested_adviser on the group if it matches this adviser
    const group = await ctx.db.get(args.groupId);
    if (group && group.requested_adviser === args.adviserId) {
      await ctx.db.patch(args.groupId, {
        requested_adviser: undefined,
      });
    }

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