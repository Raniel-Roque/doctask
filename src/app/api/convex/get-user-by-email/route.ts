import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { sanitizeInput } from "@/app/(pages)/components/SanitizeInput";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();
    const sanitizedEmail = sanitizeInput(lowerEmail, {
      trim: true,
      removeHtml: true,
      escapeSpecialChars: true,
    });

    const user = await convex.query(api.fetch.getUserByEmail, {
      email: sanitizedEmail,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email, checkOnly } = await request.json();
    const lowerEmail = email.toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const sanitizedEmail = sanitizeInput(lowerEmail, {
      trim: true,
      removeHtml: true,
      escapeSpecialChars: true,
    });
    const user = await convex.query(api.fetch.getUserByEmail, {
      email: sanitizedEmail,
    });

    // If checkOnly is true, return just the existence boolean (like check-email)
    if (checkOnly) {
      return NextResponse.json({ exists: !!user });
    }

    // Otherwise return the full user object
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
