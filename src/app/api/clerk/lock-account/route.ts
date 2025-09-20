import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Session } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getErrorMessage, ErrorContexts } from "@/lib/error-messages";

interface ClerkError {
  errors?: Array<{
    message?: string;
  }>;
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  let action: string = "";
  try {
    const {
      userId,
      action: requestAction,
      instructorId,
    } = await request.json();
    action = requestAction;

    if (!userId || !action || !instructorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (action !== "lock" && action !== "unlock") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'lock' or 'unlock'" },
        { status: 400 },
      );
    }

    // Verify instructor permissions
    const instructor = await convex.query(api.fetch.getUserById, {
      id: instructorId as Id<"users">,
    });

    if (!instructor) {
      return NextResponse.json(
        { error: "Instructor not found" },
        { status: 404 },
      );
    }

    if (instructor.role !== 2) {
      return NextResponse.json(
        { error: "Unauthorized - Only instructors can lock/unlock accounts" },
        { status: 401 },
      );
    }

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "lock") {
      if (clerkUser.locked) {
        return NextResponse.json(
          { error: "This account is already locked in the system" },
          { status: 400 },
        );
      }
      // First revoke all sessions
      const { data: sessions } = await clerk.sessions.getSessionList({
        userId,
      });
      await Promise.all(
        sessions.map((session: Session) =>
          clerk.sessions.revokeSession(session.id),
        ),
      );
      // Then lock the account
      await clerk.users.lockUser(userId);
    } else {
      if (!clerkUser.locked) {
        return NextResponse.json(
          { error: "This account is not currently locked in the system" },
          { status: 400 },
        );
      }
      await clerk.users.unlockUser(userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const clerkError = error as ClerkError;
    return NextResponse.json(
      {
        error: getErrorMessage(
          clerkError.errors?.[0]?.message || error,
          ErrorContexts.lockAccount(action as "lock" | "unlock"),
        ),
      },
      { status: 500 },
    );
  }
}
