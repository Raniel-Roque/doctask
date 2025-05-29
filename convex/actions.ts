import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

interface DeleteUserWithClerkArgs {
  userId: Id<"users">;
  instructorId: Id<"users">;
  clerkId: string;
  clerkApiKey: string;
}

export const deleteUserWithClerk = action({
  args: {
    userId: v.id("users"),
    instructorId: v.id("users"),
    clerkId: v.string(),
    clerkApiKey: v.string(),
  },
  handler: async (ctx: ActionCtx, args: DeleteUserWithClerkArgs) => {
    // 1. Try to delete from Convex first
    try {
      await ctx.runMutation(api.mutations.deleteUser, {
        userId: args.userId,
        instructorId: args.instructorId,
      });
    } catch (e) {
      // If Convex fails, abort and do not delete Clerk
      throw new Error("Convex deletion failed: " + (e instanceof Error ? e.message : e));
    }

    // 2. If Convex succeeded, delete from Clerk
    const response = await fetch(`https://api.clerk.dev/v1/users/${args.clerkId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${args.clerkApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error("Clerk deletion failed: " + (await response.text()));
    }

    return { success: true };
  }
}); 