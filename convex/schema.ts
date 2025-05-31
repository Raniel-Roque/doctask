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
  // Groups Table
  // =========================================
  groupsTable: defineTable({
    // Group Information
    capstone_title: v.optional(v.string()), 
    grade: v.optional(v.number()),

    // Relationships
    project_manager_id: v.id("users"), // Reference to user with role 0 and subrole 1
    member_ids: v.array(v.id("users")), // Array of user IDs with role 0 and subrole 0
    adviser_id: v.optional(v.id("users")),
  })
  .index("by_project_manager", ["project_manager_id"])
  .index("by_adviser", ["adviser_id"])
  .index("by_member", ["member_ids"]),

  // =========================================
  // Students Table (Many-to-Many Relationship)
  // =========================================
  studentsTable: defineTable({
    // Foreign Keys
    user_id: v.id("users"), // Reference to user table
    group_id: v.union(v.id("groupsTable"), v.null()), // Reference to group table or null
  })
  .index("by_user", ["user_id"])
  .index("by_group", ["group_id"]),

  // =========================================
  // Advisers Table
  // =========================================
  advisersTable: defineTable({
    // Adviser Identification
    adviser_id: v.id("users"),
    
    // Code Information
    code: v.string(), // Format: XXXX-XXXX-XXXX where X is a capital letter
    
    // Associated Groups
    group_ids: v.array(v.id("groupsTable")), // Array of group IDs this adviser handles
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
    
    // Affected Entity Information
    affected_entity_type: v.string(), // "user" or "group"
    affected_entity_id: v.union(v.id("users"), v.id("groupsTable")), // ID of affected entity
    affected_entity_name: v.string(), // Name of affected entity (user name or group title)
    
    // Log Details
    action: v.string(), 
    details: v.string(), // JSON stringified details of the action
  })
  .index("by_instructor", ["instructor_id"])
  .index("by_action", ["action"])
  .index("by_affected_entity", ["affected_entity_id"])
});
