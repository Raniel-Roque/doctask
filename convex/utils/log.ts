import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const LOG_ACTIONS = {
  CREATE: "Create",
  EDIT: "Edit",
  DELETE: "Delete",
  RESET_PASSWORD: "Reset Password",
  LOCK_ACCOUNT: "Lock Account",
  UNLOCK_ACCOUNT: "Unlock Account",
} as const;

interface UserInfo {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
}

export async function logCreateUser(
  ctx: MutationCtx,
  instructorId: Id<"users">,
  affectedEntityId: Id<"users">,
  userInfo: UserInfo,
  instructorInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    instructor_first_name: instructorInfo.first_name,
    instructor_middle_name: instructorInfo.middle_name,
    instructor_last_name: instructorInfo.last_name,
    instructor_email: instructorInfo.email,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_entity_first_name: userInfo.first_name,
    affected_entity_middle_name: userInfo.middle_name,
    affected_entity_last_name: userInfo.last_name,
    affected_entity_email: userInfo.email,
    action: LOG_ACTIONS.CREATE,
    details: "Created User",
  });
}

export async function logUpdateUser(
  ctx: MutationCtx,
  instructorId: Id<"users">,
  affectedEntityId: Id<"users">,
  details: string,
  userInfo: UserInfo,
  instructorInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    instructor_first_name: instructorInfo.first_name,
    instructor_middle_name: instructorInfo.middle_name,
    instructor_last_name: instructorInfo.last_name,
    instructor_email: instructorInfo.email,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_entity_first_name: userInfo.first_name,
    affected_entity_middle_name: userInfo.middle_name,
    affected_entity_last_name: userInfo.last_name,
    affected_entity_email: userInfo.email,
    action: LOG_ACTIONS.EDIT,
    details: details,
  });
}

export async function logDeleteUser(
  ctx: MutationCtx,
  instructorId: Id<"users">,
  affectedEntityId: Id<"users">,
  userInfo: UserInfo,
  instructorInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    instructor_first_name: instructorInfo.first_name,
    instructor_middle_name: instructorInfo.middle_name,
    instructor_last_name: instructorInfo.last_name,
    instructor_email: instructorInfo.email,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_entity_first_name: userInfo.first_name,
    affected_entity_middle_name: userInfo.middle_name,
    affected_entity_last_name: userInfo.last_name,
    affected_entity_email: userInfo.email,
    action: LOG_ACTIONS.DELETE,
    details: "Deleted User",
  });
}

export async function logResetPassword(
  ctx: MutationCtx,
  instructorId: Id<"users">,
  affectedEntityId: Id<"users">,
  affectedUserInfo: UserInfo,
  instructorInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    instructor_first_name: instructorInfo.first_name,
    instructor_middle_name: instructorInfo.middle_name,
    instructor_last_name: instructorInfo.last_name,
    instructor_email: instructorInfo.email,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_entity_first_name: affectedUserInfo.first_name,
    affected_entity_middle_name: affectedUserInfo.middle_name,
    affected_entity_last_name: affectedUserInfo.last_name,
    affected_entity_email: affectedUserInfo.email,
    action: LOG_ACTIONS.RESET_PASSWORD,
    details: "Reset Password",
  });
}

export async function logCreateGroup(
  ctx: MutationCtx,
  instructorId: Id<"users">,
  affectedEntityId: Id<"groupsTable">,
  instructorInfo: UserInfo,
  projectManagerInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    instructor_first_name: instructorInfo.first_name,
    instructor_middle_name: instructorInfo.middle_name,
    instructor_last_name: instructorInfo.last_name,
    instructor_email: instructorInfo.email,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    affected_entity_first_name: projectManagerInfo.first_name,
    affected_entity_middle_name: projectManagerInfo.middle_name,
    affected_entity_last_name: projectManagerInfo.last_name,
    affected_entity_email: projectManagerInfo.email,
    action: LOG_ACTIONS.CREATE,
    details: "Created Group",
  });
}

export async function logUpdateGroup(
  ctx: MutationCtx,
  instructorId: Id<"users">,
  affectedEntityId: Id<"groupsTable">,
  details: string,
  instructorInfo: UserInfo,
  projectManagerInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    instructor_first_name: instructorInfo.first_name,
    instructor_middle_name: instructorInfo.middle_name,
    instructor_last_name: instructorInfo.last_name,
    instructor_email: instructorInfo.email,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    affected_entity_first_name: projectManagerInfo.first_name,
    affected_entity_middle_name: projectManagerInfo.middle_name,
    affected_entity_last_name: projectManagerInfo.last_name,
    affected_entity_email: projectManagerInfo.email,
    action: LOG_ACTIONS.EDIT,
    details,
  });
}

export async function logDeleteGroup(
  ctx: MutationCtx,
  instructorId: Id<"users">,
  affectedEntityId: Id<"groupsTable">,
  instructorInfo: UserInfo,
  projectManagerInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    instructor_first_name: instructorInfo.first_name,
    instructor_middle_name: instructorInfo.middle_name,
    instructor_last_name: instructorInfo.last_name,
    instructor_email: instructorInfo.email,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    affected_entity_first_name: projectManagerInfo.first_name,
    affected_entity_middle_name: projectManagerInfo.middle_name,
    affected_entity_last_name: projectManagerInfo.last_name,
    affected_entity_email: projectManagerInfo.email,
    action: LOG_ACTIONS.DELETE,
    details: "Deleted Group",
  });
}

export async function logLockAccount(
  ctx: MutationCtx,
  instructorId: Id<"users">,
  affectedEntityId: Id<"users">,
  action: "lock" | "unlock",
  affectedUserInfo: UserInfo,
  instructorInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    instructor_first_name: instructorInfo.first_name,
    instructor_middle_name: instructorInfo.middle_name,
    instructor_last_name: instructorInfo.last_name,
    instructor_email: instructorInfo.email,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_entity_first_name: affectedUserInfo.first_name,
    affected_entity_middle_name: affectedUserInfo.middle_name,
    affected_entity_last_name: affectedUserInfo.last_name,
    affected_entity_email: affectedUserInfo.email,
    action:
      action === "lock" ? LOG_ACTIONS.LOCK_ACCOUNT : LOG_ACTIONS.UNLOCK_ACCOUNT,
    details: action === "lock" ? "Locked Account" : "Unlocked Account",
  });
}
