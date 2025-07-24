import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const result = await convex.mutation(api.mutations.updateEmailStatus, {
      userId,
    });

    if (!result || !result.success) {
      return NextResponse.json(
        { error: "Failed to update email verification status" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
