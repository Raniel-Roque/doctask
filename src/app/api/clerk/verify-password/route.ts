import { NextResponse, NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import {
  createRateLimiter,
  RATE_LIMITS,
  resetRateLimit,
} from "@/lib/apiRateLimiter";

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

    const { clerkId, currentPassword } = body;

    // Validate required fields
    if (!clerkId || !currentPassword) {
      return NextResponse.json(
        { error: "Clerk ID and current password are required" },
        { status: 400 },
      );
    }

    // Use password as-is (already secure over HTTPS)
    // The encryption was causing compatibility issues between client and server
    const passwordToVerify = currentPassword;

    // Apply rate limiting
    const rateLimit = createRateLimiter(RATE_LIMITS.PASSWORD_VERIFY);
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

    // Get the user to verify it exists
    const user = await client.users.getUser(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the current password
    try {
      await client.users.verifyPassword({
        userId: clerkId,
        password: passwordToVerify,
      });

      // Reset rate limit on successful verification
      // This gives the user a fresh set of attempts since they proved their identity
      resetRateLimit(RATE_LIMITS.PASSWORD_VERIFY.keyPrefix, clerkId);

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Password is incorrect" },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to verify password" },
      { status: 500 },
    );
  }
}
