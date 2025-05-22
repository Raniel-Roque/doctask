import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  try {
    const { clerkId } = await request.json();
    
    const client = await clerkClient();
    await client.users.deleteUser(clerkId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user from Clerk:", error);
    return NextResponse.json(
      { error: "Failed to delete user from Clerk" },
      { status: 500 }
    );
  }
} 