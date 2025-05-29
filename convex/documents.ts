import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateUniqueAdviserCode, validateAdviserCode } from "./utils/adviserCode";

// =========================================
// Constants
// =========================================
const LOG_ACTIONS = {
    CREATE_USER: "Create User",
    EDIT_USER: "Edit User",
    DELETE_USER: "Delete User",
    RESET_PASSWORD: "Reset Password"
} as const;

// =========================================
// User Queries
// =========================================
export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id); // returns null if not found
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerkId))
      .first();

    return user; // will return null if not found
  },
});

export const getAdvisers = query({
  handler: async (ctx) => {
    const advisers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 1))
      .collect();
    
    return advisers;
  },
});

export const getStudents = query({
  handler: async (ctx) => {
    const students = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), 0))
      .collect();
    
    return students;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    return user;
  },
});

// =========================================
// Adviser Code Queries
// =========================================
interface AdviserCode {
  _id: string;
  adviser_id: string;
  code: string;
  group_ids: string[];
}

export const getAdviserCodes = query({
  handler: async (ctx) => {
    const codes = await ctx.db
      .query("advisersTable")
      .collect();
    
    // Convert array to object with adviser_id as key
    return codes.reduce((acc, code) => {
      acc[code.adviser_id] = code;
      return acc;
    }, {} as Record<string, AdviserCode>);
  },
});

export const getAdviserCode = query({
  args: { adviserId: v.id("users") },
  handler: async (ctx, args) => {
    const code = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();
    
    return code;
  },
});

export const getAdviserByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    if (!validateAdviserCode(args.code)) {
      throw new Error("Invalid adviser code format");
    }

    const adviserCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!adviserCode) {
      return null;
    }

    const adviser = await ctx.db.get(adviserCode.adviser_id);
    return adviser;
  },
});

// =========================================
// User Mutations
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

    // Log the password reset
    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: args.userId,
      affected_user_name: `${user.first_name} ${user.last_name}`,
      affected_user_email: user.email,
      action: LOG_ACTIONS.RESET_PASSWORD,
      details: "Password was reset",
    });

    return { success: true };
  },
});

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
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("instructor not found");

    const updates: {
      first_name: string;
      last_name: string;
      email: string;
      middle_name?: string | undefined;
      email_verified?: boolean;
      clerk_id?: string;
      subrole?: number;
    } = {
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

    // Only log if there are actual changes
    if (changes.length > 0) {
      await ctx.db.insert("instructorLogs", {
        instructor_id: args.instructorId,
        instructor_name: `${instructor.first_name} ${instructor.last_name}`,
        affected_user_id: args.userId,
        affected_user_name: `${user.first_name} ${user.last_name}`,
        affected_user_email: user.email,
        action: LOG_ACTIONS.EDIT_USER,
        details: changes.join("\n"),
      });
    }

    return { success: true };
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    instructorId: v.id("users"),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");

    // Log the action before deleting
    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: args.userId,
      affected_user_name: `${user.first_name} ${user.last_name}`,
      affected_user_email: user.email,
      action: LOG_ACTIONS.DELETE_USER,
      details: args.details || "Deleted User",
    });

    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

export const createUser = mutation({
  args: {
    clerk_id: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    role: v.number(),
    middle_name: v.optional(v.string()),
    instructorId: v.id("users"),
    subrole: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Get instructor first to fail fast if not found
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");

    // Check if user already exists in Convex
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    if (existingUser) {
      // If user exists but doesn't have a clerk_id, update it
      if (!existingUser.clerk_id) {
        await ctx.db.patch(existingUser._id, {
          clerk_id: args.clerk_id,
          email_verified: false
        });
        return { success: true, userId: existingUser._id };
      }
      // If user exists with a different clerk_id, throw error
      if (existingUser.clerk_id !== args.clerk_id) {
        throw new Error("Email already registered. Please choose another email.");
      }
      // If user exists with same clerk_id, return success
      return { success: true, userId: existingUser._id };
    }

    // Create new user
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

    // If the user is an adviser, generate a code
    if (args.role === 1) {
      try {
        const code = await generateUniqueAdviserCode(ctx);
        await ctx.db.insert("advisersTable", {
          adviser_id: userId,
          code,
          group_ids: [],
        });
      } catch (error) {
        console.error("Failed to generate adviser code:", error);
        // Don't throw here - we still want the user to be created even if code generation fails
      }
    }

    // Log the user creation
    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: userId,
      affected_user_name: `${args.first_name} ${args.last_name}`,
      affected_user_email: args.email,
      action: LOG_ACTIONS.CREATE_USER,
      details: `Created new ${args.role === 1 ? "adviser" : "student"}`,
    });

    return { success: true, userId };
  },
});

// =========================================
// Log Queries
// =========================================
export const getLogs = query({
    handler: async (ctx) => {
        const logs = await ctx.db.query("instructorLogs").collect();
        return logs;
    },
});

// =========================================
// Adviser Code Mutations
// =========================================
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

    // Log the code creation
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");

    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: args.adviserId,
      affected_user_name: `${adviser.first_name} ${adviser.last_name}`,
      affected_user_email: adviser.email,
      action: "Create Adviser Code",
      details: `Generated adviser code: ${code}`,
    });

    return { success: true, code };
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

    // Log the update
    const adviser = await ctx.db.get(args.adviserId);
    const instructor = await ctx.db.get(args.instructorId);
    if (!adviser || !instructor) throw new Error("User not found");

    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: args.adviserId,
      affected_user_name: `${adviser.first_name} ${adviser.last_name}`,
      affected_user_email: adviser.email,
      action: "Update Adviser Groups",
      details: `Updated groups for adviser code: ${adviserCode.code}`,
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

// =========================================
// Group Queries
// =========================================
export const getGroups = query({
  handler: async (ctx) => {
    const groups = await ctx.db
      .query("groupsTable")
      .collect();
    
    return groups;
  },
});

export const getUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .collect();
    
    return users;
  },
});

// =========================================
// Group Creation Mutation
// =========================================
export const createGroupWithMembers = mutation({
  args: {
    projectManagerId: v.id("users"),
    memberIds: v.optional(v.array(v.id("users"))),
    adviserId: v.optional(v.id("users")),
    capstoneTitle: v.optional(v.string()),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Create the group
    const groupId = await ctx.db.insert("groupsTable", {
      project_manager_id: args.projectManagerId,
      member_ids: args.memberIds ?? [],
      adviser_id: args.adviserId,
      capstone_title: args.capstoneTitle,
      grade: 0,
    });

    // 2. Update studentsTable for project manager
    await ctx.db.insert("studentsTable", {
      user_id: args.projectManagerId,
      group_id: groupId,
    });

    // 3. Update studentsTable for each member
    if (args.memberIds && args.memberIds.length > 0) {
      for (const memberId of args.memberIds) {
        await ctx.db.insert("studentsTable", {
          user_id: memberId,
          group_id: groupId,
        });
      }
    }

    // 4. Update advisersTable group_ids if adviser is provided
    if (args.adviserId) {
      const adviserCode = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId!))
        .first();
      if (adviserCode) {
        await ctx.db.patch(adviserCode._id, {
          group_ids: [...adviserCode.group_ids, groupId],
        });
      }
    }

    // 5. Log the group creation
    const instructor = await ctx.db.get(args.instructorId);
    if (instructor) {
      await ctx.db.insert("instructorLogs", {
        instructor_id: args.instructorId,
        instructor_name: `${instructor.first_name} ${instructor.last_name}`,
        affected_user_id: args.projectManagerId,
        affected_user_name: "Group Creation",
        affected_user_email: "-",
        action: "Create Group",
        details: `Created group with project manager ${args.projectManagerId}`,
      });
    }

    return { success: true, groupId };
  },
});
