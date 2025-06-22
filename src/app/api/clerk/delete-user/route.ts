import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

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

    const { clerkId } = body;

    // Validate required fields before sanitization
    if (!clerkId) {
      return NextResponse.json(
        { error: "Clerk ID is required" },
        { status: 400 },
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
        { error: "Clerk ID is invalid after sanitization" },
        { status: 400 },
      );
    }

    // Delete from Clerk
    try {
      const client = await clerkClient();
      await client.users.deleteUser(sanitizedClerkId);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Failed to delete user from authentication service" },
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
