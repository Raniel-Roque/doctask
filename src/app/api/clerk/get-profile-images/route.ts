import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body || !Array.isArray(body.userIds)) {
      return NextResponse.json(
        { error: "Invalid request body - userIds array is required" },
        { status: 400 },
      );
    }

    const { userIds } = body;

    // Validate required fields
    if (!userIds || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required and cannot be empty" },
        { status: 400 },
      );
    }

    const client = await clerkClient();

    // Get Convex users to get their Clerk IDs
    const convexUsers = await Promise.all(
      userIds.map((id: Id<"users">) =>
        convex.query(api.fetch.getUserById, { id }),
      ),
    );

    // Filter out null users and extract Clerk IDs
    const validUsers = convexUsers.filter((user) => user !== null);
    const clerkIds = validUsers.map((user) => user!.clerk_id);

    // Fetch profile images from Clerk in parallel
    const profileImages: Record<string, string> = {};

    const userPromises = clerkIds.map(async (clerkId) => {
      try {
        const user = await client.users.getUser(clerkId);
        return { clerkId, imageUrl: user?.imageUrl };
      } catch {
        return { clerkId, imageUrl: null };
      }
    });

    const userResults = await Promise.all(userPromises);

    userResults.forEach(({ clerkId, imageUrl }) => {
      if (imageUrl) {
        profileImages[clerkId] = imageUrl;
      }
    });

    return NextResponse.json({
      success: true,
      profileImages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, ErrorContexts.fetchData('user')) },
      { status: 500 },
    );
  }
}
