import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from 'resend';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { generatePassword } from "@/utils/passwordGeneration";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

const resend = new Resend(process.env.RESEND_API_KEY);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    const { firstName, lastName, email, role, middle_name, instructorId, subrole } = body;

    // Validate required fields before sanitization
    if (!firstName || !lastName || !email || role === undefined || !instructorId) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    // Trim all string values and convert null to undefined
    const trimmedFirstName = sanitizeInput(firstName, { trim: true, removeHtml: true, escapeSpecialChars: true }) || null;
    const trimmedLastName = sanitizeInput(lastName, { trim: true, removeHtml: true, escapeSpecialChars: true }) || null;
    const trimmedEmail = sanitizeInput(email, { trim: true, removeHtml: true, escapeSpecialChars: true }) || null;
    const trimmedMiddleName = sanitizeInput(middle_name, { trim: true, removeHtml: true, escapeSpecialChars: true }) || null;

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
    });

    // Set email as unverified
    const emailAddress = clerkUser.emailAddresses[0];
    await client.emailAddresses.updateEmailAddress(emailAddress.id, {
      primary: true,
      verified: false
    });

    // Create user in Convex
    try {
      await convex.mutation(api.mutations.createUser, {
        clerk_id: clerkUser.id,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
        role: role,
        middle_name: trimmedMiddleName || undefined,
        instructorId: instructorId,
        subrole: subrole
      });
    } catch (convexError) {
      // If Convex creation fails, delete the Clerk user
      if (clerkUser) {
        await client.users.deleteUser(clerkUser.id);
      }
      throw convexError;
    }

    await resend.emails.send({
      from: 'DocTask <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to DocTask',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to DocTask!</h2>
          
          <p>Dear ${trimmedFirstName} ${trimmedLastName},</p>
          
          <p>Your account has been created. Here are your login credentials:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${trimmedEmail}</p>
            <p style="margin: 10px 0 0 0;"><strong>Password:</strong> ${password}</p>
          </div>
          
          <p><strong>Important Next Steps:</strong></p>
          <ol>
            <li>Log in to your account using the credentials above</li>
            <li>Change your password immediately for security purposes</li>
            <li>Verify your email address</li>
          </ol>
          
          <p style="margin-top: 30px; color: #666;">
            Best regards,<br>
            The DocTask Team
          </p>
          <p style="margin-top: 10px; color: #999; font-size: 12px;">
            Please do not reply to this email.
          </p>
        </div>
      `,
    });


    return NextResponse.json({ 
      success: true,
      user: {
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        email: trimmedEmail,
        role: role
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