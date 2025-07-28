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
        // Delete all images from storage only (not database)
        const images = await convex.query(api.fetch.getAllImages);
        for (const image of images) {
          try {
            await convex.mutation(api.restore.deleteImageFromStorage, {
              file_id: image.file_id,
            });
          } catch {}
        }
        break;

      case "delete_all_data":
        // Delete all data from Convex first (in the same order as restore)
        await convex.mutation(api.restore.deleteAllStudents);
        await convex.mutation(api.restore.deleteAllAdvisers);
        await convex.mutation(api.restore.deleteAllGroups);
        await convex.mutation(api.restore.deleteAllDocuments);

        // Delete all Liveblocks rooms
        try {
          const liveblocks = new Liveblocks({
            secret: process.env.LIVEBLOCKS_SECRET_KEY!,
          });

          // Get all rooms and delete them
          const rooms = await liveblocks.getRooms();
          for (const room of rooms.data) {
            await liveblocks.deleteRoom(room.id);
          }
        } catch {}

        await convex.mutation(api.restore.deleteAllTaskAssignments);
        await convex.mutation(api.restore.deleteAllDocumentStatus);
        await convex.mutation(api.restore.deleteAllNotes);
        await convex.mutation(api.restore.deleteAllLogs);
        await convex.mutation(api.restore.deleteAllImages);
        await convex.mutation(api.restore.deleteAllUsers, {
          currentUserId: convexUser._id,
        });

        // Then delete all users from Clerk except the current instructor
        const { data: allUsers } = await client.users.getUserList();
        for (const clerkUser of allUsers) {
          if (clerkUser.id !== convexUser.clerk_id) {
            try {
              await client.users.deleteUser(clerkUser.id);
            } catch {}
          }
        }
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
