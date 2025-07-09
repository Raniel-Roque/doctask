/**
 * MUTATION RATE LIMITING UTILITY
 *
 * Purpose: Rate limiting for Convex mutations (backend database operations)
 * Usage: Import in convex/mutations.ts to prevent spam to database operations
 * Scope: Database operations via Convex mutations like acceptGroupRequest, updateDocumentStatus
 *
 * Features:
 * - Rate limits specific actions (adviser:accept_group, student:update_task_status, etc.)
 * - Different limits for different user types and actions
 * - Server-side storage (more secure than client-side)
 *
 * Example:
 * validateRateLimit(userId, "adviser:accept_group");
 *
 * Rate Limits:
 * - Adviser actions: 10-30 requests per minute
 * - Student actions: 5-20 requests per minute
 * - Document updates: 10 requests per minute
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Rate limit store - in production, this should be replaced with a proper database table
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Rate limit configurations for different actions
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Adviser actions
  "adviser:accept_group": { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  "adviser:reject_group": { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  "adviser:update_document_status": { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  "adviser:create_note": { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
  "adviser:update_note": { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  "adviser:delete_note": { maxRequests: 15, windowMs: 60000 }, // 15 requests per minute

  // Student actions
  "student:request_adviser": { maxRequests: 5, windowMs: 300000 }, // 5 requests per 5 minutes
  "student:cancel_adviser_request": { maxRequests: 5, windowMs: 300000 }, // 5 requests per 5 minutes
  "student:update_task_status": { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
  "student:update_task_assignment": { maxRequests: 15, windowMs: 60000 }, // 15 requests per minute
  "student:update_document_content": { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  "student:update_secondary_profile": { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
};

export function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig,
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const key = `${userId}:${action}`;
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new rate limit window
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Check if rate limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Clean up old entries periodically (1% chance)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
  };
}

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Convex mutation to reset rate limits (for testing/admin purposes)
export const resetRateLimit = mutation({
  args: {
    userId: v.string(),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const key = `${args.userId}:${args.action}`;
    rateLimitStore.delete(key);
    return { success: true };
  },
});

// Helper function to get rate limit config for an action
export function getRateLimitConfig(action: string): RateLimitConfig | null {
  return RATE_LIMITS[action] || null;
}

// Helper function to validate rate limit for a user action
export function validateRateLimit(userId: string, action: string): void {
  const config = getRateLimitConfig(action);
  if (!config) {
    // No rate limit configured for this action
    return;
  }

  const result = checkRateLimit(userId, action, config);
  if (!result.allowed) {
    throw new Error(
      `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
    );
  }
}
