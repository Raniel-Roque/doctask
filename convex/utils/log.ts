import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const LOG_ACTIONS = {
  CREATE: "Create",
  EDIT: "Edit",
  DELETE: "Delete",
  LOCK_ACCOUNT: "Lock Account",
  UNLOCK_ACCOUNT: "Unlock Account",
  BACKUP: "Backup",
  RESTORE: "Restore",
  DELETE_STUDENTS: "Delete Students",
  DELETE_ADVISERS: "Delete Advisers", 
  DELETE_GROUPS: "Delete Groups",
  DELETE_LOGS: "Delete Logs",
  DELETE_ALL_DATA: "Delete All Data",
} as const;

export async function logCreateUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number, // 0 = instructor, 1 = adviser
  affectedEntityId: Id<"users">,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.CREATE,
    details: "Created User",
  });
}

export async function logUpdateUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number, // 0 = instructor, 1 = adviser
  affectedEntityId: Id<"users">,
  details: string,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.EDIT,
    details: details,
  });
}

export async function logDeleteUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number, // 0 = instructor, 1 = adviser
  affectedEntityId: Id<"users">,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.DELETE,
    details: "Deleted User",
  });
}

export async function logCreateGroup(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number, // 0 = instructor, 1 = adviser
  affectedEntityId: Id<"groupsTable">,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.CREATE,
    details: "Created Group",
  });
}

export async function logUpdateGroup(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number, // 0 = instructor, 1 = adviser
  affectedEntityId: Id<"groupsTable">,
  details: string,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.EDIT,
    details,
  });
}

export async function logDeleteGroup(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number, // 0 = instructor, 1 = adviser
  affectedEntityId: Id<"groupsTable">,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.DELETE,
    details: "Deleted Group",
  });
}

export async function logLockAccount(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number, // 0 = instructor, 1 = adviser
  affectedEntityId: Id<"users">,
  action: "lock" | "unlock",
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    action:
      action === "lock" ? LOG_ACTIONS.LOCK_ACCOUNT : LOG_ACTIONS.UNLOCK_ACCOUNT,
    details: action === "lock" ? "Locked Account" : "Unlocked Account",
  });
}

export async function logAcceptGroupRequest(
  ctx: MutationCtx,
  adviserId: Id<"users">,
  groupId: Id<"groupsTable">,
) {
  await ctx.db.insert("LogsTable", {
    user_id: adviserId,
    user_role: 1, // adviser role
    affected_entity_type: "group",
    affected_entity_id: groupId,
    action: "Accept Group Request",
    details: "Accepted group adviser request",
  });
}

export async function logRejectGroupRequest(
  ctx: MutationCtx,
  adviserId: Id<"users">,
  groupId: Id<"groupsTable">,
) {
  await ctx.db.insert("LogsTable", {
    user_id: adviserId,
    user_role: 1, // adviser role
    affected_entity_type: "group",
    affected_entity_id: groupId,
    action: "Reject Group Request",
    details: "Rejected group adviser request",
  });
}

export async function logDocumentReview(
  ctx: MutationCtx,
  adviserId: Id<"users">,
  groupId: Id<"groupsTable">,
  documentPart: string,
  action: "Approve" | "Reject",
) {
  await ctx.db.insert("LogsTable", {
    user_id: adviserId,
    user_role: 1, // adviser role
    affected_entity_type: "group",
    affected_entity_id: groupId,
    action: `${action} Document`,
    details: `${action}d document: ${documentPart}`,
  });
}

export async function logBackup(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "database",
    affected_entity_id: userId, // Use userId as placeholder
    action: LOG_ACTIONS.BACKUP,
    details: "Downloaded backup of database",
  });
}

export async function logRestore(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "database",
    affected_entity_id: userId, // Use userId as placeholder
    action: LOG_ACTIONS.RESTORE,
    details: "Restored database",
  });
}

// New logging functions for selective deletion operations
export async function logDeleteStudents(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number,
  deletedCounts: Record<string, number>,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "students",
    affected_entity_id: userId, // Use userId as placeholder
    action: LOG_ACTIONS.DELETE,
    details: `Deleted students and dependencies: ${JSON.stringify(deletedCounts)}`,
  });
}

export async function logDeleteAdvisers(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number,
  deletedCounts: Record<string, number>,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "advisers",
    affected_entity_id: userId, // Use userId as placeholder
    action: LOG_ACTIONS.DELETE,
    details: `Deleted advisers and dependencies: ${JSON.stringify(deletedCounts)}`,
  });
}

export async function logDeleteGroups(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number,
  deletedCounts: Record<string, number>,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "groups",
    affected_entity_id: userId, // Use userId as placeholder
    action: LOG_ACTIONS.DELETE,
    details: `Deleted groups and dependencies: ${JSON.stringify(deletedCounts)}`,
  });
}

export async function logDeleteAdviserLogs(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number,
  deletedCount: number,
) {
  const logId = await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "database",
    affected_entity_id: userId, // Use userId as placeholder
    action: LOG_ACTIONS.DELETE,
    details: `Deleted ${deletedCount} adviser logs`,
  });
  return logId;
}

export async function logDeleteGeneralLogs(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number,
  deletedCount: number,
) {
  const logId = await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "database",
    affected_entity_id: userId, // Use userId as placeholder
    action: LOG_ACTIONS.DELETE,
    details: `Deleted ${deletedCount} general logs`,
  });
  return logId;
}

export async function logDeleteAllData(
  ctx: MutationCtx,
  userId: Id<"users">,
  userRole: number,
  deletedCounts: Record<string, number>,
) {
  await ctx.db.insert("LogsTable", {
    user_id: userId,
    user_role: userRole,
    affected_entity_type: "database",
    affected_entity_id: userId, // Use userId as placeholder
    action: LOG_ACTIONS.DELETE_ALL_DATA,
    details: `Deleted all data: ${JSON.stringify(deletedCounts)}`,
  });
}
