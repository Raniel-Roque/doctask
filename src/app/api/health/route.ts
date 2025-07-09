import { NextResponse } from "next/server";
import { rateLimit } from "@/utils/apiRateLimit";

export async function GET(request: Request) {
  try {
    const clientId =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await rateLimit(
      clientId,
      "health",
      100,
      15 * 60 * 1000,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": rateLimitResult.retryAfter.toString() },
        },
      );
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: new Date(
          Date.now() + rateLimitResult.retryAfter * 1000,
        ).toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const clientId =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await rateLimit(
      clientId,
      "health",
      50,
      15 * 60 * 1000,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": rateLimitResult.retryAfter.toString() },
        },
      );
    }

    const contentLength = parseInt(
      request.headers.get("content-length") || "0",
    );
    if (contentLength > 1024 * 1024) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 },
      );
    }

    const body = await request.json();

    return NextResponse.json({
      status: "post_received",
      timestamp: new Date().toISOString(),
      bodySize: JSON.stringify(body).length,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: new Date(
          Date.now() + rateLimitResult.retryAfter * 1000,
        ).toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
