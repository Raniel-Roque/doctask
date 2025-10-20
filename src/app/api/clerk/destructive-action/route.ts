import { NextResponse, NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
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

    const { clerkId, action, selectedTables } = body;

    // Validate required fields
    if (!clerkId || !action) {
      return NextResponse.json(
        { error: "Clerk ID and action are required" },
        { status: 400 },
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
    let deletionResults:
      | Array<{ id: string; success: boolean; error?: string }>
      | undefined;
    let selectiveDeletionResults: {
      selectedTables: string[];
      results: Array<{
        table: string;
        success: boolean;
        deletedCounts?: Record<string, number>;
        deletedCount?: number;
        error?: string;
      }>;
    } | undefined = undefined;

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
        // First, get all Clerk users before deleting Convex data (with pagination)
        let allUsers: Array<{
          id: string;
          emailAddresses?: Array<{ emailAddress: string }>;
        }> = [];
        let hasMore = true;
        let offset = 0;
        const limit = 100; // Clerk's default limit per page

        while (hasMore) {
          const response = await client.users.getUserList({
            limit,
            offset,
          });
          allUsers = allUsers.concat(response.data);
          hasMore = response.data.length === limit; // Check if we got a full page
          offset += limit;
        }

        const usersToDelete = allUsers.filter(
          (clerkUser) => clerkUser.id !== clerkId, // Use the original clerkId parameter
        );

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

        // Then delete all users from Clerk except the current instructor
        // Use sequential deletion to avoid rate limiting issues
        deletionResults = [];

        for (let i = 0; i < usersToDelete.length; i++) {
          const clerkUser = usersToDelete[i];

          try {
            // For verified/active users, we might need to handle them differently
            // but Clerk's deleteUser should work for all user types
            await client.users.deleteUser(clerkUser.id);
            deletionResults.push({ id: clerkUser.id, success: true });

            // Add a small delay between deletions to avoid rate limiting
            if (i < usersToDelete.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          } catch (error) {
            // Try retry for verified/active users (they might need multiple attempts)
            let retrySuccess = false;
            for (let retry = 0; retry < 2; retry++) {
              try {
                await new Promise((resolve) => setTimeout(resolve, 500)); // Wait before retry
                await client.users.deleteUser(clerkUser.id);
                deletionResults.push({ id: clerkUser.id, success: true });
                retrySuccess = true;
                break;
              } catch {
                // Silent retry failure
              }
            }

            if (!retrySuccess) {
              deletionResults.push({
                id: clerkUser.id,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        }

        // Track deletion results (for potential future use)
        deletionResults.filter((r) => !r.success);
        break;

      case "selective_delete":
        if (!selectedTables || !Array.isArray(selectedTables) || selectedTables.length === 0) {
          return NextResponse.json(
            { error: "selectedTables array is required for selective deletion" },
            { status: 400 },
          );
        }

        // Execute selective deletions based on selected tables
        const deletionPromises = [];
        
        for (const table of selectedTables) {
          switch (table) {
            case "students":
              deletionPromises.push(
                convex.mutation(api.restore.deleteStudentsWithDependencies, {
                  currentUserId: convexUser._id,
                })
              );
              break;
            case "advisers":
              deletionPromises.push(
                convex.mutation(api.restore.deleteAdvisersWithDependencies, {
                  currentUserId: convexUser._id,
                })
              );
              break;
            case "groups":
              deletionPromises.push(
                convex.mutation(api.restore.deleteGroupsWithDependencies, {
                  currentUserId: convexUser._id,
                })
              );
              break;
            case "adviser_logs":
              deletionPromises.push(
                convex.mutation(api.restore.deleteAdviserLogs, {
                  currentUserId: convexUser._id,
                })
              );
              break;
            case "general_logs":
              deletionPromises.push(
                convex.mutation(api.restore.deleteGeneralLogs, {
                  currentUserId: convexUser._id,
                })
              );
              break;
          }
        }

        // Execute all selected deletions in parallel
        const results = await Promise.all(deletionPromises);
        selectiveDeletionResults = {
          selectedTables,
          results: results.map((result, index) => ({
            table: selectedTables[index],
            ...result,
          })),
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action specified" },
          { status: 400 },
        );
    }

    // Prepare response message based on action
    let responseMessage = `Action "${action}" completed successfully`;
    let responseData: {
      success: boolean;
      message: string;
      deletionResults?: {
        totalUsers: number;
        successfulDeletions: number;
        failedDeletions: number;
        details: Array<{ id: string; success: boolean; error?: string }>;
      };
      selectiveDeletionResults?: {
        selectedTables: string[];
        results: Array<{
          table: string;
          success: boolean;
          deletedCounts?: Record<string, number>;
          deletedCount?: number;
          error?: string;
        }>;
      };
    } = { success: true, message: responseMessage };

    // Add deletion results for delete_all_data action
    if (
      action === "delete_all_data" &&
      typeof deletionResults !== "undefined" &&
      deletionResults.length > 0
    ) {
      const successfulDeletions = deletionResults.filter(
        (r) => r.success,
      ).length;
      const totalDeletions = deletionResults.length;

      if (successfulDeletions === totalDeletions) {
        responseMessage = `All data deleted successfully. Removed ${successfulDeletions} users from Clerk.`;
      } else {
        responseMessage = `Data deletion completed with warnings. Successfully deleted ${successfulDeletions}/${totalDeletions} users from Clerk.`;
      }

      responseData = {
        success: true,
        message: responseMessage,
        deletionResults: {
          totalUsers: totalDeletions,
          successfulDeletions,
          failedDeletions: totalDeletions - successfulDeletions,
          details: deletionResults,
        },
      };
    }

    // Add selective deletion results
    if (action === "selective_delete" && selectiveDeletionResults) {
      const totalDeleted = selectiveDeletionResults.results.reduce((sum: number, result) => {
        if (result.success && result.deletedCounts) {
          return sum + Object.values(result.deletedCounts).reduce((countSum: number, count: unknown) => countSum + (typeof count === 'number' ? count : 0), 0);
        } else if (result.success && result.deletedCount) {
          return sum + result.deletedCount;
        }
        return sum;
      }, 0);

      responseMessage = `Selective deletion completed successfully. Deleted ${totalDeleted} total records across ${selectedTables.length} table(s).`;
      responseData = {
        success: true,
        message: responseMessage,
        selectiveDeletionResults,
      };
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Destructive action error:", error);
    return NextResponse.json(
      { 
        error: "Failed to execute destructive action",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 },
    );
  }
}
