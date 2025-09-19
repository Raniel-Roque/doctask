import { NextResponse, NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { createRateLimiter, RATE_LIMITS } from "@/lib/apiRateLimiter";
import { Liveblocks } from "@liveblocks/node";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { clerkId, action } = body;

    // Validate required fields
    if (!clerkId || !action) {
      return NextResponse.json(
        { error: "Clerk ID and action are required" },
        { status: 400 },
      );
    }

    // Apply rate limiting
    const rateLimit = createRateLimiter(RATE_LIMITS.DESTRUCTIVE_ACTION);
    const rateLimitResult = rateLimit(request, clerkId);

    if (!rateLimitResult.success) {
      const headers: Record<string, string> = {};
      if (rateLimitResult.retryAfter) {
        headers["Retry-After"] = rateLimitResult.retryAfter.toString();
      }
      return NextResponse.json(
        { error: rateLimitResult.message },
        { status: 429, headers },
      );
    }

    const client = await clerkClient();

    // Get the user to verify it exists and is an instructor
    const user = await client.users.getUser(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the Convex user record to verify instructor role
    const convexUser = await convex.query(api.fetch.getUserByClerkId, {
      clerkId,
    });

    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 },
      );
    }

    // Verify user is an instructor (role 2)
    if (convexUser.role !== 2) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - Only instructors can perform destructive actions",
        },
        { status: 401 },
      );
    }

    // Execute the requested action
    switch (action) {
      case "delete_all_users":
        await convex.mutation(api.restore.deleteAllUsers, {
          currentUserId: convexUser._id,
        });
        break;

      case "delete_all_groups":
        await convex.mutation(api.restore.deleteAllGroups);
        break;

      case "delete_all_documents":
        await convex.mutation(api.restore.deleteAllDocuments);
        break;

      case "delete_images_from_storage":
        // Delete all images from storage only (not database) in parallel
        const images = await convex.query(api.fetch.getAllImages);
        await Promise.all(
          images.map((image) =>
            convex
              .mutation(api.restore.deleteImageFromStorage, {
                file_id: image.file_id,
              })
              .catch(() => {}),
          ),
        );
        break;

      case "delete_all_data":
        // Use the optimized deleteAllData mutation for better performance
        await convex.mutation(api.restore.deleteAllData, {
          currentUserId: convexUser._id,
          includeImages: true,
          includeLogs: true,
        });

        // Delete all Liveblocks rooms in parallel
        try {
          const liveblocks = new Liveblocks({
            secret: process.env.LIVEBLOCKS_SECRET_KEY!,
          });

          // Get all rooms and delete them in parallel
          const rooms = await liveblocks.getRooms();
          await Promise.all(
            rooms.data.map((room) => liveblocks.deleteRoom(room.id)),
          );
        } catch {}

        // Then delete all users from Clerk except the current instructor in parallel
        const { data: allUsers } = await client.users.getUserList();
        const usersToDelete = allUsers.filter(
          (clerkUser) => clerkUser.id !== convexUser.clerk_id,
        );

        await Promise.all(
          usersToDelete.map((clerkUser) =>
            client.users.deleteUser(clerkUser.id).catch(() => {}),
          ),
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action specified" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      message: `Action "${action}" completed successfully`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to execute destructive action" },
      { status: 500 },
    );
  }
}
