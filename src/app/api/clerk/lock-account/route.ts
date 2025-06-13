import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Session } from "@clerk/nextjs/server";

interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action !== 'lock' && action !== 'unlock') {
      return NextResponse.json(
        { error: "Invalid action. Must be 'lock' or 'unlock'" },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (action === 'lock') {
      if (clerkUser.locked) {
        return NextResponse.json(
          { error: "This account is already locked in the system" },
          { status: 400 }
        );
      }
      // First revoke all sessions
      const { data: sessions } = await clerk.sessions.getSessionList({ userId });
      await Promise.all(sessions.map((session: Session) => 
        clerk.sessions.revokeSession(session.id)
      ));
      // Then lock the account
      await clerk.users.lockUser(userId);
    } else {
      if (!clerkUser.locked) {
        return NextResponse.json(
          { error: "This account is not currently locked in the system" },
          { status: 400 }
        );
      }
      await clerk.users.unlockUser(userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const clerkError = error as ClerkError;
    return NextResponse.json(
      { error: clerkError.errors?.[0]?.message || "Failed to process request" },
      { status: 500 }
    );
  }
} 