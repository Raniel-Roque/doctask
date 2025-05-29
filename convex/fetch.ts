import { query } from "./_generated/server";
import { v } from "convex/values";
import { generateUniqueAdviserCode, validateAdviserCode } from "./utils/adviserCode";

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

// Adviser Code Queries
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

export const getLogs = query({
  handler: async (ctx) => {
    const logs = await ctx.db.query("instructorLogs").collect();
    return logs;
  },
});

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