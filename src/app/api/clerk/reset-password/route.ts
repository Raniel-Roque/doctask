import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { generatePassword } from "@/utils/passwordGeneration";
import { Id } from "../../../../../convex/_generated/dataModel";

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

    // Validate required fields
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
        { error: "Unauthorized - Only instructors can reset passwords" },
        { status: 401 },
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

    // Generate a new password using the shared utility
    const newPassword = generatePassword(
      convexUser.first_name,
      convexUser.last_name,
      Date.now(),
    );

    // Update the user's password
    await client.users.updateUser(clerkId, {
      password: newPassword,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
      firstName: convexUser.first_name,
      lastName: convexUser.last_name,
      email: convexUser.email,
      password: newPassword,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
