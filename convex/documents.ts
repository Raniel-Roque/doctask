import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    first_name: v.string(),
    middle_name: v.optional(v.string()),
    last_name: v.string(),
    email: v.string(),
    adminId: v.id("users"),
    clerk_id: v.optional(v.string()),
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

    await ctx.db.patch(args.userId, updates);

    // Log the action
    await ctx.db.insert("adminLogs", {
      admin_id: args.adminId,
      action: "edit_user",
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
      timestamp: Date.now(),
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
      action: "delete_user",
      target_user_id: args.userId,
      details: JSON.stringify({
        deleted_user: {
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          email: user.email,
        },
      }),
      timestamp: Date.now(),
    });

    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

export const createUser = mutation({
  args: {
    clerk_id: v.string(),
    first_name: v.string(),
    middle_name: v.optional(v.string()),
    last_name: v.string(),
    email: v.string(),
    role: v.number(),
    adminId: v.id("users"),
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
      });

      // Log the action
      await ctx.db.insert("adminLogs", {
        admin_id: args.adminId,
        action: "create_user",
        target_user_id: userId,
        details: JSON.stringify({
          created_user: {
            first_name: args.first_name,
            middle_name: args.middle_name,
            last_name: args.last_name,
            email: args.email,
            role: args.role,
          },
        }),
        timestamp: Date.now(),
      });

      return { success: true, userId };
    } catch (error) {
      console.error("Failed to create user:", error);
      throw new Error("Failed to create user account");
    }
  },
});
