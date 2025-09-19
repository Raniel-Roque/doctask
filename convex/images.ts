import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Upload image metadata after file is stored
export const createImage = mutation({
  args: {
    file_id: v.id("_storage"),
    filename: v.string(),
    content_type: v.string(),
    size: v.number(),
    group_id: v.id("groupsTable"),
    uploaded_by: v.id("users"),
    alt_text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has access to the group
    const user = await ctx.db.get(args.uploaded_by);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if user is in the group
    const group = await ctx.db.get(args.group_id);
    if (!group) {
      throw new ConvexError("Group not found");
    }

    const userInGroup =
      group.project_manager_id === args.uploaded_by ||
      group.member_ids.includes(args.uploaded_by);

    if (!userInGroup) {
      throw new ConvexError("User does not have access to this group");
    }

    // Get the file URL
    const url = await ctx.storage.getUrl(args.file_id);
    if (!url) {
      throw new ConvexError("Failed to get file URL");
    }

    // Create image record
    const imageId = await ctx.db.insert("images", {
      file_id: args.file_id,
      filename: args.filename,
      content_type: args.content_type,
      size: args.size,
      group_id: args.group_id,
      uploaded_by: args.uploaded_by,
      alt_text: args.alt_text,
      url: url,
      isDeleted: false,
    });

    return imageId;
  },
});

// Get image by ID (with access control)
export const getImage = query({
  args: { imageId: v.id("images"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      return null;
    }

    // Check if user has access to the group
    const group = await ctx.db.get(image.group_id);
    if (!group) {
      return null;
    }

    const userInGroup =
      group.project_manager_id === args.userId ||
      group.member_ids.includes(args.userId);

    if (!userInGroup) {
      return null;
    }

    return image;
  },
});

// Get all images for a group
export const getGroupImages = query({
  args: { groupId: v.id("groupsTable"), userId: v.id("users") },
  handler: async (ctx, args) => {
    // Parallel fetch: get group and user data simultaneously
    const [group, user] = await Promise.all([
      ctx.db.get(args.groupId),
      ctx.db.get(args.userId)
    ]);

    if (!group || !user) {
      return [];
    }

    // Check if user has access to the group
    const userInGroup =
      group.project_manager_id === args.userId ||
      group.member_ids.includes(args.userId);

    if (!userInGroup) {
      return [];
    }

    // Get all images for the group (filter out deleted images)
    return await ctx.db
      .query("images")
      .withIndex("by_group", (q) => q.eq("group_id", args.groupId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
  },
});

// Generate upload URL for new image
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate upload URL that expires in 1 hour
    return await ctx.storage.generateUploadUrl();
  },
});

// Delete image by ID (with access control)
export const deleteImage = mutation({
  args: { imageId: v.id("images"), userId: v.id("users") },
  handler: async (ctx, args) => {
    // Parallel fetch: get image, user, and group data simultaneously
    const [image, user] = await Promise.all([
      ctx.db.get(args.imageId),
      ctx.db.get(args.userId)
    ]);

    if (!image) {
      throw new ConvexError("Image not found");
    }

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get group data
    const group = await ctx.db.get(image.group_id);
    if (!group) {
      throw new ConvexError("Group not found");
    }

    const userInGroup =
      group.project_manager_id === args.userId ||
      group.member_ids.includes(args.userId);

    if (!userInGroup) {
      throw new ConvexError("User does not have access to this image");
    }

    // Soft delete the image record from database (preserve for audit trail)
    await ctx.db.patch(args.imageId, { isDeleted: true });

    // Note: We don't delete the file from storage here to preserve it for version history
    // The file will remain in storage but won't be accessible through the images table

    return { success: true };
  },
});

// Batch delete multiple images (with access control)
export const deleteImages = mutation({
  args: { imageIds: v.array(v.id("images")), userId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.imageIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Get user data first
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Batch fetch all images
    const images = await Promise.all(
      args.imageIds.map(id => ctx.db.get(id))
    );

    // Filter out null images and check access
    const validImages = [];
    const groupIds = new Set<string>();

    for (const image of images) {
      if (image && !image.isDeleted) {
        validImages.push(image);
        groupIds.add(image.group_id);
      }
    }

    if (validImages.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Batch fetch all groups
    const groups = await Promise.all(
      Array.from(groupIds).map(id => ctx.db.get(id as Id<"groupsTable">))
    );

    const groupMap = new Map();
    groups.forEach(group => {
      if (group) {
        groupMap.set(group._id, group);
      }
    });

    // Check access for each image
    const accessibleImages = validImages.filter(image => {
      const group = groupMap.get(image.group_id);
      if (!group) return false;

      return group.project_manager_id === args.userId ||
             group.member_ids.includes(args.userId);
    });

    if (accessibleImages.length === 0) {
      throw new ConvexError("No accessible images found");
    }

    // Batch soft delete all accessible images
    const deletePromises = accessibleImages.map(image =>
      ctx.db.patch(image._id, { isDeleted: true })
    );

    await Promise.all(deletePromises);

    return { 
      success: true, 
      deletedCount: accessibleImages.length,
      totalRequested: args.imageIds.length
    };
  },
});
