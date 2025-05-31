import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { password } = await request.json();
    if (!password) {
      return new NextResponse("Password is required", { status: 400 });
    }

    // Initialize Clerk client
    const clerk = await clerkClient();

    // Get the user first
    const user = await clerk.users.getUser(userId);
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Verify the password
    try {
      const result = await clerk.users.verifyPassword({
        userId,
        password,
      });
      console.log("Password verification result:", result);
      return new NextResponse("Password verified", { status: 200 });
    } catch (verifyError) {
      console.error("Password verification failed:", verifyError);
      return new NextResponse("Invalid password", { status: 401 });
    }
  } catch (error) {
    console.error("Password verification error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 