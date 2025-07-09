import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { createRateLimiter, getRateLimitConfig } from "./apiRateLimiter";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface SecurityConfig {
  maxBodySize?: number; // in bytes
  allowedMethods?: string[];
  requireAuth?: boolean;
  rateLimitOperation?: string;
}

export function createSecurityMiddleware(config: SecurityConfig = {}) {
  const {
    maxBodySize = 10 * 1024 * 1024, // 10MB default
    allowedMethods = ["GET", "POST", "PUT", "DELETE"],
    requireAuth = true,
    rateLimitOperation,
  } = config;

  return async function securityMiddleware(req: NextRequest) {
    // 1. Method validation
    if (!allowedMethods.includes(req.method)) {
      return NextResponse.json(
        { error: `Method ${req.method} not allowed` },
        { status: 405 },
      );
    }

    // 2. Request size validation
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > maxBodySize) {
      return NextResponse.json(
        {
          error: `Request body too large. Maximum size is ${maxBodySize / (1024 * 1024)}MB`,
        },
        { status: 413 },
      );
    }

    // 3. Authentication check
    if (requireAuth) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // 4. Rate limiting (if operation specified)
      if (rateLimitOperation) {
        try {
          // Get user role from Convex
          const convexUser = await convex.query(api.fetch.getUserByClerkId, {
            clerkId: userId,
          });

          if (!convexUser) {
            return NextResponse.json(
              { error: "User not found in database" },
              { status: 404 },
            );
          }

          const rateLimitConfig = getRateLimitConfig(
            convexUser.role,
            rateLimitOperation,
          );
          const rateLimiter = createRateLimiter(rateLimitConfig);
          const rateLimitResult = rateLimiter(req, userId);

          if (!rateLimitResult.success) {
            return NextResponse.json(
              { error: rateLimitResult.message },
              {
                status: 429,
                headers: {
                  "Retry-After": (rateLimitResult.retryAfter || 60).toString(),
                  "X-RateLimit-Limit": rateLimitConfig.maxRequests.toString(),
                  "X-RateLimit-Remaining": "0",
                  "X-RateLimit-Reset": (
                    Date.now() + rateLimitConfig.windowMs
                  ).toString(),
                },
              },
            );
          }
        } catch {
          // If rate limiting fails, log but don't block the request
        }
      }
    }

    // 5. Security headers
    const response = NextResponse.next();

    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );

    // Add rate limit headers if applicable
    if (rateLimitOperation) {
      const rateLimitConfig = getRateLimitConfig(0, rateLimitOperation); // Default to student role for headers
      response.headers.set(
        "X-RateLimit-Limit",
        rateLimitConfig.maxRequests.toString(),
      );
      response.headers.set(
        "X-RateLimit-Window",
        (rateLimitConfig.windowMs / 1000).toString(),
      );
    }

    return response;
  };
}

// Pre-configured middleware for different operation types
export const studentDocumentMiddleware = createSecurityMiddleware({
  maxBodySize: 5 * 1024 * 1024, // 5MB for documents
  allowedMethods: ["POST", "PUT"],
  rateLimitOperation: "document_update",
});

export const studentTaskMiddleware = createSecurityMiddleware({
  maxBodySize: 1024 * 1024, // 1MB for task updates
  allowedMethods: ["POST", "PUT"],
  rateLimitOperation: "task_update",
});

export const studentProfileMiddleware = createSecurityMiddleware({
  maxBodySize: 1024 * 1024, // 1MB for profile updates
  allowedMethods: ["POST", "PUT"],
  rateLimitOperation: "profile_update",
});

export const studentImageMiddleware = createSecurityMiddleware({
  maxBodySize: 10 * 1024 * 1024, // 10MB for images
  allowedMethods: ["POST"],
  rateLimitOperation: "image_upload",
});

export const adviserNoteMiddleware = createSecurityMiddleware({
  maxBodySize: 2 * 1024 * 1024, // 2MB for notes
  allowedMethods: ["POST", "PUT", "DELETE"],
  rateLimitOperation: "note_create",
});

export const adviserDocumentMiddleware = createSecurityMiddleware({
  maxBodySize: 1024 * 1024, // 1MB for document status updates
  allowedMethods: ["POST", "PUT"],
  rateLimitOperation: "document_status",
});

export const adviserGroupMiddleware = createSecurityMiddleware({
  maxBodySize: 1024 * 1024, // 1MB for group actions
  allowedMethods: ["POST", "PUT"],
  rateLimitOperation: "group_action",
});

// General API middleware
export const generalApiMiddleware = createSecurityMiddleware({
  maxBodySize: 5 * 1024 * 1024, // 5MB default
  allowedMethods: ["GET", "POST", "PUT", "DELETE"],
});
