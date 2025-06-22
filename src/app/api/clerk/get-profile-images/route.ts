import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body || !Array.isArray(body.userIds)) {
      return NextResponse.json(
        { error: "Invalid request body - userIds array is required" },
        { status: 400 }
      );
    }

    const { userIds } = body;

    // Validate required fields
    if (!userIds || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required and cannot be empty" },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Get Convex users to get their Clerk IDs
    const convexUsers = await Promise.all(
      userIds.map((id: Id<"users">) => convex.query(api.fetch.getUserById, { id }))
    );

    // Filter out null users and extract Clerk IDs
    const validUsers = convexUsers.filter(user => user !== null);
    const clerkIds = validUsers.map(user => user!.clerk_id);

    // Fetch profile images from Clerk
    const profileImages: Record<string, string> = {};
    
    for (const clerkId of clerkIds) {
        const user = await client.users.getUser(clerkId);
        if (user && user.imageUrl) {
            profileImages[clerkId] = user.imageUrl;
        }
    }

    return NextResponse.json({ 
      success: true,
      profileImages
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch profile images" },
      { status: 500 }
    );
  }
} 