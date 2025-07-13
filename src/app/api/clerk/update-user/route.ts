import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";
import { generatePassword } from "@/utils/passwordGeneration";
import { Id } from "../../../../../convex/_generated/dataModel";

type UpdateUserArgs = {
  userId: Id<"users">;
  instructorId: Id<"users">;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  clerk_id?: string;
  subrole?: number;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

export async function POST(request: Request) {
  let newUser = null;
  let newPassword = undefined;
  try {
    // Request size validation
    const contentLength = parseInt(
      request.headers.get("content-length") || "0",
    );
    if (contentLength > 1024 * 1024) {
      // 1MB limit
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await request.json();

    // Validate request body
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { clerkId, email, firstName, lastName, middleName, instructorId } = body;

    // Validate required fields before sanitization
    if (!clerkId || !email || !firstName || !lastName || !instructorId) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Verify instructor permissions
    const instructor = await convex.query(api.fetch.getUserById, {
      id: instructorId as Id<"users">,
    });
    if (!instructor) {
      return NextResponse.json(
        { error: "Instructor not found in database" },
        { status: 404 },
      );
    }
    if (instructor.role !== 2) {
      return NextResponse.json(
        { error: "Unauthorized - Only instructors can perform this action" },
        { status: 403 },
      );
    }

    // Sanitize inputs
    const sanitizedClerkId = sanitizeInput(clerkId, {
      trim: true,
      removeHtml: true,
      escapeSpecialChars: true,
    });
    const sanitizedEmail = sanitizeInput(email, {
      trim: true,
      removeHtml: true,
      escapeSpecialChars: true,
    });
    const sanitizedFirstName = sanitizeInput(firstName, {
      trim: true,
      removeHtml: true,
      escapeSpecialChars: true,
    });
    const sanitizedLastName = sanitizeInput(lastName, {
      trim: true,
      removeHtml: true,
      escapeSpecialChars: true,
    });
    const sanitizedMiddleName = middleName
      ? sanitizeInput(middleName, {
          trim: true,
          removeHtml: true,
          escapeSpecialChars: true,
        })
      : undefined;

    // Validate required fields after sanitization
    if (
      !sanitizedClerkId ||
      !sanitizedEmail ||
      !sanitizedFirstName ||
      !sanitizedLastName
    ) {
      return NextResponse.json(
        { error: "Required fields are missing or invalid after sanitization" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const client = await clerkClient();

    // Get the current user to verify it exists
    const currentUser = await client.users.getUser(sanitizedClerkId);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Normalize emails for robust comparison
    const oldEmail = currentUser.emailAddresses[0]?.emailAddress
      .trim()
      .toLowerCase();
    const sanitizedEmailNormalized = sanitizedEmail.trim().toLowerCase();

    // Get the Convex user record
    const convexUser = await convex.query(api.fetch.getUserByClerkId, {
      clerkId: sanitizedClerkId,
    });
    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 },
      );
    }

    // If email is unchanged, only update Convex and return
    if (oldEmail === sanitizedEmailNormalized) {
      // Only set subrole if student
      const updateArgs: UpdateUserArgs = {
        userId: convexUser._id as Id<"users">,
        instructorId: instructor._id as Id<"users">,
        first_name: sanitizedFirstName,
        middle_name: sanitizedMiddleName,
        last_name: sanitizedLastName,
        email: oldEmail, // keep as is
      };
      if (convexUser.role === 0 && typeof body.subrole !== "undefined") {
        updateArgs.subrole = body.subrole;
      }
      await convex.mutation(api.mutations.updateUser, updateArgs);
      return NextResponse.json({ success: true });
    }

    // --- Clerk update: create new user, then Convex, then delete old Clerk user ---
    try {
      // 1. Create new user in Clerk (only email and password)
      newPassword = generatePassword(
        sanitizedFirstName,
        sanitizedLastName,
        Date.now(),
      );
      newUser = await client.users.createUser({
        emailAddress: [sanitizedEmailNormalized],
        password: newPassword,
        skipPasswordChecks: true,
      });
    } catch (clerkError) {
      return NextResponse.json(
        {
          error:
            "Failed to create new Clerk user: " +
            (clerkError instanceof Error ? clerkError.message : clerkError),
        },
        { status: 500 },
      );
    }

    // 2. Try to update Convex with new email and Clerk ID
    try {
      const updateArgs: UpdateUserArgs = {
        userId: convexUser._id as Id<"users">,
        instructorId: instructor._id as Id<"users">,
        first_name: sanitizedFirstName,
        middle_name: sanitizedMiddleName,
        last_name: sanitizedLastName,
        email: sanitizedEmailNormalized,
        clerk_id: newUser.id,
      };
      if (convexUser.role === 0 && typeof body.subrole !== "undefined") {
        updateArgs.subrole = body.subrole;
      }
      await convex.mutation(api.mutations.updateUser, updateArgs);
    } catch {
      // 3. Rollback: delete new Clerk user
      try {
        if (newUser) await client.users.deleteUser(newUser.id);
      } catch {
        // Optionally log rollback failure
      }
      return NextResponse.json(
        {
          error:
            "Failed to update user in database. Clerk changes rolled back.",
        },
        { status: 500 },
      );
    }

    // 4. If Convex succeeded, delete the old Clerk user
    try {
      await client.users.deleteUser(sanitizedClerkId);
    } catch {
      // Optionally log failure to delete old user, but still return success
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const clerkError = error as ClerkError;

    // Check for Clerk's duplicate email error
    if (
      clerkError.errors?.[0]?.message?.includes("email address exists") ||
      clerkError.errors?.[0]?.message?.includes("email_address_exists") ||
      clerkError.errors?.[0]?.message?.includes("email already exists")
    ) {
      return NextResponse.json(
        {
          error:
            "This email is already registered in the system. Please use a different email address.",
        },
        { status: 400 },
      );
    }

    // Return a more specific error message for other cases
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to update user" },
      { status: 500 },
    );
  }
}
