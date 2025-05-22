import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from 'resend';
import { User } from "@clerk/nextjs/server";

// Initialize Resend with proper error handling
let resend: Resend;
try {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  resend = new Resend(process.env.RESEND_API_KEY);
} catch (error) {
  console.error("Failed to initialize Resend:", error);
}

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

    const emailExists = existingUsers.data.some((user: User) => 
      user.id !== clerkId && 
      user.emailAddresses.some((e: { emailAddress: string }) => e.emailAddress === email)
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

    // Generate new password
    const password = generatePassword(firstName, lastName);

    // Only after all validations pass, proceed with the update
    // Delete old user from Clerk
    await client.users.deleteUser(clerkId);

    // Create new user in Clerk
    const newUser = await client.users.createUser({
      emailAddress: [email],
      password,
    });

    // Send welcome email using Resend with improved error handling
    try {
      if (!resend) {
        throw new Error("Email service is not properly configured");
      }

      const emailResponse = await resend.emails.send({
        from: 'DocTask <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to DocTask - Your Account Details',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to DocTask!</h2>
            
            <p>Dear ${firstName} ${lastName},</p>
            
            <p>Your account has been updated. Here are your new login details:</p>
            
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

      if (!emailResponse || emailResponse.error) {
        console.error("Failed to send email:", emailResponse?.error);
        throw new Error("Failed to send welcome email");
      }
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Continue with the user creation even if email fails
      // But log the error for monitoring
    }

    return NextResponse.json({ 
      success: true,
      newClerkId: newUser.id 
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