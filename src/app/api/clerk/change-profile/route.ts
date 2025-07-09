import { NextResponse, NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { createRateLimiter, RATE_LIMITS } from "@/lib/apiRateLimiter";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { clerkId, imageData } = body;

    // Validate required fields
    if (!clerkId || !imageData) {
      return NextResponse.json(
        { error: "Clerk ID and image data are required" },
        { status: 400 },
      );
    }

    // Apply rate limiting
    const rateLimit = createRateLimiter(RATE_LIMITS.PROFILE_PICTURE_UPDATE);
    const rateLimitResult = rateLimit(request, clerkId);

    if (!rateLimitResult.success) {
      const headers: Record<string, string> = {};
      if (rateLimitResult.retryAfter) {
        headers["Retry-After"] = rateLimitResult.retryAfter.toString();
      }
      return NextResponse.json(
        { error: rateLimitResult.message },
        { status: 429, headers },
      );
    }

    const client = await clerkClient();

    // Get the user to verify it exists
    const user = await client.users.getUser(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the Convex user record
    const convexUser = await convex.query(api.fetch.getUserByClerkId, {
      clerkId,
    });
    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 },
      );
    }

    // Convert base64 to Blob
    const base64Data = imageData.split(",")[1];
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    const blob = new Blob(byteArrays, { type: "image/jpeg" });

    // Update the user's profile image
    await client.users.updateUserProfileImage(clerkId, {
      file: blob,
    });

    return NextResponse.json({
      success: true,
      message: "Profile picture updated successfully",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update profile picture" },
      { status: 500 },
    );
  }
}
