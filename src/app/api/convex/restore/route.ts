import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { clerkClient, auth } from '@clerk/nextjs/server';
import { generatePassword } from '@/utils/passwordGeneration';
import { Resend } from 'resend';

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
        { error: 'Invalid backup format' },
        { status: 400 }
      );
    }

    // Step 1: Delete all data except instructor
    console.log('Step 1: Deleting existing data...');
    
    // Delete from Convex first
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    // Delete students
    await convex.mutation(api.restore.deleteAllStudents);

    // Delete advisers
    await convex.mutation(api.restore.deleteAllAdvisers);

    // Delete groups
    await convex.mutation(api.restore.deleteAllGroups);
    
    // Delete users (except instructor)
    await convex.mutation(api.restore.deleteAllUsers, { instructorId });

    // Step 2: Delete existing Clerk accounts (except instructor)
    console.log('Step 2: Deleting existing Clerk accounts...');
    
    // Get all users from Clerk
    const { data: existingClerkUsers } = await clerk.users.getUserList();
    
    // Delete all users except the instructor
    for (const clerkUser of existingClerkUsers) {
      if (clerkUser.id !== userId) { // Don't delete the instructor
        try {
          // Delete from Clerk
          await clerk.users.deleteUser(clerkUser.id);
          console.log(`Deleted Clerk user: ${clerkUser.emailAddresses[0]?.emailAddress}`);

          // Delete from Convex if exists
          const convexUser = await convex.query(api.fetch.getUserByClerkId, { clerkId: clerkUser.id });
          if (convexUser) {
            await convex.mutation(api.mutations.deleteUser, {
              userId: convexUser._id,
              instructorId,
              clerkId: clerkUser.id,
              clerkApiKey: process.env.CLERK_API_KEY!
            });
          }
        } catch (error) {
          console.error(`Failed to delete user ${clerkUser.emailAddresses[0]?.emailAddress}:`, error);
          // Continue with other deletions even if one fails
        }
      }
    }

    // Step 3: Create Clerk accounts
    console.log('Step 3: Creating Clerk accounts...');
    const usersToCreate = backup.tables.users.filter((user: BackupUser) => user.role !== 2);
    const clerkResults = [];

    for (const user of usersToCreate) {
      try {
        const password = generatePassword(user.first_name, user.last_name, Date.now());
        
        // Create user in Clerk with just email and password
        const newUser = await clerk.users.createUser({
          emailAddress: [user.email],
          password,
        });

        // Set email as unverified
        const emailAddress = newUser.emailAddresses[0];
        await clerk.emailAddresses.updateEmailAddress(emailAddress.id, {
          primary: true,
          verified: false
        });

        // Send welcome email
        try {
          await resend.emails.send({
            from: 'DocTask <onboarding@resend.dev>',
            to: user.email,
            subject: 'Welcome to DocTask',
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
              </div>
            `,
          });
        } catch (emailError) {
          console.error(`Failed to send welcome email to ${user.email}:`, emailError);
          // Continue even if email fails
        }

        clerkResults.push({
          oldId: user.clerk_id,
          newId: newUser.id,
          email: user.email,
          password,
        });
      } catch (error) {
        console.error(`Failed to create Clerk user ${user.email}:`, error);
        // Continue with other users even if one fails
      }
    }

    // Step 4: Create Convex users with new Clerk IDs
    console.log('Step 4: Creating Convex users...');
    const idMap = new Map(clerkResults.map(r => [r.oldId, r.newId]));
    const oldUserIdToNewUserId = new Map();
    for (const user of backup.tables.users) {
      if (user.role === 2) continue; // Skip instructor
      const newClerkId = idMap.get(user.clerk_id);
      if (!newClerkId) {
        console.error(`No new Clerk ID found for user ${user.email}`);
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

    // Step 5: Restore groups and relationships
    console.log('Step 5: Restoring groups and relationships...');
    // First restore all groups
    const oldGroupIdToNewGroupId = new Map();
    for (const group of backup.tables.groups) {
      const newProjectManagerId = oldUserIdToNewUserId.get(group.project_manager_id);
      const newMemberIds = group.member_ids.map((id: string) => oldUserIdToNewUserId.get(id)).filter(Boolean);
      const newAdviserId = group.adviser_id ? oldUserIdToNewUserId.get(group.adviser_id) : undefined;
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
      const newGroupId = student.group_id ? oldGroupIdToNewGroupId.get(student.group_id) : null;
      await convex.mutation(api.restore.restoreStudentEntry, {
        user_id: newUserId,
        group_id: newGroupId ?? null,
      });
    }

    // Finally restore adviser codes
    for (const adviser of backup.tables.advisers) {
      const newAdviserId = oldUserIdToNewUserId.get(adviser.adviser_id);
      const newGroupIds = adviser.group_ids.map((gid: string) => oldGroupIdToNewGroupId.get(gid)).filter(Boolean);
      await convex.mutation(api.restore.restoreAdviserCode, {
        adviser_id: newAdviserId,
        code: adviser.code,
        group_ids: newGroupIds,
      });
    }

    return NextResponse.json({
      message: 'Backup restored successfully',
      users: clerkResults,
    });
  } catch (error) {
    console.error("Restore error:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to restore database",
      { status: 500 }
    );
  }
} 