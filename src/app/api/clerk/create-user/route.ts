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
  let clerkUser = null;
  try {
    const { email, firstName, lastName, role, middle_name, adminId, subrole } = await request.json();
    const password = generatePassword(firstName, lastName);

    const client = await clerkClient();

    // Check if user already exists
    const existingUsers = await client.users.getUserList({
      emailAddress: [email],
    });

    if (existingUsers.data.length > 0) {
      return NextResponse.json(
        { error: "This email is already registered in the system. Please use a different email address." },
        { status: 400 }
      );
    }

    // Create user in Clerk
    clerkUser = await client.users.createUser({
      emailAddress: [email],
      password,
    });

    // Set email as unverified
    const emailAddress = clerkUser.emailAddresses[0];
    await client.emailAddresses.updateEmailAddress(emailAddress.id, {
      primary: true,
      verified: false
    });

    try {
      // Create user in Convex
      await convex.mutation(api.documents.createUser, {
        clerk_id: clerkUser.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        role: role,
        middle_name: middle_name,
        adminId: adminId,
        subrole: subrole
      });
    } catch (convexError) {
      // If Convex creation fails, delete the Clerk user
      if (clerkUser) {
        await client.users.deleteUser(clerkUser.id);
      }
      throw convexError;
    }

    // Send welcome email using Resend
    try {
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
              <p style="margin: 10px 0 0 0;"><strong>Temporary Password:</strong> ${password}</p>
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
      // Continue even if email fails
    }

    return NextResponse.json({ clerkId: clerkUser.id });
  } catch (error: unknown) {
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
      { error: clerkError.errors?.[0]?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}