import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");

    try {
      // Create the user in Convex with the Clerk ID
      const userId = await ctx.db.insert("users", {
        clerk_id: args.clerk_id,
        first_name: args.first_name,
        middle_name: args.middle_name,
        last_name: args.last_name,
        email: args.email,
        email_verified: false,
        role: args.role,
        subrole: args.subrole,
      });

      // Log the action
      await ctx.db.insert("instructorLogs", {
        instructor_id: args.instructorId,
        instructor_name: `${instructor.first_name} ${instructor.last_name}`,
        affected_user_id: userId,
        affected_user_name: `${args.first_name} ${args.last_name}`,
        affected_user_email: args.email,
        action: LOG_ACTIONS.CREATE_USER,
        details: "Created User",
      });

      return { success: true, userId };
    } catch (error) {
      console.error("Failed to create user:", error);
      throw new Error("Failed to create user account");
    }
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
