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
    role: v.number(), // 0 = student, 1 = adviser, 2 = admin
    subrole: v.optional(v.number()), // 0 = member, 1 = manager
  }).index("by_clerk_id", ["clerk_id"]),

  adminLogs: defineTable({
    admin_id: v.id("users"),
    action: v.string(), // "Edit User", "Delete User", "Reset Password"
    target_user_id: v.id("users"),
    details: v.string(), // JSON stringified details of the action
  }).index("by_admin", ["admin_id"])
});
