import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { generatePassword } from "@/utils/passwordGeneration";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    const { clerkId, email, firstName, lastName } = body;

    // Validate required fields before sanitization
    if (!clerkId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
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

    // Check if the new email already exists in Clerk (excluding the current user)
    const existingUsers = await client.users.getUserList({
      emailAddress: [sanitizedEmail],
    });

    const emailExists = existingUsers.data.some(
      (user) =>
        user.id !== sanitizedClerkId &&
        user.emailAddresses.some((e) => e.emailAddress === sanitizedEmail),
    );

    if (emailExists) {
      return NextResponse.json(
        {
          error:
            "This email is already registered in the system. Please use a different email address.",
        },
        { status: 400 },
      );
    }

    // Get the current user to verify it exists
    const currentUser = await client.users.getUser(sanitizedClerkId);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    // Check if a new user was already created for this email
    const existingNewUser = await client.users.getUserList({
      emailAddress: [sanitizedEmail],
    });

    let newUser;
    let newPassword;
    if (existingNewUser.data.some((user) => user.id !== sanitizedClerkId)) {
      // A new user was already created but the process didn't complete
      newUser = existingNewUser.data.find(
        (user) => user.id !== sanitizedClerkId,
      );
    } else {
      // Generate a new password using the shared utility
      newPassword = generatePassword(
        sanitizedFirstName,
        sanitizedLastName,
        Date.now(),
      );

      // Create new user with the new email
      newUser = await client.users.createUser({
        emailAddress: [sanitizedEmail],
        password: newPassword,
      });

      // Set email as unverified
      const emailAddress = newUser.emailAddresses[0];
      await client.emailAddresses.updateEmailAddress(emailAddress.id, {
        primary: true,
        verified: false,
      });
    }

    if (!newUser) {
      return NextResponse.json(
        { error: "Failed to create or find new user" },
        { status: 500 },
      );
    }

    const oldUser = await client.users.getUser(sanitizedClerkId);
    if (oldUser) {
      await client.users.deleteUser(sanitizedClerkId);
    }

    // Set email_verified to false in Convex
    await convex.mutation(api.mutations.updateEmailStatus, {
      userId: convexUser._id,
    });

    return NextResponse.json({
      success: true,
      clerkId: newUser.id, // Return the new clerkId
      email: sanitizedEmail,
      firstName: sanitizedFirstName,
      lastName: sanitizedLastName,
      password: newPassword, // Return password if it was generated
    });
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
