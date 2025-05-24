import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// =========================================
// Schema Definition
// =========================================
export default defineSchema({
  // =========================================
  // Users Table
  // =========================================
  users: defineTable({
    // User Identification
    clerk_id: v.string(),
    email: v.string(),
    email_verified: v.boolean(), 

    // User Information
    first_name: v.string(),
    middle_name: v.optional(v.string()),
    last_name: v.string(),

    // User Roles
    role: v.number(), // 0 = student, 1 = adviser, 2 = admin
    subrole: v.optional(v.number()), // 0 = member, 1 = manager
  }).index("by_clerk_id", ["clerk_id"]),

  // =========================================
  // Admin Logs Table
  // =========================================
  adminLogs: defineTable({
    // Log Identification
    admin_id: v.id("users"),
    admin_name: v.string(), // Full name of admin who performed the action
    
    // Affected User Information (stored directly to prevent data loss on user deletion)
    affected_user_id: v.optional(v.id("users")), // ID of affected user (optional in case user is deleted)
    affected_user_name: v.string(), // Full name of affected user
    affected_user_email: v.string(), // Email of affected user
    
    // Log Details
    action: v.string(), 
    details: v.string(), // JSON stringified details of the action
  })
  .index("by_admin", ["admin_id"])
  .index("by_action", ["action"])
  .index("by_affected_user", ["affected_user_id"])
});
