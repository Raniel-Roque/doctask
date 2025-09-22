import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { adviserId, instructorId } = await request.json();

    if (!adviserId || !instructorId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Call the Convex mutation
    const result = await convex.mutation(api.mutations.resetAdviserCode, {
      adviserId: adviserId as Id<"users">,
      instructorId: instructorId as Id<"users">,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        newCode: result.newCode,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to reset adviser code" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Reset adviser code error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
