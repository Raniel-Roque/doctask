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
    const { clerkId, email, firstName, lastName } = await request.json();

    // Validate input
    if (!clerkId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Check if the new email already exists in Clerk (excluding the current user)
    const existingUsers = await client.users.getUserList({
      emailAddress: [email],
    });

    const emailExists = existingUsers.data.some((user) => 
      user.id !== clerkId && 
      user.emailAddresses.some((e) => e.emailAddress === email)
    );

    if (emailExists) {
      return NextResponse.json(
        { error: "This email is already registered in the system. Please use a different email address." },
        { status: 400 }
      );
    }

    // Get the current user to verify it exists
    const currentUser = await client.users.getUser(clerkId);
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get the Convex user record
    const convexUser = await convex.query(api.documents.getUserByClerkId, { clerkId });
    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Check if a new user was already created for this email
    const existingNewUser = await client.users.getUserList({
      emailAddress: [email],
    });

    let newUser;
    let newPassword;
    if (existingNewUser.data.some(user => user.id !== clerkId)) {
      // A new user was already created but the process didn't complete
      newUser = existingNewUser.data.find(user => user.id !== clerkId);
    } else {
      // Generate a new password
      newPassword = generatePassword(firstName, lastName);

      // Create new user with the new email
      newUser = await client.users.createUser({
        emailAddress: [email],
        password: newPassword,
      });

      // Set email as unverified
      const emailAddress = newUser.emailAddresses[0];
      await client.emailAddresses.updateEmailAddress(emailAddress.id, {
        primary: true,
        verified: false
      });
    }

    if (!newUser) {
      return NextResponse.json(
        { error: "Failed to create or find new user" },
        { status: 500 }
      );
    }

    // Check if old user still exists before trying to delete
    try {
      const oldUser = await client.users.getUser(clerkId);
      if (oldUser) {
        await client.users.deleteUser(clerkId);
      }
    } catch {
      // Old user already deleted or not found, continuing...
    }

    // Send email update notification using Resend
    try {
      if (!resend) {
        throw new Error("Email service is not properly configured");
      }

      await resend.emails.send({
        from: 'DocTask <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to DocTask - Your Account Details',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to DocTask!</h2>
            
            <p>Dear ${firstName} ${lastName},</p>
            
            <p>Your account is now registered. Here are your login details:</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
              ${newPassword ? `<p style="margin: 10px 0 0 0;"><strong>Temporary Password:</strong> ${newPassword}</p>` : ''}
            </div>
            
            <p><strong>Important Next Steps:</strong></p>
            <ol>
              <li>Log in to your account using the temporary password above</li>
              <li>Change your password immediately for security</li>
              <li>Verify your email address</li>
            </ol>
            
            <p>If you need any assistance, please contact our support team.</p>
            
            <p style="margin-top: 30px; color: #666;">
              Best regards,<br>
              The DocTask Team
            </p>
          </div>
        `,
      });
    } catch {
      // Continue with the update even if email fails
    }

    return NextResponse.json({ 
      success: true,
      clerkId: newUser.id // Return the new clerkId
    });
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    
    const clerkError = error as ClerkError;
    
    // Check for Clerk's duplicate email error
    if (clerkError.errors?.[0]?.message?.includes("email address exists") || 
        clerkError.errors?.[0]?.message?.includes("email_address_exists") ||
        clerkError.errors?.[0]?.message?.includes("email already exists")) {
      return NextResponse.json(
        { error: "This email is already registered in the system. Please use a different email address." },
        { status: 400 }
      );
    }

    // Return a more specific error message for other cases
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to update user" },
      { status: 500 }
    );
  }
} 