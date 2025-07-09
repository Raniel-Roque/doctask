/**
 * ADVANCED API RATE LIMITING UTILITY
 *
 * Purpose: Role-based rate limiting for Next.js API routes with different limits per user role
 * Usage: Import in /api/* route handlers for sophisticated rate limiting
 * Scope: HTTP requests to API routes with role-based configurations
 *
 * Features:
 * - Different rate limits for students vs advisers vs instructors
 * - Automatic role detection and limit application
 * - Middleware wrapper for easy integration
 *
 * Example:
 * const handler = withRateLimit('document_update')(async (req, userId, userRole) => {
 *   // Your API logic here
 * });
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

// Rate limit configurations for different operations
export const RATE_LIMITS = {
  // Student operations (more restrictive)
  STUDENT_DOCUMENT_UPDATE: {
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: "doc_update",
  }, // 10 per minute
  STUDENT_TASK_UPDATE: {
    maxRequests: 20,
    windowMs: 60000,
    keyPrefix: "task_update",
  }, // 20 per minute
  STUDENT_PROFILE_UPDATE: {
    maxRequests: 5,
    windowMs: 60000,
    keyPrefix: "profile_update",
  }, // 5 per minute
  STUDENT_IMAGE_UPLOAD: {
    maxRequests: 5,
    windowMs: 60000,
    keyPrefix: "image_upload",
  }, // 5 per minute
  STUDENT_ADVISER_REQUEST: {
    maxRequests: 3,
    windowMs: 300000,
    keyPrefix: "adviser_request",
  }, // 3 per 5 minutes

  // Adviser operations (moderate)
  ADVISER_NOTE_CREATE: {
    maxRequests: 15,
    windowMs: 60000,
    keyPrefix: "note_create",
  }, // 15 per minute
  ADVISER_NOTE_UPDATE: {
    maxRequests: 20,
    windowMs: 60000,
    keyPrefix: "note_update",
  }, // 20 per minute
  ADVISER_DOCUMENT_STATUS: {
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: "doc_status",
  }, // 10 per minute
  ADVISER_GROUP_ACTION: {
    maxRequests: 5,
    windowMs: 60000,
    keyPrefix: "group_action",
  }, // 5 per minute

  // Password and profile operations (security-focused)
  PASSWORD_VERIFY: {
    maxRequests: 5,
    windowMs: 300000,
    keyPrefix: "password_verify",
  }, // 5 attempts per 5 minutes
  PASSWORD_CHANGE: {
    maxRequests: 3,
    windowMs: 600000,
    keyPrefix: "password_change",
  }, // 3 changes per 10 minutes
  PROFILE_PICTURE_UPDATE: {
    maxRequests: 5,
    windowMs: 300000,
    keyPrefix: "profile_picture",
  }, // 5 updates per 5 minutes
  STUDENT_SECONDARY_PROFILE_UPDATE: {
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: "student_secondary_profile",
  }, // 10 updates per minute

  // General operations
  GENERAL_API: { maxRequests: 100, windowMs: 60000, keyPrefix: "general" }, // 100 per minute
} as const;

export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimit(req: NextRequest, userId: string) {
    const key = `${config.keyPrefix}:${userId}`;
    const now = Date.now();

    // Clean up expired entries
    if (rateLimitStore.has(key)) {
      const entry = rateLimitStore.get(key)!;
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry) {
      entry = { count: 0, resetTime: now + config.windowMs };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        success: false,
        message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    // Increment counter
    entry.count++;

    return { success: true };
  };
}

// Helper function to get rate limit config based on user role and operation
export function getRateLimitConfig(userRole: number, operation: string) {
  if (userRole === 0) {
    // Student
    switch (operation) {
      case "document_update":
        return RATE_LIMITS.STUDENT_DOCUMENT_UPDATE;
      case "task_update":
        return RATE_LIMITS.STUDENT_TASK_UPDATE;
      case "profile_update":
        return RATE_LIMITS.STUDENT_PROFILE_UPDATE;
      case "image_upload":
        return RATE_LIMITS.STUDENT_IMAGE_UPLOAD;
      case "adviser_request":
        return RATE_LIMITS.STUDENT_ADVISER_REQUEST;
      default:
        return RATE_LIMITS.GENERAL_API;
    }
  } else if (userRole === 1) {
    // Adviser
    switch (operation) {
      case "note_create":
        return RATE_LIMITS.ADVISER_NOTE_CREATE;
      case "note_update":
        return RATE_LIMITS.ADVISER_NOTE_UPDATE;
      case "document_status":
        return RATE_LIMITS.ADVISER_DOCUMENT_STATUS;
      case "group_action":
        return RATE_LIMITS.ADVISER_GROUP_ACTION;
      default:
        return RATE_LIMITS.GENERAL_API;
    }
  }

  return RATE_LIMITS.GENERAL_API;
}

// Middleware wrapper for rate limiting
export function withRateLimit(operation: string) {
  return function (
    handler: (
      req: NextRequest,
      userId: string,
      userRole: number,
    ) => Promise<NextResponse>,
  ) {
    return async function (req: NextRequest, userId: string, userRole: number) {
      const config = getRateLimitConfig(userRole, operation);
      const rateLimiter = createRateLimiter(config);
      const result = rateLimiter(req, userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          {
            status: 429,
            headers: {
              "Retry-After": (result.retryAfter || 60).toString(),
              "X-RateLimit-Limit": config.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": (Date.now() + config.windowMs).toString(),
            },
          },
        );
      }

      return handler(req, userId, userRole);
    };
  };
}
