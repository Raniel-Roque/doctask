import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex-client";

const convex = getConvexClient();

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user from Convex
    const currentUser = await convex.query(api.fetch.getUserByClerkId, {
      clerkId: userId,
    });

    if (!currentUser || currentUser.role !== 0) {
      return NextResponse.json(
        { error: "Only students can upload images" },
        { status: 403 },
      );
    }

    // Get the user's group
    const groupData = await convex.query(api.fetch.getStudentGroup, {
      userId: currentUser._id,
    });

    if (!groupData?.group_id) {
      return NextResponse.json(
        { error: "User is not in a group" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
        },
        { status: 400 },
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // Generate upload URL from Convex
    const uploadUrl = await convex.mutation(api.images.generateUploadUrl);

    // Upload file to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to storage");
    }

    const { storageId } = await uploadResponse.json();

    // Create image metadata in database
    const imageId = await convex.mutation(api.images.createImage, {
      file_id: storageId as Id<"_storage">,
      filename: file.name,
      content_type: file.type,
      size: file.size,
      group_id: groupData.group_id,
      uploaded_by: currentUser._id,
    });

    // Get the image with URL
    const image = await convex.query(api.images.getImage, {
      imageId: imageId,
      userId: currentUser._id,
    });

    if (!image) {
      throw new Error("Failed to retrieve uploaded image");
    }

    return NextResponse.json({
      success: true,
      image: {
        id: image._id,
        url: image.url,
        filename: image.filename,
        size: image.size,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
