import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { clerkId } = await req.json();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Clerk ID is required" },
        { status: 400 }
      );
    }

    // Delete user from Clerk
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Clerk user:", error);
    return NextResponse.json(
      { error: "Failed to delete user from Clerk" },
      { status: 500 }
    );
  }
}
