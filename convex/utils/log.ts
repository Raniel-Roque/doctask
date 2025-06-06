import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const LOG_ACTIONS = {
  CREATE_USER: "Create User",
  UPDATE_USER: "Update User",
  DELETE_USER: "Delete User",
  RESET_PASSWORD: "Reset Password",
  CREATE_GROUP: "Create Group",
  DELETE_GROUP: "Delete Group",
  UPDATE_GROUP: "Update Group"
} as const;

interface UserInfo {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
}

function formatUserName(userInfo: UserInfo): string {
  return `${userInfo.first_name} ${userInfo.middle_name ? userInfo.middle_name + ' ' : ''}${userInfo.last_name}`;
}

export async function logCreateUser(
  ctx: MutationCtx, 
  instructorId: Id<"users">, 
  affectedEntityId: Id<"users">,
  userInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_user_first_name: userInfo.first_name,
    affected_user_middle_name: userInfo.middle_name,
    affected_user_last_name: userInfo.last_name,
    affected_user_email: userInfo.email,
    action: LOG_ACTIONS.CREATE_USER,
    details: `Created User: ${formatUserName(userInfo)}`
  });
}

export async function logUpdateUser(
  ctx: MutationCtx, 
  instructorId: Id<"users">, 
  affectedEntityId: Id<"users">, 
  details: string,
  userInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_user_first_name: userInfo.first_name,
    affected_user_middle_name: userInfo.middle_name,
    affected_user_last_name: userInfo.last_name,
    affected_user_email: userInfo.email,
    action: LOG_ACTIONS.UPDATE_USER,
    details: `Updated User: ${formatUserName(userInfo)} - ${details}`
  });
}

export async function logDeleteUser(
  ctx: MutationCtx, 
  instructorId: Id<"users">, 
  affectedEntityId: Id<"users">,
  userInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_user_first_name: userInfo.first_name,
    affected_user_middle_name: userInfo.middle_name,
    affected_user_last_name: userInfo.last_name,
    affected_user_email: userInfo.email,
    action: LOG_ACTIONS.DELETE_USER,
    details: `Deleted User: ${formatUserName(userInfo)}`
  });
}

export async function logResetPassword(
  ctx: MutationCtx, 
  instructorId: Id<"users">, 
  affectedEntityId: Id<"users">,
  userInfo: UserInfo
) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    affected_user_first_name: userInfo.first_name,
    affected_user_middle_name: userInfo.middle_name,
    affected_user_last_name: userInfo.last_name,
    affected_user_email: userInfo.email,
    action: LOG_ACTIONS.RESET_PASSWORD,
    details: `Reset Password for: ${formatUserName(userInfo)}`
  });
}

export async function logCreateGroup(ctx: MutationCtx, instructorId: Id<"users">, affectedEntityId: Id<"groupsTable">) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.CREATE_GROUP,
    details: "Created Group"
  });
}

export async function logUpdateGroup(ctx: MutationCtx, instructorId: Id<"users">, affectedEntityId: Id<"groupsTable">, details: string) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.UPDATE_GROUP,
    details
  });
}

export async function logDeleteGroup(ctx: MutationCtx, instructorId: Id<"users">, affectedEntityId: Id<"groupsTable">) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "group",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.DELETE_GROUP,
    details: "Deleted Group"
  });
}
