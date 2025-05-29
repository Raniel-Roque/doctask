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
    role: v.number(), // 0 = student, 1 = adviser, 2 = instructor
    subrole: v.optional(v.number()), // 0 = member, 1 = manager
  }).index("by_clerk_id", ["clerk_id"]),

  // =========================================
  // Adviser Codes Table
  // =========================================
  adviserCodes: defineTable({
    // Adviser Identification
    adviser_id: v.id("users"),
    
    // Code Information
    code: v.string(), // Format: XXXX-XXXX-XXXX where X is a capital letter
    
    // Associated Groups
    group_ids: v.array(v.id("groups")), // Array of group IDs this adviser handles
  })
  .index("by_adviser", ["adviser_id"])
  .index("by_code", ["code"]),

  // =========================================
  // instructor Logs Table
  // =========================================
  instructorLogs: defineTable({
    // Log Identification
    instructor_id: v.id("users"),
    instructor_name: v.string(), // Full name of instructor who performed the action
    
    // Affected User Information (stored directly to prevent data loss on user deletion)
    affected_user_id: v.optional(v.id("users")), // ID of affected user (optional in case user is deleted)
    affected_user_name: v.string(), // Full name of affected user
    affected_user_email: v.string(), // Email of affected user
    
    // Log Details
    action: v.string(), 
    details: v.string(), // JSON stringified details of the action
  })
  .index("by_instructor", ["instructor_id"])
  .index("by_action", ["action"])
  .index("by_affected_user", ["affected_user_id"])
});
