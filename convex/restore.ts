import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// =========================================
// DELETE OPERATIONS
// =========================================

export const deleteAllStudents = mutation({
  args: {},
  handler: async (ctx) => {
    const students = await ctx.db.query("studentsTable").collect();
    
    // Batch delete all students
    const deletePromises = students.map(student => ctx.db.delete(student._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: students.length };
  },
});

export const deleteAllAdvisers = mutation({
  args: {},
  handler: async (ctx) => {
    const advisers = await ctx.db.query("advisersTable").collect();
    
    // Batch delete all advisers
    const deletePromises = advisers.map(adviser => ctx.db.delete(adviser._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: advisers.length };
  },
});

export const deleteAllGroups = mutation({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groupsTable").collect();
    
    // Batch delete all groups
    const deletePromises = groups.map(group => ctx.db.delete(group._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: groups.length };
  },
});

export const deleteAllUsers = mutation({
  args: { currentUserId: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    
    // Filter out current user and batch delete
    const usersToDelete = users.filter(user => user._id !== args.currentUserId);
    const deletePromises = usersToDelete.map(user => ctx.db.delete(user._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: usersToDelete.length };
  },
});

export const deleteAllDocuments = mutation({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();
    
    // Batch delete all documents
    const deletePromises = documents.map(doc => ctx.db.delete(doc._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: documents.length };
  },
});

export const deleteAllTaskAssignments = mutation({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("taskAssignments").collect();
    
    // Batch delete all task assignments
    const deletePromises = assignments.map(assignment => ctx.db.delete(assignment._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: assignments.length };
  },
});

export const deleteAllDocumentStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const statuses = await ctx.db.query("documentStatus").collect();
    
    // Batch delete all document statuses
    const deletePromises = statuses.map(status => ctx.db.delete(status._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: statuses.length };
  },
});

export const deleteAllImages = mutation({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    
    // Batch delete files from storage and database records
    const deletePromises = images.map(async (image) => {
      // Delete the file from storage first
      try {
        await ctx.storage.delete(image.file_id);
      } catch {
        // Continue even if storage deletion fails
      }
      // Delete the image record from database
      return ctx.db.delete(image._id);
    });
    
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: images.length };
  },
});

// Add missing delete operations
export const deleteAllNotes = mutation({
  args: {},
  handler: async (ctx) => {
    const notes = await ctx.db.query("notes").collect();
    
    // Batch delete all notes
    const deletePromises = notes.map(note => ctx.db.delete(note._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: notes.length };
  },
});

export const deleteAllLogs = mutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("LogsTable").collect();
    
    // Batch delete all logs
    const deletePromises = logs.map(log => ctx.db.delete(log._id));
    await Promise.all(deletePromises);
    
    return { success: true, deletedCount: logs.length };
  },
});

export const deleteInstructor = mutation({
  args: { instructorId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.instructorId);
    return { success: true };
  },
});

// Comprehensive bulk delete function
export const deleteAllData = mutation({
  args: { 
    currentUserId: v.string(),
    includeImages: v.optional(v.boolean()),
    includeLogs: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const results = {
      users: 0,
      students: 0,
      advisers: 0,
      groups: 0,
      documents: 0,
      taskAssignments: 0,
      documentStatus: 0,
      notes: 0,
      images: 0,
      logs: 0
    };

    try {
      // Parallel fetch all data
      const [
        users,
        students,
        advisers,
        groups,
        documents,
        taskAssignments,
        documentStatus,
        notes,
        images,
        logs
      ] = await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("studentsTable").collect(),
        ctx.db.query("advisersTable").collect(),
        ctx.db.query("groupsTable").collect(),
        ctx.db.query("documents").collect(),
        ctx.db.query("taskAssignments").collect(),
        ctx.db.query("documentStatus").collect(),
        ctx.db.query("notes").collect(),
        args.includeImages !== false ? ctx.db.query("images").collect() : Promise.resolve([]),
        args.includeLogs !== false ? ctx.db.query("LogsTable").collect() : Promise.resolve([])
      ]);

      // Filter out current user
      const usersToDelete = users.filter(user => user._id !== args.currentUserId);
      results.users = usersToDelete.length;

      // Batch delete all data in parallel
      const deletePromises = [
        // Users
        ...usersToDelete.map(user => ctx.db.delete(user._id)),
        // Students
        ...students.map(student => ctx.db.delete(student._id)),
        // Advisers
        ...advisers.map(adviser => ctx.db.delete(adviser._id)),
        // Groups
        ...groups.map(group => ctx.db.delete(group._id)),
        // Documents
        ...documents.map(doc => ctx.db.delete(doc._id)),
        // Task Assignments
        ...taskAssignments.map(task => ctx.db.delete(task._id)),
        // Document Status
        ...documentStatus.map(status => ctx.db.delete(status._id)),
        // Notes
        ...notes.map(note => ctx.db.delete(note._id)),
        // Images (with storage cleanup)
        ...images.map(async (image) => {
          try {
            await ctx.storage.delete(image.file_id);
          } catch {
            // Continue even if storage deletion fails
          }
          return ctx.db.delete(image._id);
        }),
        // Logs
        ...logs.map(log => ctx.db.delete(log._id))
      ];

      // Update counts
      results.students = students.length;
      results.advisers = advisers.length;
      results.groups = groups.length;
      results.documents = documents.length;
      results.taskAssignments = taskAssignments.length;
      results.documentStatus = documentStatus.length;
      results.notes = notes.length;
      results.images = images.length;
      results.logs = logs.length;

      // Execute all deletions in parallel
      await Promise.all(deletePromises);

      return { 
        success: true, 
        deletedCounts: results,
        totalDeleted: Object.values(results).reduce((sum, count) => sum + count, 0)
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        partialResults: results
      };
    }
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
    isDeleted: v.optional(v.boolean()),
    email_verified: v.optional(v.boolean()),
    terms_agreed: v.optional(v.boolean()),
    privacy_agreed: v.optional(v.boolean()),
    terms_agreed_at: v.optional(v.number()),
    privacy_agreed_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();
    const userId = await ctx.db.insert("users", {
      clerk_id: args.clerk_id,
      email: emailLower, // store as lowercase
      email_verified: args.role === 2 ? true : false,
      first_name: args.first_name,
      middle_name: args.middle_name,
      last_name: args.last_name,
      role: args.role,
      subrole: args.subrole,
      isDeleted: args.isDeleted ?? false,
      terms_agreed: args.terms_agreed ?? false,
      privacy_agreed: args.privacy_agreed ?? false,
      terms_agreed_at: args.terms_agreed_at ?? undefined,
      privacy_agreed_at: args.privacy_agreed_at ?? undefined,
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
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Create group directly without any additional logic
    const groupId = await ctx.db.insert("groupsTable", {
      project_manager_id: args.project_manager_id,
      member_ids: args.member_ids,
      adviser_id: args.adviser_id,
      requested_adviser: args.requested_adviser,
      capstone_title: args.capstone_title,
      isDeleted: args.isDeleted ?? false,
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
    isDeleted: v.optional(v.boolean()),
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
      isDeleted: args.isDeleted ?? false,
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
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("advisersTable", {
      adviser_id: args.adviser_id,
      code: args.code,
      group_ids: args.group_ids || [],
      requests_group_ids: args.requests_group_ids || [],
      isDeleted: args.isDeleted ?? false,
    });

    return { success: true };
  },
});

export const restoreDocument = mutation({
  args: {
    group_id: v.id("groupsTable"),
    chapter: v.string(),
    title: v.string(),
    content: v.string(),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("documents", {
      group_id: args.group_id,
      chapter: args.chapter,
      title: args.title,
      content: args.content,
      isDeleted: args.isDeleted ?? false,
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
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("taskAssignments", {
      group_id: args.group_id,
      chapter: args.chapter,
      section: args.section,
      title: args.title,
      task_status: args.task_status,
      assigned_student_ids: args.assigned_student_ids,
      isDeleted: args.isDeleted ?? false,
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
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("documentStatus", {
      group_id: args.group_id,
      document_part: args.document_part,
      review_status: args.review_status,
      note_ids: args.note_ids,
      last_modified: args.last_modified,
      isDeleted: args.isDeleted ?? false,
    });

    return { success: true };
  },
});

export const restoreNote = mutation({
  args: {
    group_id: v.id("groupsTable"),
    document_part: v.string(),
    content: v.string(),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("notes", {
      group_id: args.group_id,
      document_part: args.document_part,
      content: args.content,
      isDeleted: args.isDeleted ?? false,
    });

    return { success: true, noteId };
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
    isDeleted: v.optional(v.boolean()),
    fileData: v.optional(v.string()), // Base64 encoded file data for storage restoration
  },
  handler: async (ctx, args) => {
    // If fileData is provided, restore the file to storage first
    if (args.fileData) {
      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(args.fileData, "base64");

        // Generate upload URL and upload the file
        const uploadUrl = await ctx.storage.generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": args.content_type },
          body: buffer,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // Note: We can't reuse the original file_id, so we'll use the new one
        const { storageId } = await uploadResponse.json();
        // Update the file_id to the new storage ID
        args.file_id = storageId as Id<"_storage">;
      } catch {}
    }

    // Restore to database
    await ctx.db.insert("images", {
      file_id: args.file_id,
      filename: args.filename,
      content_type: args.content_type,
      size: args.size,
      group_id: args.group_id,
      uploaded_by: args.uploaded_by,
      alt_text: args.alt_text,
      url: args.url,
      isDeleted: args.isDeleted ?? false,
    });

    return { success: true };
  },
});

// Helper function to delete image from storage only
export const deleteImageFromStorage = mutation({
  args: {
    file_id: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.storage.delete(args.file_id);
      return { success: true };
    } catch {
      return { success: false, error: "Failed to delete from storage" };
    }
  },
});

// Function to restore image to storage only (without database)
export const restoreImageToStorage = mutation({
  args: {
    file_id: v.id("_storage"),
    fileData: v.string(), // Base64 encoded file data
    content_type: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(args.fileData, "base64");

      // Generate upload URL and upload the file
      const uploadUrl = await ctx.storage.generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": args.content_type },
        body: buffer,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const { storageId } = await uploadResponse.json();
      return { success: true, storageId: storageId as Id<"_storage"> };
    } catch {
      return { success: false, error: "Failed to restore to storage" };
    }
  },
});

export const restoreLog = mutation({
  args: {
    user_id: v.id("users"),
    user_role: v.number(),
    action: v.string(),
    details: v.string(),
    affected_entity_type: v.string(),
    affected_entity_id: v.union(v.id("users"), v.id("groupsTable")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("LogsTable", {
      user_id: args.user_id,
      user_role: args.user_role,
      action: args.action,
      details: args.details,
      affected_entity_type: args.affected_entity_type,
      affected_entity_id: args.affected_entity_id,
    });

    return { success: true };
  },
});

// Batch restore functions for better performance
export const restoreUsers = mutation({
  args: {
    users: v.array(v.object({
      clerk_id: v.string(),
      first_name: v.string(),
      last_name: v.string(),
      email: v.string(),
      role: v.number(),
      middle_name: v.optional(v.string()),
      subrole: v.optional(v.number()),
      isDeleted: v.optional(v.boolean()),
      email_verified: v.optional(v.boolean()),
      terms_agreed: v.optional(v.boolean()),
      privacy_agreed: v.optional(v.boolean()),
      terms_agreed_at: v.optional(v.number()),
      privacy_agreed_at: v.optional(v.number()),
    }))
  },
  handler: async (ctx, args) => {
    const insertPromises = args.users.map(user => {
      const emailLower = user.email.toLowerCase();
      return ctx.db.insert("users", {
        clerk_id: user.clerk_id,
        email: emailLower,
        email_verified: user.role === 2 ? true : false,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        role: user.role,
        subrole: user.subrole,
        isDeleted: user.isDeleted ?? false,
        terms_agreed: user.terms_agreed ?? false,
        privacy_agreed: user.privacy_agreed ?? false,
        terms_agreed_at: user.terms_agreed_at ?? undefined,
        privacy_agreed_at: user.privacy_agreed_at ?? undefined,
      });
    });

    const userIds = await Promise.all(insertPromises);
    return { success: true, userIds, restoredCount: userIds.length };
  },
});

export const restoreGroups = mutation({
  args: {
    groups: v.array(v.object({
      project_manager_id: v.id("users"),
      member_ids: v.array(v.id("users")),
      adviser_id: v.optional(v.id("users")),
      requested_adviser: v.optional(v.id("users")),
      capstone_title: v.optional(v.string()),
      isDeleted: v.optional(v.boolean()),
    }))
  },
  handler: async (ctx, args) => {
    const insertPromises = args.groups.map(group =>
      ctx.db.insert("groupsTable", {
        project_manager_id: group.project_manager_id,
        member_ids: group.member_ids,
        adviser_id: group.adviser_id,
        requested_adviser: group.requested_adviser,
        capstone_title: group.capstone_title,
        isDeleted: group.isDeleted ?? false,
      })
    );

    const groupIds = await Promise.all(insertPromises);
    return { success: true, groupIds, restoredCount: groupIds.length };
  },
});

export const restoreDocuments = mutation({
  args: {
    documents: v.array(v.object({
      group_id: v.id("groupsTable"),
      chapter: v.string(),
      title: v.string(),
      content: v.string(),
      isDeleted: v.optional(v.boolean()),
    }))
  },
  handler: async (ctx, args) => {
    const insertPromises = args.documents.map(doc =>
      ctx.db.insert("documents", {
        group_id: doc.group_id,
        chapter: doc.chapter,
        title: doc.title,
        content: doc.content,
        isDeleted: doc.isDeleted ?? false,
      })
    );

    const documentIds = await Promise.all(insertPromises);
    return { success: true, documentIds, restoredCount: documentIds.length };
  },
});
