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
  })
  .index("by_clerk_id", ["clerk_id"])
  .searchIndex("search_by_first_name", {
    searchField: "first_name",
    filterFields: ["role", "email_verified", "subrole"]
  })
  .searchIndex("search_by_last_name", {
    searchField: "last_name",
    filterFields: ["role", "email_verified", "subrole"]
  }),

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
  .index("by_member", ["member_ids"])
  .searchIndex("search_by_capstone_title", {
    searchField: "capstone_title",
    filterFields: ["grade", "adviser_id", "capstone_title"]
  })
  .searchIndex("search_by_project_manager", {
    searchField: "project_manager_id",
    filterFields: ["grade", "adviser_id", "capstone_title"]
  })
  .searchIndex("search_by_member", {
    searchField: "member_ids",
    filterFields: ["grade", "adviser_id", "capstone_title"]
  }),

  // =========================================
  // Students Table (Many-to-Many Relationship)
  // =========================================
  studentsTable: defineTable({
    // Foreign Keys
    user_id: v.id("users"), // Reference to user table
    group_id: v.union(v.id("groupsTable"), v.null()), // Reference to group table or null

    // Secondary Profile Fields
    gender: v.optional(v.number()), // 0 = Male, 1 = Female, 2 = Other
    dateOfBirth: v.optional(v.string()),
    placeOfBirth: v.optional(v.string()),
    nationality: v.optional(v.string()),
    civilStatus: v.optional(v.number()), // 0 = Single, 1 = Married, 2 = Divorced, 3 = Widowed
    religion: v.optional(v.string()),
    homeAddress: v.optional(v.string()),
    contact: v.optional(v.string()),
    tertiaryDegree: v.optional(v.string()),
    tertiarySchool: v.optional(v.string()),
    secondarySchool: v.optional(v.string()),
    secondaryAddress: v.optional(v.string()),
    primarySchool: v.optional(v.string()),
    primaryAddress: v.optional(v.string()),
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
    group_ids: v.optional(v.array(v.id("groupsTable"))), // Array of group IDs this adviser handles
    requests_group_ids: v.optional(v.array(v.id("groupsTable"))), // Array of requesting group IDs this adviser need to accept to handle
  })
  .index("by_adviser", ["adviser_id"])
  .index("by_code", ["code"]),

  // =========================================
  // instructor Logs Table
  // =========================================
  instructorLogs: defineTable({
    // Log Identification
    instructor_id: v.id("users"),
    instructor_first_name: v.optional(v.string()),
    instructor_middle_name: v.optional(v.string()),
    instructor_last_name: v.optional(v.string()),
    instructor_email: v.optional(v.string()),
    
    // Affected Entity Information
    affected_entity_type: v.string(), // "user" or "group"
    affected_entity_id: v.union(v.id("users"), v.id("groupsTable")), // ID of affected entity
    affected_entity_first_name: v.optional(v.string()),
    affected_entity_middle_name: v.optional(v.string()),
    affected_entity_last_name: v.optional(v.string()),
    affected_entity_email: v.optional(v.string()),
    
    // Log Details
    action: v.string(), 
    details: v.string(), // JSON stringified details of the action
  })
  .index("by_instructor", ["instructor_id"])
  .index("by_action", ["action"])
  .index("by_affected_entity", ["affected_entity_id"])
  .searchIndex("search_by_instructor_name", {
    searchField: "instructor_first_name",
    filterFields: ["action", "affected_entity_type"]
  })
  .searchIndex("search_by_instructor_last_name", {
    searchField: "instructor_last_name",
    filterFields: ["action", "affected_entity_type"]
  })
  .searchIndex("search_by_affected_entity_name", {
    searchField: "affected_entity_first_name",
    filterFields: ["action", "affected_entity_type"]
  })
  .searchIndex("search_by_affected_entity_last_name", {
    searchField: "affected_entity_last_name",
    filterFields: ["action", "affected_entity_type"]
  }),

  // =========================================
  // Documents Table (Normalized Versioning)
  // =========================================

  //To version use filters of group_id, part, and creation time (desc)
  documents: defineTable({
    group_id: v.id("groupsTable"),
    part: v.string(), // e.g., "chapter1", "appendix_a", etc.
    room_id: v.string(),
    title: v.string(),
    content: v.string(),
    student_ids: v.array(v.id("users")), // students assigned to this version
  })
    .index("by_group_part", ["group_id", "part"])
    .index("by_room", ["room_id"]),

  // =========================================
  // Group Status Table
  // =========================================
  groupStatus: defineTable({
    group_id: v.id("groupsTable"),
    part: v.string(), // e.g., "chapter1", "appendix_a", etc.
    status: v.number(), // 0 = incomplete, 1 = in_review, 2 = approved
    last_opened: v.optional(v.number()), // timestamp (ms since epoch), optional
  })
  .index("by_group_part", ["group_id", "part"]),
});


