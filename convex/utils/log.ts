import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const LOG_ACTIONS = {
  CREATE_entity: "Create User",
  UPDATE_entity: "Update User",
  DELETE_entity: "Delete User",
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
    action: LOG_ACTIONS.CREATE_entity,
    details: "Created User"
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
    action: LOG_ACTIONS.UPDATE_entity,
    details: details
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
    action: LOG_ACTIONS.DELETE_entity,
    details: "Deleted User"
  });
}

export async function logResetPassword(
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
    action: LOG_ACTIONS.RESET_PASSWORD,
    details: "Reset Password"
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
    action: LOG_ACTIONS.CREATE_GROUP,
    details: "Created Group"
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
    action: LOG_ACTIONS.UPDATE_GROUP,
    details
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
    action: LOG_ACTIONS.DELETE_GROUP,
    details: "Deleted Group"
  });
}
