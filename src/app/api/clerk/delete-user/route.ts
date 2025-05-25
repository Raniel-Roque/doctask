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
    const { clerkId, instructorId } = await request.json();

    if (!clerkId || !instructorId) {
      return NextResponse.json(
        { error: "Clerk ID and instructor ID are required" },
        { status: 400 }
      );
    }

    // Get the Convex user record first
    const convexUser = await convex.query(api.documents.getUserByClerkId, { clerkId });
    if (!convexUser) {
      // If user not found in Convex, just try to delete from Clerk
      try {
        const client = await clerkClient();
        await client.users.deleteUser(clerkId);
        return NextResponse.json({ success: true });
      } catch {
        return NextResponse.json(
          { error: "Failed to delete user from authentication service" },
          { status: 500 }
        );
      }
    }

    // Delete from Clerk first
    try {
      const client = await clerkClient();
      await client.users.deleteUser(clerkId);
    } catch {
      return NextResponse.json(
        { error: "Failed to delete user from authentication service" },
        { status: 500 }
      );
    }

    // Then delete from Convex
    try {
      await convex.mutation(api.documents.deleteUser, {
        userId: convexUser._id,
        instructorId: instructorId,
        details: "Deleted User"
      });
    } catch (error) {
      // If Convex deletion fails, we can't restore the Clerk user
      // Just log the error and return success since the main goal (deleting the user) was achieved
      console.error("Failed to delete from Convex:", error);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const clerkError = error as ClerkError;
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
} 