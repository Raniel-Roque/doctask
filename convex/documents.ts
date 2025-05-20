import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUsers = query({
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
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
