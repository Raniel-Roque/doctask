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
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { clerkId } = body;

    // Validate required fields before sanitization
    if (!clerkId) {
      return NextResponse.json(
        { error: "Clerk ID is required" },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedClerkId = sanitizeInput(clerkId, { trim: true, removeHtml: true, escapeSpecialChars: true });

    // Validate required fields after sanitization
    if (!sanitizedClerkId) {
      return NextResponse.json(
        { error: "Clerk ID is invalid after sanitization" },
        { status: 400 }
      );
    }

    const user = await convex.query(api.fetch.getUserByClerkId, { clerkId: sanitizedClerkId });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(sanitizedClerkId);
    const email = clerkUser.emailAddresses[0].emailAddress;
    const newPassword = generatePassword(user.first_name, user.last_name, user._creationTime);

    await client.users.updateUser(sanitizedClerkId, {
      password: newPassword,
    });

    await convex.mutation(api.mutations.updateEmailStatus, {
      userId: user._id,
    });

    await convex.mutation(api.mutations.resetPassword, {
      userId: user._id,
      instructorId: user._id
    });

    await resend.emails.send({
      from: 'DocTask <onboarding@resend.dev>',
      to: email,
      subject: 'DocTask - Your Password Has Been Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Notification</h2>
          
          <p>Dear ${user.first_name} ${user.last_name},</p>
          
          <p>Your password has been reset by an instructor. Here are your new login credentials:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0 0 0;"><strong>New Password:</strong> ${newPassword}</p>
          </div>
          
          <p><strong>Important Next Steps:</strong></p>
          <ol>
            <li>Log in to your account using the new password above</li>
            <li>Change your password immediately for security purposes</li>
          </ol>
          
          <p>If you did not request this password reset, please contact our support team immediately.</p>
          
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
      clerkId: sanitizedClerkId,
    });
  } catch (error) {
    const clerkError = error as ClerkError;
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to reset password" },
      { status: 500 }
    );
  }
} 