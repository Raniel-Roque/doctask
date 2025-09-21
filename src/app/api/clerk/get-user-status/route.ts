import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get Clerk secret key from environment
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return NextResponse.json(
        { error: "Clerk secret key not configured" },
        { status: 500 }
      );
    }

    // Fetch user status from Clerk API
    const response = await fetch(
      `https://api.clerk.com/v1/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Clerk API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Failed to fetch user status from Clerk" },
        { status: response.status }
      );
    }

    const clerkUser = await response.json();
    
    return NextResponse.json({
      locked: clerkUser.locked || false,
      email: clerkUser.email_addresses?.[0]?.email_address,
      firstName: clerkUser.first_name,
      lastName: clerkUser.last_name,
    });

  } catch (error) {
    console.error("Error fetching user status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
