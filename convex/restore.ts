import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =========================================
// DELETE OPERATIONS
// =========================================

export const deleteAllStudents = mutation({
  args: {},
  handler: async (ctx) => {
    const students = await ctx.db.query("studentsTable").collect();
    for (const student of students) {
      await ctx.db.delete(student._id);
    }
    return { success: true };
  },
});

export const deleteAllAdvisers = mutation({
  args: {},
  handler: async (ctx) => {
    const advisers = await ctx.db.query("advisersTable").collect();
    for (const adviser of advisers) {
      await ctx.db.delete(adviser._id);
    }
    return { success: true };
  },
});

export const deleteAllGroups = mutation({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groupsTable").collect();
    for (const group of groups) {
      await ctx.db.delete(group._id);
    }
    return { success: true };
  },
});

export const deleteAllUsers = mutation({
  args: {
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      // Skip deleting the instructor
      if (user._id !== args.instructorId) {
        await ctx.db.delete(user._id);
      }
    }
    return { success: true };
  },
});

export const deleteAllDocuments = mutation({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();
    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }
    return { success: true };
  },
});

export const deleteAllTaskAssignments = mutation({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("taskAssignments").collect();
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }
    return { success: true };
  },
});

export const deleteAllDocumentStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const statuses = await ctx.db.query("documentStatus").collect();
    for (const status of statuses) {
      await ctx.db.delete(status._id);
    }
    return { success: true };
  },
});

export const deleteAllImages = mutation({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    for (const image of images) {
      await ctx.db.delete(image._id);
    }
    return { success: true };
  },
});

// =========================================
// RESTORE OPERATIONS
// =========================================

export const restoreUser = mutation({
  args: {
    clerk_id: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    role: v.number(),
    middle_name: v.optional(v.string()),
    subrole: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Create user directly without any additional logic
    const userId = await ctx.db.insert("users", {
      clerk_id: args.clerk_id,
      email: args.email,
      email_verified: false,
      first_name: args.first_name,
      middle_name: args.middle_name,
      last_name: args.last_name,
      role: args.role,
      subrole: args.subrole,
    });

    return { success: true, userId };
  },
});

export const restoreGroup = mutation({
  args: {
    project_manager_id: v.id("users"),
    member_ids: v.array(v.id("users")),
    adviser_id: v.optional(v.id("users")),
    requested_adviser: v.optional(v.id("users")),
    capstone_title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create group directly without any additional logic
    const groupId = await ctx.db.insert("groupsTable", {
      project_manager_id: args.project_manager_id,
      member_ids: args.member_ids,
      adviser_id: args.adviser_id,
      requested_adviser: args.requested_adviser,
      capstone_title: args.capstone_title,
    });

    return { success: true, groupId };
  },
});

export const restoreStudentEntry = mutation({
  args: {
    user_id: v.id("users"),
    group_id: v.union(v.id("groupsTable"), v.null()),
    gender: v.optional(v.number()),
    dateOfBirth: v.optional(v.string()),
    placeOfBirth: v.optional(v.string()),
    nationality: v.optional(v.string()),
    civilStatus: v.optional(v.number()),
    religion: v.optional(v.string()),
    homeAddress: v.optional(v.string()),
    contact: v.optional(v.string()),
    tertiaryDegree: v.optional(v.string()),
    tertiarySchool: v.optional(v.string()),
    secondarySchool: v.optional(v.string()),
    secondaryAddress: v.optional(v.string()),
    primarySchool: v.optional(v.string()),
    primaryAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("studentsTable", {
      user_id: args.user_id,
      group_id: args.group_id,
      gender: args.gender,
      dateOfBirth: args.dateOfBirth,
      placeOfBirth: args.placeOfBirth,
      nationality: args.nationality,
      civilStatus: args.civilStatus,
      religion: args.religion,
      homeAddress: args.homeAddress,
      contact: args.contact,
      tertiaryDegree: args.tertiaryDegree,
      tertiarySchool: args.tertiarySchool,
      secondarySchool: args.secondarySchool,
      secondaryAddress: args.secondaryAddress,
      primarySchool: args.primarySchool,
      primaryAddress: args.primaryAddress,
    });
    return { success: true };
  },
});

export const restoreAdviserCode = mutation({
  args: {
    adviser_id: v.id("users"),
    code: v.string(),
    group_ids: v.optional(v.array(v.id("groupsTable"))),
    requests_group_ids: v.optional(v.array(v.id("groupsTable"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("advisersTable", {
      adviser_id: args.adviser_id,
      code: args.code,
      group_ids: args.group_ids || [],
      requests_group_ids: args.requests_group_ids || [],
    });

    return { success: true };
  },
});

export const restoreDocument = mutation({
  args: {
    group_id: v.id("groupsTable"),
    chapter: v.string(),
    room_id: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("documents", {
      group_id: args.group_id,
      chapter: args.chapter,
      title: args.title,
      content: args.content,
    });

    return { success: true };
  },
});

export const restoreTaskAssignment = mutation({
  args: {
    group_id: v.id("groupsTable"),
    chapter: v.string(),
    section: v.string(),
    title: v.string(),
    task_status: v.number(),
    assigned_student_ids: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("taskAssignments", {
      group_id: args.group_id,
      chapter: args.chapter,
      section: args.section,
      title: args.title,
      task_status: args.task_status,
      assigned_student_ids: args.assigned_student_ids,
    });

    return { success: true };
  },
});

export const restoreDocumentStatus = mutation({
  args: {
    group_id: v.id("groupsTable"),
    document_part: v.string(),
    review_status: v.number(),
    note_ids: v.optional(v.array(v.id("notes"))),
    last_modified: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("documentStatus", {
      group_id: args.group_id,
      document_part: args.document_part,
      review_status: args.review_status,
      note_ids: args.note_ids,
      last_modified: args.last_modified,
    });

    return { success: true };
  },
});

export const restoreNote = mutation({
  args: {
    group_id: v.id("groupsTable"),
    document_part: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notes", {
      group_id: args.group_id,
      document_part: args.document_part,
      content: args.content,
    });

    return { success: true };
  },
});

export const restoreImage = mutation({
  args: {
    file_id: v.id("_storage"),
    filename: v.string(),
    content_type: v.string(),
    size: v.number(),
    group_id: v.id("groupsTable"),
    uploaded_by: v.id("users"),
    alt_text: v.optional(v.string()),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("images", {
      file_id: args.file_id,
      filename: args.filename,
      content_type: args.content_type,
      size: args.size,
      group_id: args.group_id,
      uploaded_by: args.uploaded_by,
      alt_text: args.alt_text,
      url: args.url,
    });

    return { success: true };
  },
});
