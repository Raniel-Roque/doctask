import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =========================================
// DELETE OPERATIONS
// =========================================

export const deleteAllStudents = mutation({
  args: {},
  handler: async (ctx) => {
    const students = await ctx.db.query("studentsTable").collect();
    for (const student of students) {
      await ctx.db.delete(student._id);
    }
    return { success: true };
  },
});

export const deleteAllAdvisers = mutation({
  args: {},
  handler: async (ctx) => {
    const advisers = await ctx.db.query("advisersTable").collect();
    for (const adviser of advisers) {
      await ctx.db.delete(adviser._id);
    }
    return { success: true };
  },
});

export const deleteAllGroups = mutation({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groupsTable").collect();
    for (const group of groups) {
      await ctx.db.delete(group._id);
    }
    return { success: true };
  },
});

export const deleteAllUsers = mutation({
  args: {
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      // Skip deleting the instructor
      if (user._id !== args.instructorId) {
        await ctx.db.delete(user._id);
      }
    }
    return { success: true };
  },
});

// =========================================
// RESTORE OPERATIONS
// =========================================

export const restoreUser = mutation({
  args: {
    clerk_id: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    role: v.number(),
    middle_name: v.optional(v.string()),
    subrole: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Create user directly without any additional logic
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

    return { success: true, userId };
  },
});

export const restoreGroup = mutation({
  args: {
    project_manager_id: v.id("users"),
    member_ids: v.array(v.id("users")),
    adviser_id: v.optional(v.id("users")),
    capstone_title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create group directly without any additional logic
    const groupId = await ctx.db.insert("groupsTable", {
      project_manager_id: args.project_manager_id,
      member_ids: args.member_ids,
      adviser_id: args.adviser_id,
      capstone_title: args.capstone_title,
    });

    return { success: true, groupId };
  },
});

export const restoreStudentEntry = mutation({
  args: {
    user_id: v.id("users"),
    group_id: v.union(v.id("groupsTable"), v.null()),
  },
  handler: async (ctx, args) => {
    // Create student entry directly without any additional logic
    await ctx.db.insert("studentsTable", {
      user_id: args.user_id,
      group_id: args.group_id,
    });

    return { success: true };
  },
});

export const restoreAdviserCode = mutation({
  args: {
    adviser_id: v.id("users"),
    code: v.string(),
    group_ids: v.array(v.id("groupsTable")),
  },
  handler: async (ctx, args) => {
    // Create adviser code directly without any additional logic
    await ctx.db.insert("advisersTable", {
      adviser_id: args.adviser_id,
      code: args.code,
      group_ids: args.group_ids,
    });

    return { success: true };
  },
}); 