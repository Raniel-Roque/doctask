/**
 * API RATE LIMITING UTILITY
 *
 * Purpose: Rate limiting for Next.js API routes (frontend HTTP requests)
 * Usage: Import in /api/* route handlers to prevent spam to API endpoints
 * Scope: HTTP requests to API routes like /api/health, /api/clerk/update-user
 *
 * Example:
 * const result = await rateLimit(userId, "api:health", 10, 60000);
 * if (!result.success) return new Response("Rate limited", { status: 429 });
 */

interface RateLimitResult {
  success: boolean;
  retryAfter: number;
  remaining: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export async function rateLimit(
  clientId: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const key = `${clientId}:${endpoint}`;
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new rate limit window
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Check if rate limit exceeded
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      retryAfter,
      remaining: 0,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  return {
    success: true,
    retryAfter: 0,
    remaining: maxRequests - entry.count,
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

export function resetRateLimit(clientId: string, endpoint: string) {
  const key = `${clientId}:${endpoint}`;
  rateLimitStore.delete(key);
}
