import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

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

    const { clerkId, currentPassword } = body;

    // Validate required fields
    if (!clerkId || !currentPassword) {
      return NextResponse.json(
        { error: "Clerk ID and current password are required" },
        { status: 400 },
      );
    }

    const client = await clerkClient();

    // Get the user to verify it exists
    const user = await client.users.getUser(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the current password
    try {
      await client.users.verifyPassword({
        userId: clerkId,
        password: currentPassword,
      });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to verify password" },
      { status: 500 },
    );
  }
}
