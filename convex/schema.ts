import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerk_id: v.string(),
    first_name: v.string(),
    middle_name: v.optional(v.string()),
    last_name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("adviser"),
      v.literal("student")
    ),
    subrole: v.optional(
      v.union(v.literal("manager"), v.literal("member"))
    ),
  }).index("by_clerk_id", ["clerk_id"])
});
