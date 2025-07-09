import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import { Id } from "../../../../../convex/_generated/dataModel";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { instructorId } = await request.json();
    if (!instructorId) {
      return new NextResponse("Missing instructorId", { status: 400 });
    }

    // Initialize Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
