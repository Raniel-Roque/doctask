import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { clerkId, instructorId } = body;

    // Validate required fields before sanitization
    if (!clerkId || !instructorId) {
      return NextResponse.json(
        { error: "Clerk ID and Instructor ID are required" },
        { status: 400 },
      );
    }

    // Verify instructor permissions
    const instructor = await convex.query(api.fetch.getUserById, {
      id: instructorId as Id<"users">,
    });
    
    if (!instructor) {
      return NextResponse.json(
        { error: "Instructor not found" },
        { status: 404 },
      );
    }

    if (instructor.role !== 2) {
      return NextResponse.json(
        { error: "Unauthorized - Only instructors can delete users" },
        { status: 401 },
      );
    }

    // Sanitize input
    const sanitizedClerkId = sanitizeInput(clerkId, {
      trim: true,
      removeHtml: true,
      escapeSpecialChars: true,
    });

    // Validate required fields after sanitization
    if (!sanitizedClerkId) {
      return NextResponse.json(
        {
          error: "Clerk ID is invalid after sanitization",
        },
        { status: 400 },
      );
    }

    // Look up Convex user by Clerk ID
    const user = await convex.query(api.fetch.getUserByClerkId, {
      clerkId: sanitizedClerkId,
    });
    if (!user) {
      return NextResponse.json(
        { error: "User not found in Convex" },
        { status: 404 },
      );
    }

    // First, soft-delete in Convex
    let convexSuccess = false;
    try {
      const convexResult = await convex.mutation(api.mutations.deleteUser, {
        userId: user._id,
        instructorId: instructorId as Id<"users">,
        clerkId: sanitizedClerkId,
      });
      convexSuccess = convexResult.success;
      if (!convexSuccess) throw new Error("Convex soft-delete failed");
    } catch {
      return NextResponse.json(
        { error: "Failed to soft-delete user in Convex" },
        { status: 500 },
      );
    }

    // If Convex succeeded, delete from Clerk
    try {
      const client = await clerkClient();
      await client.users.deleteUser(sanitizedClerkId);
      return NextResponse.json({ success: true });
    } catch {
      // Rollback Convex soft-delete (set isDeleted=false for user and all associated data)
      await convex.mutation(api.mutations.restoreUser, {
        userId: user._id,
        instructorId: instructorId as Id<"users">,
      });
      return NextResponse.json(
        { error: "Failed to delete user from Clerk, Convex rolled back" },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    const clerkError = error as ClerkError;
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to delete user" },
      { status: 500 },
    );
  }
}
