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
    const { clerkId, adminId } = await request.json();

    if (!clerkId || !adminId) {
      return NextResponse.json(
        { error: "Clerk ID and Admin ID are required" },
        { status: 400 }
      );
    }

    // Get the Convex user record first
    const convexUser = await convex.query(api.documents.getUserByClerkId, { clerkId });
    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Log the deletion in Convex first
    try {
      await convex.mutation(api.documents.deleteUser, {
        userId: convexUser._id,
        adminId: adminId,
        details: "Deleted User"
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to log deletion in database" },
        { status: 500 }
      );
    }

    // Then delete from Clerk
    try {
      const client = await clerkClient();
      await client.users.deleteUser(clerkId);
    } catch {
      // If Clerk deletion fails, we should try to restore the Convex record
      try {
        await convex.mutation(api.documents.createUser, {
          clerk_id: clerkId,
          first_name: convexUser.first_name,
          last_name: convexUser.last_name,
          email: convexUser.email,
          role: convexUser.role,
          middle_name: convexUser.middle_name,
          adminId: adminId,
          subrole: convexUser.subrole
        });
      } catch {
        // If restoration fails, at least we have the deletion logged
      }

      return NextResponse.json(
        { error: "Failed to delete user from authentication service" },
        { status: 500 }
      );
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