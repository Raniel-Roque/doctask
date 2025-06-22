import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { clerkClient, auth } from "@clerk/nextjs/server";
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
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { backup, instructorId } = await request.json();
    if (!backup || !instructorId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Initialize Clerk client
    const clerk = await clerkClient();

    if (!backup || !backup.tables || !backup.timestamp || !backup.version) {
      return NextResponse.json(
        { error: "Invalid backup format" },
        { status: 400 },
      );
    }

    // Delete from Convex first
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Delete students
    await convex.mutation(api.restore.deleteAllStudents);

    // Delete advisers
    await convex.mutation(api.restore.deleteAllAdvisers);

    // Delete groups
    await convex.mutation(api.restore.deleteAllGroups);

    // Delete documents
    await convex.mutation(api.restore.deleteAllDocuments);

    // Delete task assignments
    await convex.mutation(api.restore.deleteAllTaskAssignments);

    // Delete document status
    await convex.mutation(api.restore.deleteAllDocumentStatus);

    // Delete users (except instructor)
    await convex.mutation(api.restore.deleteAllUsers, { instructorId });

    // Get all users from Clerk
    const { data: existingClerkUsers } = await clerk.users.getUserList();

    // Delete all users except the instructor
    for (const clerkUser of existingClerkUsers) {
      if (clerkUser.id !== userId) {
        // Don't delete the instructor
        // Delete from Clerk
        await clerk.users.deleteUser(clerkUser.id);

        // Delete from Convex if exists
        const convexUser = await convex.query(api.fetch.getUserByClerkId, {
          clerkId: clerkUser.id,
        });
        if (convexUser) {
          await convex.mutation(api.mutations.deleteUser, {
            userId: convexUser._id,
            instructorId,
            clerkId: clerkUser.id,
          });
        }
      }
    }

    const usersToCreate = backup.tables.users.filter(
      (user: BackupUser) => user.role !== 2,
    );
    const clerkResults = [];

    for (const user of usersToCreate) {
      const password = generatePassword(
        user.first_name,
        user.last_name,
        Date.now(),
      );

      // Create user in Clerk with just email and password
      const newUser = await clerk.users.createUser({
        emailAddress: [user.email],
        password,
      });

      // Set email as unverified
      const emailAddress = newUser.emailAddresses[0];
      await clerk.emailAddresses.updateEmailAddress(emailAddress.id, {
        primary: true,
        verified: false,
      });

      // Send welcome email
      await resend.emails.send({
        from: "DocTask <onboarding@resend.dev>",
        to: user.email,
        subject: "Welcome to DocTask",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to DocTask!</h2>
            
            <p>Dear ${user.first_name} ${user.last_name},</p>
            
            <p>Your account has been created. Here are your login credentials:</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${user.email}</p>
              <p style="margin: 10px 0 0 0;"><strong>Password:</strong> ${password}</p>
            </div>
            
            <p><strong>Important Next Steps:</strong></p>
            <ol>
              <li>Log in to your account using the credentials above</li>
              <li>Change your password immediately for security purposes</li>
              <li>Verify your email address</li>
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

      clerkResults.push({
        oldId: user.clerk_id,
        newId: newUser.id,
        email: user.email,
        password,
      });
    }

    const idMap = new Map(clerkResults.map((r) => [r.oldId, r.newId]));
    const oldUserIdToNewUserId = new Map();
    for (const user of backup.tables.users) {
      if (user.role === 2) continue; // Skip instructor
      const newClerkId = idMap.get(user.clerk_id);
      if (!newClerkId) {
        continue;
      }
      // Insert user and keep mapping from old _id to new _id
      const result = await convex.mutation(api.restore.restoreUser, {
        clerk_id: newClerkId,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        middle_name: user.middle_name,
        subrole: user.subrole,
      });
      oldUserIdToNewUserId.set(user._id, result.userId);
    }

    // First restore all groups
    const oldGroupIdToNewGroupId = new Map();
    for (const group of backup.tables.groups) {
      const newProjectManagerId = oldUserIdToNewUserId.get(
        group.project_manager_id,
      );
      const newMemberIds = group.member_ids
        .map((id: string) => oldUserIdToNewUserId.get(id))
        .filter(Boolean);
      const newAdviserId = group.adviser_id
        ? oldUserIdToNewUserId.get(group.adviser_id)
        : undefined;
      const result = await convex.mutation(api.restore.restoreGroup, {
        project_manager_id: newProjectManagerId,
        member_ids: newMemberIds,
        adviser_id: newAdviserId,
        capstone_title: group.capstone_title,
      });
      oldGroupIdToNewGroupId.set(group._id, result.groupId);
    }

    // Then restore student entries
    for (const student of backup.tables.students) {
      const newUserId = oldUserIdToNewUserId.get(student.user_id);
      const newGroupId = student.group_id
        ? oldGroupIdToNewGroupId.get(student.group_id)
        : null;
      await convex.mutation(api.restore.restoreStudentEntry, {
        user_id: newUserId,
        group_id: newGroupId ?? null,
      });
    }

    // Finally restore adviser codes
    for (const adviser of backup.tables.advisers) {
      const newAdviserId = oldUserIdToNewUserId.get(adviser.adviser_id);
      const newGroupIds = (adviser.group_ids || [])
        .map((gid: string) => oldGroupIdToNewGroupId.get(gid))
        .filter(Boolean);
      await convex.mutation(api.restore.restoreAdviserCode, {
        adviser_id: newAdviserId,
        code: adviser.code,
        group_ids: newGroupIds,
      });
    }

    // Restore documents
    for (const doc of backup.tables.documents) {
      const newGroupId = oldGroupIdToNewGroupId.get(doc.group_id);
      await convex.mutation(api.restore.restoreDocument, {
        group_id: newGroupId,
        chapter: doc.chapter,
        room_id: doc.room_id,
        title: doc.title,
        content: doc.content,
      });
    }

    // Restore document status
    for (const status of backup.tables.documentStatus) {
      const newGroupId = oldGroupIdToNewGroupId.get(status.group_id);
      await convex.mutation(api.restore.restoreDocumentStatus, {
        group_id: newGroupId,
        document_part: status.document_part,
        review_status: status.review_status,
        review_notes: status.review_notes,
        last_modified: status.last_modified,
      });
    }

    // Restore task assignments
    for (const assignment of backup.tables.taskAssignments) {
      const newGroupId = oldGroupIdToNewGroupId.get(assignment.group_id);
      const newAssignedStudentIds = assignment.assigned_student_ids
        .map((id: string) => oldUserIdToNewUserId.get(id))
        .filter(Boolean);
      await convex.mutation(api.restore.restoreTaskAssignment, {
        group_id: newGroupId,
        chapter: assignment.chapter,
        section: assignment.section,
        title: assignment.title,
        task_status: assignment.task_status,
        assigned_student_ids: newAssignedStudentIds,
      });
    }

    return NextResponse.json({
      message: "Backup restored successfully",
      users: clerkResults,
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to restore database",
      { status: 500 },
    );
  }
}
