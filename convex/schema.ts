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
    
    // Affected Entity Information
    affected_entity_type: v.string(), // "user" or "group"
    affected_entity_id: v.union(v.id("users"), v.id("groupsTable")), // ID of affected entity
    
    // Log Details
    action: v.string(), 
    details: v.string(), // JSON stringified details of the action
  })
  .index("by_instructor", ["instructor_id"])
  .index("by_action", ["action"])
  .index("by_affected_entity", ["affected_entity_id"]),

  // =========================================
  // Group Documents Table
  // =========================================
  groupDocumentsTable: defineTable({
    // Group Reference
    group_id: v.id("groupsTable"),

    // Current/Latest Version References
    title_page: v.optional(v.id("documents")), // Points to latest version
    acknowledgement: v.optional(v.id("documents")),
    abstract: v.optional(v.id("documents")),
    table_of_contents: v.optional(v.id("documents")),
    chapter1: v.optional(v.id("documents")),
    chapter2: v.optional(v.id("documents")),
    chapter3: v.optional(v.id("documents")),
    chapter4: v.optional(v.id("documents")),
    chapter5: v.optional(v.id("documents")),
    references: v.optional(v.id("documents")),
    resource_person: v.optional(v.id("documents")),
    glossary: v.optional(v.id("documents")),
    appendix_a: v.optional(v.id("documents")),
    appendix_b: v.optional(v.id("documents")),
    appendix_c: v.optional(v.id("documents")),
    appendix_d: v.optional(v.id("documents")),
    appendix_e: v.optional(v.id("documents")),
    appendix_f: v.optional(v.id("documents")),
    appendix_g: v.optional(v.id("documents")),
    appendix_h: v.optional(v.id("documents")),
    appendix_i: v.optional(v.id("documents")),

    // Version History Arrays
    title_page_versions: v.optional(v.array(v.id("documents"))),
    acknowledgement_versions: v.optional(v.array(v.id("documents"))),
    abstract_versions: v.optional(v.array(v.id("documents"))),
    table_of_contents_versions: v.optional(v.array(v.id("documents"))),
    chapter1_versions: v.optional(v.array(v.id("documents"))),
    chapter2_versions: v.optional(v.array(v.id("documents"))),
    chapter3_versions: v.optional(v.array(v.id("documents"))),
    chapter4_versions: v.optional(v.array(v.id("documents"))),
    chapter5_versions: v.optional(v.array(v.id("documents"))),
    references_versions: v.optional(v.array(v.id("documents"))),
    resource_person_versions: v.optional(v.array(v.id("documents"))),
    glossary_versions: v.optional(v.array(v.id("documents"))),
    appendix_a_versions: v.optional(v.array(v.id("documents"))),
    appendix_b_versions: v.optional(v.array(v.id("documents"))),
    appendix_c_versions: v.optional(v.array(v.id("documents"))),
    appendix_d_versions: v.optional(v.array(v.id("documents"))),
    appendix_e_versions: v.optional(v.array(v.id("documents"))),
    appendix_f_versions: v.optional(v.array(v.id("documents"))),
    appendix_g_versions: v.optional(v.array(v.id("documents"))),
    appendix_h_versions: v.optional(v.array(v.id("documents"))),
    appendix_i_versions: v.optional(v.array(v.id("documents"))),
  })
  .index("by_group", ["group_id"]),

  // =========================================
  // Documents Table
  // =========================================
  documents: defineTable({
    // Document Identification
    group_id: v.id("groupsTable"),
    room_id: v.string(),
    
    // Document Content
    title: v.string(),
    content: v.string(),
    
    // Version Control
    submitted: v.boolean(),
    status: v.string(), 
  })
  .index("by_group", ["group_id"])
  .index("by_room", ["room_id"])
});
