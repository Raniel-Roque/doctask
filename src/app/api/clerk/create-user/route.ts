import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { generatePassword } from "@/utils/passwordGeneration";
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
  let clerkUser = null;
  try {
    const body = await request.json();

    // Validate request body
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const {
      firstName,
      middleName,
      lastName,
      email,
      role,
      instructorId,
      subrole,
    } = body;

    // Validate required fields before sanitization
    if (!firstName || !lastName || !email || !instructorId) {
      return NextResponse.json(
        { error: "Required fields are missing" },
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
        { error: "Unauthorized - Only instructors can create users" },
        { status: 401 },
      );
    }

    // Trim all string values and convert null to undefined
    const trimmedFirstName =
      sanitizeInput(firstName, {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true,
      }) || null;
    const trimmedLastName =
      sanitizeInput(lastName, {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true,
      }) || null;
    const trimmedEmail =
      sanitizeInput(email, {
        trim: true,
        removeHtml: true,
        escapeSpecialChars: true,
      }) || null;
    const trimmedMiddleName = middleName
      ? sanitizeInput(middleName, {
          trim: true,
          removeHtml: true,
          escapeSpecialChars: true,
        })
      : undefined;

    // Validate required fields after sanitization
    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      return NextResponse.json(
        { error: "Required fields are missing or invalid after sanitization" },
        { status: 400 },
      );
    }

    const client = await clerkClient();
    const password = generatePassword(trimmedFirstName, trimmedLastName);

    // 1. Create user in Clerk
    clerkUser = await client.users.createUser({
      emailAddress: [trimmedEmail],
      password: password,
      skipPasswordChecks: true,
    });

    // Set email as verified for instructors, unverified for others
    const emailAddress = clerkUser.emailAddresses[0];
    await client.emailAddresses.updateEmailAddress(emailAddress.id, {
      primary: true,
      verified: role === 2 ? true : false,
    });

    // 2. Create user in Convex
    try {
      await convex.mutation(api.mutations.createUser, {
        first_name: trimmedFirstName,
        middle_name: trimmedMiddleName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        role: role,
        subrole: subrole,
        instructorId: instructorId as Id<"users">,
        clerk_id: clerkUser.id,
      });
    } catch {
      // If Convex creation fails, delete Clerk user (rollback)
      await client.users.deleteUser(clerkUser.id);
      return NextResponse.json(
        {
          error:
            "Convex user creation failed, Clerk user deleted. No user created.",
        },
        { status: 500 },
      );
    }

    // 3. Log and send welcome email (resend-email)
    // ... (insert logging and resend-email logic here if needed) ...

    return NextResponse.json({
      success: true,
      user: {
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        email: trimmedEmail,
        role: role,
        password: password, // Return password for welcome email
      },
    });
  } catch (error) {
    // Cleanup if anything fails
    if (clerkUser) {
      const client = await clerkClient();
      await client.users.deleteUser(clerkUser.id);
    }
    const clerkError = error as ClerkError;
    const errorMessage =
      clerkError.errors?.[0]?.message ||
      (error instanceof Error ? error.message : "Failed to create user");
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
