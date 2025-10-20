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
    
    // Use the same update-user API that PrimaryProfile uses
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clerk/update-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: instructorUser.clerk_id,
        instructorId: instructorUser._id,
        firstName: "Admin",
        lastName: "Instructor", 
        email: newInstructorEmail.toLowerCase(),
        newPassword: newInstructorPassword, // Add password update
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update instructor account");
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
