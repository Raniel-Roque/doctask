import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const LOG_ACTIONS = {
  CREATE: "Create",
  EDIT: "Edit",
  DELETE: "Delete",
  RESET_PASSWORD: "Reset Password",
  LOCK_ACCOUNT: "Lock Account",
  UNLOCK_ACCOUNT: "Unlock Account",
  BACKUP: "Backup",
  RESTORE: "Restore",
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

export async function logResetPassword(
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
    action: LOG_ACTIONS.RESET_PASSWORD,
    details: "Reset Password",
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
