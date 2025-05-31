import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const LOG_ACTIONS = {
  CREATE_USER: "Create User",
  UPDATE_USER: "Update User",
  DELETE_USER: "Delete User",
  RESET_PASSWORD: "Reset Password",
  CREATE_GROUP: "Create Group",
  DELETE_GROUP: "Delete Group",
  UPDATE_GROUP: "Update Group"
} as const;

export async function logCreateUser(ctx: MutationCtx, instructorId: Id<"users">, affectedEntityId: Id<"users">) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.CREATE_USER,
    details: "Created User"
  });
}

export async function logUpdateUser(ctx: MutationCtx, instructorId: Id<"users">, affectedEntityId: Id<"users">, details: string) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.UPDATE_USER,
    details
  });
}

export async function logDeleteUser(ctx: MutationCtx, instructorId: Id<"users">, affectedEntityId: Id<"users">) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.DELETE_USER,
    details: "Deleted User"
  });
}

export async function logResetPassword(ctx: MutationCtx, instructorId: Id<"users">, affectedEntityId: Id<"users">) {
  await ctx.db.insert("instructorLogs", {
    instructor_id: instructorId,
    affected_entity_type: "user",
    affected_entity_id: affectedEntityId,
    action: LOG_ACTIONS.RESET_PASSWORD,
    details: "Reset Password"
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
