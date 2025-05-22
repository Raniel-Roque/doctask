import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const { clerkId } = await request.json();
    
    const client = await clerkClient();
    await client.users.deleteUser(clerkId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    
    const clerkError = error as ClerkError;
    
    // Return a more specific error message
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
} 