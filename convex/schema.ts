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
    isDeleted: v.boolean(),

    // User Information
    first_name: v.string(),
    middle_name: v.optional(v.string()),
    last_name: v.string(),

    // User Roles
    role: v.number(), // 0 = student, 1 = adviser, 2 = instructor
    subrole: v.optional(v.number()), // 0 = member, 1 = manager

    // Terms Agreement
    terms_agreed: v.optional(v.boolean()), // Whether user has agreed to terms of service
    privacy_agreed: v.optional(v.boolean()), // Whether user has agreed to privacy policy
    terms_agreed_at: v.optional(v.number()), // Timestamp when terms were agreed to
    privacy_agreed_at: v.optional(v.number()), // Timestamp when privacy policy was agreed to
  })
    .index("by_clerk_id", ["clerk_id"])
    .searchIndex("search_by_first_name", {
      searchField: "first_name",
      filterFields: ["role", "email_verified", "subrole"],
    })
    .searchIndex("search_by_last_name", {
      searchField: "last_name",
      filterFields: ["role", "email_verified", "subrole"],
    }),

  // =========================================
  // Groups Table
  // =========================================
  groupsTable: defineTable({
    // Group Information
    capstone_title: v.optional(v.string()),
    capstone_type: v.number(), // 0 = CP1, 1 = CP2
    grade: v.optional(v.number()),
    isDeleted: v.boolean(),

    // Relationships
    project_manager_id: v.id("users"), // Reference to user with role 0 and subrole 1
    member_ids: v.array(v.id("users")), // Array of user IDs with role 0 and subrole 0
    adviser_id: v.optional(v.id("users")),
    requested_adviser: v.optional(v.id("users")), // Adviser requested but not yet assigned
  })
    .index("by_project_manager", ["project_manager_id"])
    .index("by_adviser", ["adviser_id"])
    .index("by_member", ["member_ids"])
    .searchIndex("search_by_capstone_title", {
      searchField: "capstone_title",
      filterFields: ["grade", "adviser_id", "capstone_title"],
    })
    .searchIndex("search_by_project_manager", {
      searchField: "project_manager_id",
      filterFields: ["grade", "adviser_id", "capstone_title"],
    })
    .searchIndex("search_by_member", {
      searchField: "member_ids",
      filterFields: ["grade", "adviser_id", "capstone_title"],
    }),

  // =========================================
  // Students Table (Many-to-Many Relationship)
  // =========================================
  studentsTable: defineTable({
    // Foreign Keys
    user_id: v.id("users"), // Reference to user table
    group_id: v.union(v.id("groupsTable"), v.null()), // Reference to group table or null
    isDeleted: v.boolean(),

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
    isDeleted: v.boolean(),

    // Code Information
    code: v.string(), // Format: XXXX-XXXX-XXXX where X is a capital letter

    // Associated Groups
    group_ids: v.optional(v.array(v.id("groupsTable"))), // Array of group IDs this adviser handles
    requests_group_ids: v.optional(v.array(v.id("groupsTable"))), // Array of requesting group IDs this adviser need to accept to handle
  })
    .index("by_adviser", ["adviser_id"])
    .index("by_code", ["code"]),

  // =========================================
  // Logs Table (Unified for Instructors and Advisers)
  // =========================================
  LogsTable: defineTable({
    // Log Identification
    user_id: v.id("users"), // The user who performed the action
    user_role: v.number(), // 0 = instructor, 1 = adviser
    action: v.string(), // The action performed
    details: v.string(), // JSON stringified details of the action

    // Affected Entity Information
    affected_entity_type: v.string(), // "user" or "group"
    affected_entity_id: v.union(v.id("users"), v.id("groupsTable")), // ID of affected entity
  })
    .index("by_user", ["user_id"])
    .index("by_user_role", ["user_role"])
    .index("by_action", ["action"])
    .index("by_affected_entity", ["affected_entity_id"])
    .index("by_user_and_role", ["user_id", "user_role"]),

  // =========================================
  // Documents Table (Normalized Versioning)
  // =========================================

  //To version use filters of group_id, chapter, and creation time (desc)
  documents: defineTable({
    group_id: v.id("groupsTable"),
    chapter: v.string(), // e.g., "chapter_1", "acknowledgment", etc.
    title: v.string(),
    content: v.string(),
    isDeleted: v.boolean(),
    contributors: v.optional(v.array(v.id("users"))), // User IDs who edited this version
  }).index("by_group_chapter", ["group_id", "chapter"]),

  // =========================================
  // Document Edits Table (Track edits between versions)
  // =========================================
  documentEdits: defineTable({
    documentId: v.id("documents"), // Reference to the live document
    userId: v.id("users"), // User who made the edit
    editedAt: v.number(), // Timestamp of the edit
    versionCreated: v.boolean(), // Whether this edit was captured in a version
  })
    .index("by_document", ["documentId"])
    .index("by_user", ["userId"])
    .index("by_version_status", ["versionCreated"]),

  // =========================================
  // Images Table (For collaborative document images)
  // =========================================
  images: defineTable({
    // File Information
    file_id: v.id("_storage"), // Reference to Convex file storage
    filename: v.string(),
    content_type: v.string(),
    size: v.number(),
    isDeleted: v.boolean(),

    // Access Control
    group_id: v.id("groupsTable"), // Only group members can access
    uploaded_by: v.id("users"),

    // Metadata
    alt_text: v.optional(v.string()),
    url: v.string(), // The public URL for the image
  })
    .index("by_group", ["group_id"])
    .index("by_uploader", ["uploaded_by"])
    .index("by_file_id", ["file_id"]),

  // =========================================
  // Task Assignments Table (Member/Manager Communication)
  // =========================================
  taskAssignments: defineTable({
    // Group and Task Information
    group_id: v.id("groupsTable"),
    chapter: v.string(), // e.g., "chapter_1", "acknowledgment", etc.
    section: v.string(), // e.g., "1.1 Project Context", "acknowledgment", etc.
    title: v.string(), // Display title for the task
    isDeleted: v.boolean(),

    // Task Status and Assignment (for member/manager communication)
    task_status: v.number(), // 0 = incomplete, 1 = completed
    assigned_student_ids: v.array(v.id("users")), // Array of student IDs assigned to this task
  })
    .index("by_group", ["group_id"])
    .index("by_chapter", ["chapter"])
    .index("by_task_status", ["task_status"])
    .index("by_group_chapter", ["group_id", "chapter"])
    .index("by_group_task_status", ["group_id", "task_status"]),

  // =========================================
  // Document Status Table (Instructor/Manager Review Process)
  // =========================================
  documentStatus: defineTable({
    group_id: v.id("groupsTable"),
    document_part: v.string(), // e.g., "chapter1", "appendix_a", etc.
    review_status: v.number(), // 0 = not_submitted, 1 = submitted, 2 = approved, 3 = rejected
    note_ids: v.optional(v.array(v.id("notes"))), // Array of note IDs for this document
    last_modified: v.optional(v.number()), // timestamp (ms since epoch), optional
    isDeleted: v.boolean(),
  })
    .index("by_group", ["group_id"])
    .index("by_document", ["document_part"])
    .index("by_review_status", ["review_status"])
    .index("by_group_document", ["group_id", "document_part"])
    .index("by_group_review_status", ["group_id", "review_status"]),

  // =========================================
  // Notes Table (For document review notes)
  // =========================================
  notes: defineTable({
    group_id: v.id("groupsTable"),
    document_part: v.string(), // e.g., "chapter1", "appendix_a", etc.
    content: v.string(), // The note content
    isDeleted: v.boolean(),
  })
    .index("by_group", ["group_id"])
    .index("by_document", ["document_part"])
    .index("by_group_document", ["group_id", "document_part"]),
});
