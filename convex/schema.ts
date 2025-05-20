import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerk_id: v.string(),
    first_name: v.string(),
    middle_name: v.optional(v.string()),
    last_name: v.string(),
    email: v.string(),
    email_verified: v.boolean(), 
    role: v.int64(), // 0 = student, 1 = adviser, 2 = admin
    subrole: v.optional(v.int64()), // 0 = member, 1 = manager
  }).index("by_clerk_id", ["clerk_id"])
});
