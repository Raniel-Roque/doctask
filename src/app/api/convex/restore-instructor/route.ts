import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Id } from "../../../../../convex/_generated/dataModel";
import { generatePassword } from "@/utils/passwordGeneration";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface BackupUser {
  _id: string;
  clerk_id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: number;
  subrole?: number;
  isDeleted?: boolean;
  terms_agreed?: boolean;
  privacy_agreed?: boolean;
  terms_agreed_at?: number;
  privacy_agreed_at?: number;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { instructorId, backupData, idMappings } = await request.json();
    if (!instructorId) {
      return NextResponse.json(
        { error: "Missing instructorId" },
        { status: 400 },
      );
    }

    // Initialize Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Get the instructor's current data
    const instructorConvexUser = await convex.query(api.fetch.getUserById, {
      id: instructorId as Id<"users">,
    });
    if (!instructorConvexUser) {
      return NextResponse.json(
        { error: "Instructor not found" },
        { status: 404 },
      );
    }

    // Initialize Clerk client
    const clerk = await clerkClient();

    // Generate a new password for the instructor
    const password = generatePassword(
      instructorConvexUser.first_name,
      instructorConvexUser.last_name,
      Date.now(),
    );

    // 1. Delete the Clerk account
    await clerk.users.deleteUser(userId);

    // 2. Recreate the Clerk account with password
    const newClerkUser = await clerk.users.createUser({
      emailAddress: [instructorConvexUser.email],
      password,
    });

    // Set email as verified
    const emailAddress = newClerkUser.emailAddresses[0];
    await clerk.emailAddresses.updateEmailAddress(emailAddress.id, {
      primary: true,
      verified: true,
    });

    // Send welcome email with new credentials
    await resend.emails.send({
      from: "DocTask <onboarding@resend.dev>",
      to: instructorConvexUser.email,
      subject: "Your DocTask Account Has Been Restored",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your DocTask Account Has Been Restored!</h2>
          
          <p>Dear ${instructorConvexUser.first_name} ${instructorConvexUser.last_name},</p>
          
          <p>Your DocTask account has been successfully restored from backup. Here are your new login credentials:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${instructorConvexUser.email}</p>
            <p style="margin: 10px 0 0 0;"><strong>Password:</strong> ${password}</p>
          </div>
          
          <p><strong>Important Next Steps:</strong></p>
          <ol>
            <li>Log in to your account using the credentials above</li>
            <li>Change your password immediately for security purposes</li>
            <li>Verify that all your data has been restored correctly</li>
          </ol>
          
          <p style="margin-top: 30px; color: #666;">
            Best regards,<br>
            The DocTask Team
          </p>
          <p style="margin-top: 10px; color: #999; font-size: 12px;">
            Please do not reply to this email.
          </p>
        </div>
      `,
    });

    // 3. Delete the Convex instructor
    await convex.mutation(api.restore.deleteInstructor, {
      instructorId: instructorConvexUser._id,
    });

    // 4. Re-create the Convex instructor with new Clerk ID
    // Find the instructor's backup data
    const backupInstructor = backupData?.tables?.users?.find(
      (u: BackupUser) => u.role === 2 && u.email === instructorConvexUser.email,
    );
    const newInstructorResult = await convex.mutation(api.restore.restoreUser, {
      clerk_id: newClerkUser.id, // Use new Clerk ID
      first_name: instructorConvexUser.first_name,
      last_name: instructorConvexUser.last_name,
      email: instructorConvexUser.email,
      role: instructorConvexUser.role,
      middle_name: instructorConvexUser.middle_name,
      subrole: instructorConvexUser.subrole,
      isDeleted: false, // Always ensure instructor is not deleted
      email_verified: true,
      terms_agreed: backupInstructor?.terms_agreed ?? false,
      privacy_agreed: backupInstructor?.privacy_agreed ?? false,
      terms_agreed_at: backupInstructor?.terms_agreed_at ?? null,
      privacy_agreed_at: backupInstructor?.privacy_agreed_at ?? null,
    });

    // 5. Restore logs after instructor recreation (if backup data and mappings are provided)
    if (backupData?.tables?.logs && idMappings) {
      const { oldUserIdToNewUserId, oldGroupIdToNewGroupId } = idMappings;

      // Add the new instructor ID to the mapping
      const instructorUser = backupData.tables.users.find(
        (u: BackupUser) => u.role === 2,
      );
      if (instructorUser) {
        oldUserIdToNewUserId[instructorUser._id] = newInstructorResult.userId;
      }

      for (const log of backupData.tables.logs) {
        // Map user_id and affected_entity_id
        const newUserId = log.user_id
          ? oldUserIdToNewUserId[log.user_id]
          : null;
        let newAffectedEntityId: Id<"users"> | Id<"groupsTable"> | null = null;
        if (log.affected_entity_type === "user") {
          newAffectedEntityId = log.affected_entity_id
            ? (oldUserIdToNewUserId[log.affected_entity_id] ?? null)
            : null;
        } else if (log.affected_entity_type === "group") {
          newAffectedEntityId = log.affected_entity_id
            ? (oldGroupIdToNewGroupId[log.affected_entity_id] ?? null)
            : null;
        } else if (log.affected_entity_type === "database") {
          newAffectedEntityId = newInstructorResult.userId;
        }
        if (!newUserId || !newAffectedEntityId) continue;
        await convex.mutation(api.restore.restoreLog, {
          user_id: newUserId,
          user_role: log.user_role,
          affected_entity_type: log.affected_entity_type,
          affected_entity_id: newAffectedEntityId,
          action: log.action,
          details: log.details,
        });
      }

      // Log the restore action
      await convex.mutation(api.restore.restoreLog, {
        user_id: newInstructorResult.userId,
        user_role: 0,
        affected_entity_type: "database",
        affected_entity_id: newInstructorResult.userId,
        action: "Restore",
        details: "Restored database",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to restore instructor",
      { status: 500 },
    );
  }
}
