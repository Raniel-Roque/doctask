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

// =========================================
// User Mutations
// =========================================
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    adminId: v.id("users"),
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    middle_name: v.optional(v.string()),
    clerk_id: v.optional(v.string()),
    isPasswordReset: v.optional(v.boolean()),
    subrole: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const updates: {
      first_name: string;
      last_name: string;
      email: string;
      middle_name?: string;
      email_verified?: boolean;
      clerk_id?: string;
      subrole?: number;
    } = {
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
    };

    if (args.middle_name !== undefined) {
      updates.middle_name = args.middle_name;
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

    // Log the action
    await ctx.db.insert("adminLogs", {
      admin_id: args.adminId,
            action: args.isPasswordReset ? LOG_ACTIONS.RESET_PASSWORD : LOG_ACTIONS.EDIT_USER,
      target_user_id: args.userId,
      details: JSON.stringify({
        previous: {
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          email: user.email,
          clerk_id: user.clerk_id,
        },
        new: updates,
      }),
    });

    return { success: true };
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Log the action before deleting
    await ctx.db.insert("adminLogs", {
      admin_id: args.adminId,
            action: LOG_ACTIONS.DELETE_USER,
      target_user_id: args.userId,
      details: JSON.stringify({
        deleted_user: {
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          email: user.email,
        },
      }),
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
    adminId: v.id("users"),
    subrole: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Check if email already exists in Convex
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    if (existingUser) {
      throw new Error("Email already registered");
    }

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
      await ctx.db.insert("adminLogs", {
        admin_id: args.adminId,
                action: LOG_ACTIONS.CREATE_USER,
        target_user_id: userId,
        details: JSON.stringify({
          created_user: {
            first_name: args.first_name,
            middle_name: args.middle_name,
            last_name: args.last_name,
            email: args.email,
            role: args.role,
            subrole: args.subrole,
          },
        }),
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
        const logs = await ctx.db.query("adminLogs").collect();
        
        // Get user information for each log
        const logsWithUsers = await Promise.all(
            logs.map(async (log) => {
                const admin = await ctx.db.get(log.admin_id);
                const targetUser = await ctx.db.get(log.target_user_id);
                
                return {
                    _id: log._id,
                    name: admin ? `${admin.first_name} ${admin.last_name}` : "Unknown Admin",
                    action: log.action,
                    affectedUser: targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : "Unknown User",
                    details: log.details,
                    timestamp: log._creationTime
                };
            })
        );

        return logsWithUsers;
    },
});
