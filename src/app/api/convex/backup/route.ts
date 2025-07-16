import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export async function POST(request: Request) {
  try {
    const { instructorId } = await request.json();
    if (!instructorId) {
      return new NextResponse("Missing instructorId", { status: 400 });
    }

    // Initialize Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Verify instructor permissions
    const instructor = await convex.query(api.fetch.getUserById, {
      id: instructorId as Id<"users">,
    });

    if (!instructor) {
      return NextResponse.json(
        { error: "Instructor not found" },
        { status: 404 },
      );
    }

    if (instructor.role !== 2) {
      return NextResponse.json(
        { error: "Unauthorized - Only instructors can create backups" },
        { status: 401 },
      );
    }

    // Call the backup mutation
    const backup = await convex.mutation(api.mutations.downloadConvexBackup, {
      instructorId: instructorId as Id<"users">,
    });

    return NextResponse.json(backup);
  } catch {
    return new NextResponse("Failed to create backup. Please try again.", {
      status: 500,
    });
  }
}
