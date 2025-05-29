import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateUniqueAdviserCode } from "./utils/adviserCode";

const LOG_ACTIONS = {
    CREATE_USER: "Create User",
    EDIT_USER: "Edit User",
    DELETE_USER: "Delete User",
    RESET_PASSWORD: "Reset Password"
} as const;

export const resetPassword = mutation({
  args: {
    userId: v.id("users"),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");
    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: args.userId,
      affected_user_name: `${user.first_name} ${user.last_name}`,
      affected_user_email: user.email,
      action: LOG_ACTIONS.RESET_PASSWORD,
      details: "Password was reset",
    });
    return { success: true };
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    instructorId: v.id("users"),
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    middle_name: v.optional(v.string()),
    clerk_id: v.optional(v.string()),
    subrole: v.optional(v.number()),
    role: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("instructor not found");

    // Handle role changes and cleanup
    if (args.subrole !== undefined && args.subrole !== user.subrole) {
      // If promoting to manager (subrole 0 -> 1)
      if (args.subrole === 1) {
        // Find and remove user from any existing groups
        const existingMemberships = await ctx.db
          .query("studentsTable")
          .withIndex("by_user", (q) => q.eq("user_id", args.userId))
          .collect();
        
        for (const membership of existingMemberships) {
          // Remove user from studentsTable
          await ctx.db.delete(membership._id);
          
          // Update the group's member_ids
          const group = await ctx.db.get(membership.group_id);
          if (group) {
            await ctx.db.patch(group._id, {
              member_ids: group.member_ids.filter(id => id !== args.userId)
            });
          }
        }
      }
      
      // If demoting from manager (subrole 1 -> 0)
      if (user.subrole === 1 && args.subrole === 0) {
        // Find groups where user is project manager
        const managedGroups = await ctx.db
          .query("groupsTable")
          .withIndex("by_project_manager", (q) => q.eq("project_manager_id", args.userId))
          .collect();
        
        for (const group of managedGroups) {
          // Remove all members from studentsTable
          const memberships = await ctx.db
            .query("studentsTable")
            .withIndex("by_group", (q) => q.eq("group_id", group._id))
            .collect();
          
          for (const membership of memberships) {
            await ctx.db.delete(membership._id);
          }
          
          // Update adviser's group_ids if exists
          if (group.adviser_id) {
            const adviserCode = await ctx.db
              .query("advisersTable")
              .withIndex("by_adviser", (q) => q.eq("adviser_id", group.adviser_id!))
              .first();
            
            if (adviserCode) {
              await ctx.db.patch(adviserCode._id, {
                group_ids: adviserCode.group_ids.filter(id => id !== group._id)
              });
            }
          }
          
          // Delete the group
          await ctx.db.delete(group._id);
        }
      }
    }

    const updates: {
      first_name: string;
      last_name: string;
      email: string;
      middle_name?: string | undefined;
      email_verified?: boolean;
      clerk_id?: string;
      subrole?: number;
    } = {
      first_name: args.first_name,
      last_name: args.last_name,
      email: args.email,
    };
    // Only update middle_name if it has been changed
    if (args.middle_name !== user.middle_name) {
      updates.middle_name = args.middle_name || undefined;
    }
    if (args.clerk_id !== undefined) {
      updates.clerk_id = args.clerk_id;
      updates.email_verified = false;
    } else if (args.email !== user.email) {
      updates.email_verified = false;
    }
    if (args.subrole !== undefined) {
      updates.subrole = args.subrole;
    }
    await ctx.db.patch(args.userId, updates);
    // Create human-readable details for edited fields
    const changes = [];
    if (args.first_name !== user.first_name) {
      changes.push(`First Name: ${user.first_name} → ${args.first_name}`);
    }
    if (args.middle_name !== user.middle_name) {
      const oldMiddleName = user.middle_name || 'none';
      const newMiddleName = args.middle_name || 'none';
      if (oldMiddleName !== newMiddleName) {
        changes.push(`Middle Name: ${oldMiddleName} → ${newMiddleName}`);
      }
    }
    if (args.last_name !== user.last_name) {
      changes.push(`Last Name: ${user.last_name} → ${args.last_name}`);
    }
    if (args.email !== user.email) {
      changes.push(`Email: ${user.email} → ${args.email}`);
    }
    if (args.subrole !== undefined && args.subrole !== user.subrole) {
      const oldRole = user.subrole === 0 ? 'Member' : user.subrole === 1 ? 'Manager' : 'None';
      const newRole = args.subrole === 0 ? 'Member' : args.subrole === 1 ? 'Manager' : 'None';
      changes.push(`Role: ${oldRole} → ${newRole}`);
    }
    // Only log if there are actual changes
    if (changes.length > 0) {
      await ctx.db.insert("instructorLogs", {
        instructor_id: args.instructorId,
        instructor_name: `${instructor.first_name} ${instructor.last_name}`,
        affected_user_id: args.userId,
        affected_user_name: `${user.first_name} ${user.last_name}`,
        affected_user_email: user.email,
        action: LOG_ACTIONS.EDIT_USER,
        details: changes.join("\n"),
      });
    }
    return { success: true };
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    // Log the deletion
    const instructor = await ctx.db.get(args.instructorId);
    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: instructor ? `${instructor.first_name} ${instructor.last_name}` : "Unknown",
      affected_user_id: args.userId,
      affected_user_name: `${user.first_name} ${user.last_name}`,
      affected_user_email: user.email,
      action: LOG_ACTIONS.DELETE_USER,
      details: `Deleted user`,
    });
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

export const createUser = mutation({
  args: {
    clerk_id: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    role: v.number(),
    middle_name: v.optional(v.string()),
    instructorId: v.id("users"),
    subrole: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }
    // Get instructor first to fail fast if not found
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");
    // Check if user already exists in Convex
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (existingUser) {
      // If user exists but doesn't have a clerk_id, update it
      if (!existingUser.clerk_id) {
        await ctx.db.patch(existingUser._id, {
          clerk_id: args.clerk_id,
          email_verified: false
        });
        return { success: true, userId: existingUser._id };
      }
      // If user exists with a different clerk_id, throw error
      if (existingUser.clerk_id !== args.clerk_id) {
        throw new Error("Email already registered. Please choose another email.");
      }
      // If user exists with same clerk_id, return success
      return { success: true, userId: existingUser._id };
    }
    // Create new user
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
    // If the user is an adviser, generate a code
    if (args.role === 1) {
      try {
        const code = await generateUniqueAdviserCode(ctx);
        await ctx.db.insert("advisersTable", {
          adviser_id: userId,
          code,
          group_ids: [],
        });
      } catch (error) {
        console.error("Failed to generate adviser code:", error);
        // Don't throw here - we still want the user to be created even if code generation fails
      }
    }
    // Log the user creation
    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: userId,
      affected_user_name: `${args.first_name} ${args.last_name}`,
      affected_user_email: args.email,
      action: LOG_ACTIONS.CREATE_USER,
      details: `Created new ${args.role === 1 ? "adviser" : "student"}`,
    });
    return { success: true, userId };
  },
});

export const createAdviserCode = mutation({
  args: {
    adviserId: v.id("users"),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the user is an adviser
    const adviser = await ctx.db.get(args.adviserId);
    if (!adviser) throw new Error("Adviser not found");
    if (adviser.role !== 1) throw new Error("User is not an adviser");
    // Check if adviser already has a code
    const existingCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();
    if (existingCode) {
      throw new Error("Adviser already has a code");
    }
    // Generate unique code
    const code = await generateUniqueAdviserCode(ctx);
    // Create adviser code record
    await ctx.db.insert("advisersTable", {
      adviser_id: args.adviserId,
      code,
      group_ids: [],
    });
    // Log the code creation
    const instructor = await ctx.db.get(args.instructorId);
    if (!instructor) throw new Error("Instructor not found");
    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: args.adviserId,
      affected_user_name: `${adviser.first_name} ${adviser.last_name}`,
      affected_user_email: adviser.email,
      action: "Create Adviser Code",
      details: `Generated adviser code: ${code}`,
    });
    return { success: true, code };
  },
});

export const updateAdviserGroups = mutation({
  args: {
    adviserId: v.id("users"),
    groupIds: v.array(v.id("groupsTable")),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the adviser code exists
    const adviserCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();
    if (!adviserCode) {
      throw new Error("Adviser code not found");
    }
    // Update the groups
    await ctx.db.patch(adviserCode._id, {
      group_ids: args.groupIds,
    });
    // Log the update
    const adviser = await ctx.db.get(args.adviserId);
    const instructor = await ctx.db.get(args.instructorId);
    if (!adviser || !instructor) throw new Error("User not found");
    await ctx.db.insert("instructorLogs", {
      instructor_id: args.instructorId,
      instructor_name: `${instructor.first_name} ${instructor.last_name}`,
      affected_user_id: args.adviserId,
      affected_user_name: `${adviser.first_name} ${adviser.last_name}`,
      affected_user_email: adviser.email,
      action: "Update Adviser Groups",
      details: `Updated groups for adviser code: ${adviserCode.code}`,
    });
    return { success: true };
  },
});

export const deleteAdviserCode = mutation({
  args: {
    adviserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the adviser code
    const adviserCode = await ctx.db
      .query("advisersTable")
      .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId))
      .first();
    if (!adviserCode) {
      return { success: true }; // No code to delete
    }
    // Delete the adviser code
    await ctx.db.delete(adviserCode._id);
    return { success: true };
  },
});

export const createGroupWithMembers = mutation({
  args: {
    projectManagerId: v.id("users"),
    memberIds: v.optional(v.array(v.id("users"))),
    adviserId: v.optional(v.id("users")),
    capstoneTitle: v.optional(v.string()),
    instructorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Create the group
    const groupId = await ctx.db.insert("groupsTable", {
      project_manager_id: args.projectManagerId,
      member_ids: args.memberIds ?? [],
      adviser_id: args.adviserId,
      capstone_title: args.capstoneTitle,
      grade: 0,
    });
    // 2. Update studentsTable for project manager
    await ctx.db.insert("studentsTable", {
      user_id: args.projectManagerId,
      group_id: groupId,
    });
    // 3. Update studentsTable for each member
    if (args.memberIds && args.memberIds.length > 0) {
      for (const memberId of args.memberIds) {
        await ctx.db.insert("studentsTable", {
          user_id: memberId,
          group_id: groupId,
        });
      }
    }
    // 4. Update advisersTable group_ids if adviser is provided
    if (args.adviserId) {
      const adviserCode = await ctx.db
        .query("advisersTable")
        .withIndex("by_adviser", (q) => q.eq("adviser_id", args.adviserId!))
        .first();
      if (adviserCode) {
        await ctx.db.patch(adviserCode._id, {
          group_ids: [...adviserCode.group_ids, groupId],
        });
      }
    }
    // 5. Log the group creation
    const instructor = await ctx.db.get(args.instructorId);
    if (instructor) {
      await ctx.db.insert("instructorLogs", {
        instructor_id: args.instructorId,
        instructor_name: `${instructor.first_name} ${instructor.last_name}`,
        affected_user_id: args.projectManagerId,
        affected_user_name: "Group Creation",
        affected_user_email: "-",
        action: "Create Group",
        details: `Created group with project manager ${args.projectManagerId}`,
      });
    }
    return { success: true, groupId };
  },
}); 