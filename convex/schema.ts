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
    target_user_id: v.id("users"),
    
    // Log Details
    action: v.string(), 
    details: v.string(), // JSON stringified details of the action
  }).index("by_admin", ["admin_id"])
});
