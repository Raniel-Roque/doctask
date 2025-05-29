import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from 'resend';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { generatePassword } from "@/utils/passwordGeneration";

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
    const { firstName, lastName, email, role, middle_name, instructorId, subrole } = await request.json();

    // Trim all string values and convert null to undefined
    const trimmedFirstName = firstName?.trim() || null;
    const trimmedLastName = lastName?.trim() || null;
    const trimmedEmail = email?.trim() || null;
    const trimmedMiddleName = middle_name?.trim() || null;

    // Validate required fields
    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || role === undefined || !instructorId) {
      return NextResponse.json(
        { error: "Required fields are missing" },
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
      await convex.mutation(api.documents.createUser, {
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

    // Send welcome email
    try {
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
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Continue even if email fails
    }

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
      try {
        const client = await clerkClient();
        await client.users.deleteUser(clerkUser.id);
      } catch {
        // Ignore cleanup errors
      }
    }

    const clerkError = error as ClerkError;
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}