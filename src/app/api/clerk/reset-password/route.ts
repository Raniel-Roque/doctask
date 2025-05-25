import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from 'resend';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const resend = new Resend(process.env.RESEND_API_KEY);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

function generatePassword(firstName: string, lastName: string): string {
  const firstInitial = firstName.charAt(0).toUpperCase();
  const formattedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  // Generate base password
  let password = `${firstInitial}${formattedLastName}${hours}${minutes}`;
  
  // If less than 8 characters, add random numbers until it's at least 8
  while (password.length < 8) {
    password += Math.floor(Math.random() * 10);
  }
  
  return password;
}

export async function POST(request: Request) {
  try {
    const { clerkId } = await request.json();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Clerk ID is required" },
        { status: 400 }
      );
    }

    // Get user details from Convex
    const user = await convex.query(api.documents.getUserByClerkId, { clerkId });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);
    const email = clerkUser.emailAddresses[0].emailAddress;

    // Generate a new temporary password
    const newPassword = generatePassword(user.first_name, user.last_name);

    // Update the existing user's password
    await client.users.updateUser(clerkId, {
      password: newPassword,
    });

    // Update Convex to log the password reset
    try {
      await convex.mutation(api.documents.resetPassword, {
        userId: user._id,
        instructorId: user._id
      });
    } catch {
      // Continue even if Convex update fails
    }

    // Send password reset email using Resend
    try {
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
          </div>
        `,
      });
    } catch {
      // Continue even if email fails
    }

    return NextResponse.json({ 
      success: true,
      clerkId: clerkId
    });
  } catch (error) {
    const clerkError = error as ClerkError;
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to reset password" },
      { status: 500 }
    );
  }
} 