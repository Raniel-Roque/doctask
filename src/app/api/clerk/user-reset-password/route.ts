import { NextResponse, NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { createRateLimiter, RATE_LIMITS, resetRateLimit } from "@/lib/apiRateLimiter";
import { calculatePasswordStrength } from "@/utils/passwordStrength";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

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

    const { clerkId, newPassword } = body;

    // Validate required fields
    if (!clerkId || !newPassword) {
      return NextResponse.json(
        { error: "Clerk ID and new password are required" },
        { status: 400 },
      );
    }

    // Validate password strength using shared utility (NIST guidelines)
    const passwordStrength = calculatePasswordStrength(newPassword);
    if (!passwordStrength.isAcceptable) {
      return NextResponse.json(
        { error: passwordStrength.feedback },
        { status: 400 },
      );
    }

    // Apply rate limiting
    const rateLimit = createRateLimiter(RATE_LIMITS.PASSWORD_CHANGE);
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

    // Get the Convex user record
    const convexUser = await convex.query(api.fetch.getUserByClerkId, {
      clerkId,
    });
    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 },
      );
    }

    try {
      // Update the user's password
      await client.users.updateUser(clerkId, {
        password: newPassword,
      });

      // Reset rate limit on successful password change
      // This gives the user a fresh set of attempts since they successfully changed their password
      resetRateLimit(RATE_LIMITS.PASSWORD_CHANGE.keyPrefix, clerkId);

      return NextResponse.json({
        success: true,
        message: "Password has been reset successfully",
      });
    } catch (error) {
      const clerkError = error as ClerkError;
      const errorMessage = clerkError.errors?.[0]?.message || "";

      // Check for compromised/weak password error
      if (
        errorMessage.toLowerCase().includes("compromised") ||
        errorMessage.toLowerCase().includes("data breach") ||
        errorMessage.toLowerCase().includes("found in breach") ||
        errorMessage.toLowerCase().includes("pwned") ||
        errorMessage.toLowerCase().includes("haveibeenpwned") ||
        errorMessage.toLowerCase().includes("weak") ||
        errorMessage.toLowerCase().includes("common") ||
        errorMessage.includes("password_strength") ||
        errorMessage.includes("weak_password") ||
        errorMessage.includes("password is too weak") ||
        errorMessage.includes("not strong enough") ||
        errorMessage.toLowerCase().includes("too common") ||
        errorMessage.toLowerCase().includes("password is too common")
      ) {
        return NextResponse.json(
          {
            error: "Password is too weak. Please choose a stronger password.",
          },
          { status: 400 },
        );
      }

      // Forward other Clerk errors
      return NextResponse.json(
        {
          error: errorMessage || "Failed to reset password",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    const serverError = error as Error;
    return NextResponse.json(
      { error: serverError.message || "Failed to reset password" },
      { status: 500 },
    );
  }
}
