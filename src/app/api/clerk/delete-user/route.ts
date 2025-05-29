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
    const convexUser = await convex.query(api.fetch.getUserByClerkId, { clerkId });
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

    // If user is an adviser, delete their adviser code
    if (convexUser.role === 1) {
      try {
        const adviserCode = await convex.query(api.fetch.getAdviserCode, { adviserId: convexUser._id });
        if (adviserCode) {
          await convex.mutation(api.mutations.deleteAdviserCode, { adviserId: convexUser._id });
        }
      } catch (error) {
        console.error("Failed to delete adviser code:", error);
        // Continue with user deletion even if code deletion fails
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
      await convex.mutation(api.mutations.deleteUser, {
        userId: convexUser._id,
        instructorId: instructorId
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