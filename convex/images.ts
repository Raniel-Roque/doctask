import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

    const userInGroup = group.project_manager_id === args.uploaded_by || 
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

    const userInGroup = group.project_manager_id === args.userId || 
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
    // Check if user has access to the group
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      return [];
    }

    const userInGroup = group.project_manager_id === args.userId || 
                       group.member_ids.includes(args.userId);
    
    if (!userInGroup) {
      return [];
    }

    // Get all images for the group
    return await ctx.db
      .query("images")
      .withIndex("by_group", (q) => q.eq("group_id", args.groupId))
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
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError("Image not found");
    }

    // Verify user has access to the group
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if user is in the group
    const group = await ctx.db.get(image.group_id);
    if (!group) {
      throw new ConvexError("Group not found");
    }

    const userInGroup = group.project_manager_id === args.userId || 
                       group.member_ids.includes(args.userId);
    
    if (!userInGroup) {
      throw new ConvexError("User does not have access to this image");
    }

    // Delete the image record from database
    await ctx.db.delete(args.imageId);

    // Note: We don't delete the file from storage here to preserve it for version history
    // The file will remain in storage but won't be accessible through the images table
    
    return { success: true };
  },
}); 