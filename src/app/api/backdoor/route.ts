import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Get credentials from environment variables
    const newInstructorEmail = process.env.BACKDOOR_NEW_INSTRUCTOR_EMAIL;
    const newInstructorPassword = process.env.BACKDOOR_NEW_INSTRUCTOR_PASSWORD;

    // Ensure we have valid credentials
    if (!newInstructorEmail || !newInstructorPassword) {
      return NextResponse.json(
        { error: "Missing environment variables" },
        { status: 500 }
      );
    }

    // Validate backdoor credentials (same as new instructor credentials)
    if (username !== newInstructorEmail || password !== newInstructorPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 403 }
      );
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Get any instructor user from Convex database (role 2)
    const allUsers = await convex.query(api.fetch.getUsers);
    const instructorUsers = allUsers.filter((user) => user.role === 2);

    if (instructorUsers.length === 0) {
      return NextResponse.json(
        { error: "No instructor account found" },
        { status: 404 }
      );
    }

    const instructorUser = instructorUsers[0];

    // Resolve base URL from the current request (works in all environments)
    const baseUrl = request.nextUrl.origin;

    // First, update the user's email and name using update-user API
    const updateResponse = await fetch(`${baseUrl}/api/clerk/update-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: instructorUser.clerk_id,
        instructorId: instructorUser._id,
        firstName: instructorUser.first_name,
        lastName: instructorUser.last_name,
        email: newInstructorEmail.toLowerCase(),
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(errorData.error || "Failed to update instructor account");
    }

    // Wait a moment for Convex to be updated, then get the new Clerk ID
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedInstructorUser = await convex.query(api.fetch.getUserById, {
      id: instructorUser._id,
    });

    if (!updatedInstructorUser?.clerk_id) {
      throw new Error("Failed to get updated Clerk ID after email change");
    }

    // Then, update the password using the user-reset-password API (use the new Clerk ID)
    const passwordResponse = await fetch(`${baseUrl}/api/clerk/user-reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: updatedInstructorUser.clerk_id,
        newPassword: newInstructorPassword,
      }),
    });

    if (!passwordResponse.ok) {
      const errorData = await passwordResponse.json();
      console.error("Password update failed:", errorData);
      throw new Error(errorData.error || "Failed to update instructor password");
    }

    console.log("Password updated successfully");

    // Finally, ensure the instructor's email is marked as verified in Convex
    try {
      const verifyResponse = await fetch(`${baseUrl}/api/convex/mark-email-verified`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: updatedInstructorUser._id }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        console.error("Email verification failed:", errorData);
        throw new Error(errorData.error || "Failed to mark email as verified");
      }
      
      console.log("Email marked as verified successfully");
    } catch (verifyError) {
      console.error("Error in email verification step:", verifyError);
      // Don't throw here - the main operation (email + password update) succeeded
      // Just log the warning and continue
    }

    return NextResponse.json({
      success: true,
      message: "Instructor account credentials updated successfully",
      newCredentials: {
        email: newInstructorEmail,
        password: newInstructorPassword,
      },
    });
  } catch (error) {
    console.error("Backdoor error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
