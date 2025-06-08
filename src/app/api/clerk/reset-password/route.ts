import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { generatePassword } from "@/utils/passwordGeneration";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    // Validate required fields
    if (!clerkId) {
      return NextResponse.json(
        { error: "Clerk ID is required" },
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

    // Generate a new password using the shared utility
    const newPassword = generatePassword(convexUser.first_name, convexUser.last_name, Date.now());

    // Update the user's password
    await client.users.updateUser(clerkId, {
      password: newPassword,
    });

    // Log the password reset
    await convex.mutation(api.mutations.resetPassword, {
      userId: convexUser._id,
      instructorId: convexUser._id, // Using the same ID since this is a self-reset
    });

    return NextResponse.json({ 
      success: true,
      email: user.emailAddresses[0].emailAddress,
      firstName: convexUser.first_name,
      lastName: convexUser.last_name,
      password: newPassword
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
} 