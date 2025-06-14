import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

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

    const { clerkId, newPassword } = body;

    // Validate required fields
    if (!clerkId || !newPassword) {
      return NextResponse.json(
        { error: "Clerk ID and new password are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Get the user to verify it exists
    const user = await client.users.getUser(clerkId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get the Convex user record
    const convexUser = await convex.query(api.fetch.getUserByClerkId, { clerkId });
    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    try {
      // Update the user's password
      await client.users.updateUser(clerkId, {
        password: newPassword,
      });

      return NextResponse.json({ 
        success: true,
        message: "Password has been reset successfully"
      });
    } catch (error) {
      const clerkError = error as ClerkError;
      
      // Check for password strength error
      if (clerkError.errors?.[0]?.message?.includes('password_strength') ||
          clerkError.errors?.[0]?.message?.includes('weak_password') ||
          clerkError.errors?.[0]?.message?.includes('password is too weak') ||
          clerkError.errors?.[0]?.message?.includes('not strong enough')) {
        return NextResponse.json(
          { error: "Password is too weak. Please use a stronger password with a mix of letters, numbers, and special characters." },
          { status: 400 }
        );
      }

      // Forward other Clerk errors
      return NextResponse.json(
        { error: clerkError.errors?.[0]?.message || "Failed to reset password" },
        { status: 400 }
      );
    }
  } catch (error) {
    const serverError = error as Error;
    return NextResponse.json(
      { error: serverError.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
