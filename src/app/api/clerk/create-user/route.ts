import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { generatePassword } from "@/utils/passwordGeneration";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

export async function POST(request: Request) {
  let clerkUser = null;
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, role } = body;

    // Validate required fields before sanitization
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    // Trim all string values and convert null to undefined
    const trimmedFirstName = sanitizeInput(firstName, { trim: true, removeHtml: true, escapeSpecialChars: true }) || null;
    const trimmedLastName = sanitizeInput(lastName, { trim: true, removeHtml: true, escapeSpecialChars: true }) || null;
    const trimmedEmail = sanitizeInput(email, { trim: true, removeHtml: true, escapeSpecialChars: true }) || null;

    // Validate required fields after sanitization
    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      return NextResponse.json(
        { error: "Required fields are missing or invalid after sanitization" },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    const password = generatePassword(trimmedFirstName, trimmedLastName, Date.now());

    // Create user in Clerk with just email and password
    clerkUser = await client.users.createUser({
      emailAddress: [trimmedEmail],
      password: password,
      skipPasswordChecks: true // Skip password complexity checks
    });

    // Set email as unverified
    const emailAddress = clerkUser.emailAddresses[0];
    await client.emailAddresses.updateEmailAddress(emailAddress.id, {
      primary: true,
      verified: false
    });

    return NextResponse.json({ 
      success: true,
      user: {
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        email: trimmedEmail,
        role: role,
        password: password // Return password for welcome email
      }
    });
  } catch (error) {
    // Cleanup if anything fails
    if (clerkUser) {
      const client = await clerkClient();
      await client.users.deleteUser(clerkUser.id);
    }

    const clerkError = error as ClerkError;
    const errorMessage = clerkError.errors?.[0]?.message || 
                        (error instanceof Error ? error.message : "Failed to create user");
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}