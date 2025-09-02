import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { clerkClient } from "@clerk/nextjs/server";
import { generatePassword } from "@/utils/passwordGeneration";
import { getResendInstance, resendConfig } from "@/lib/resend-config";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Liveblocks } from "@liveblocks/node";

const resend = getResendInstance();

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

interface BackupGroup {
  _id: string;
  project_manager_id: string;
  member_ids: string[];
  adviser_id?: string;
  requested_adviser?: string;
  capstone_title?: string;
  grade?: number;
  isDeleted?: boolean;
}

interface BackupStudent {
  _id: string;
  user_id: string;
  group_id?: string;
  gender?: number;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  civilStatus?: number;
  religion?: string;
  homeAddress?: string;
  contact?: string;
  tertiaryDegree?: string;
  tertiarySchool?: string;
  secondarySchool?: string;
  secondaryAddress?: string;
  primarySchool?: string;
  primaryAddress?: string;
  isDeleted?: boolean;
}

interface BackupAdviser {
  _id: string;
  adviser_id: string;
  code: string;
  group_ids?: string[];
  requests_group_ids?: string[];
  isDeleted?: boolean;
}

interface BackupDocument {
  _id: string;
  group_id: string;
  chapter: string;
  title: string;
  content: string;
  isDeleted?: boolean;
}

interface BackupDocumentStatus {
  _id: string;
  group_id: string;
  document_part: string;
  review_status: number;
  note_ids?: string[];
  last_modified?: number;
  isDeleted?: boolean;
}

interface BackupTaskAssignment {
  _id: string;
  group_id: string;
  chapter: string;
  section: string;
  title: string;
  task_status: number;
  assigned_student_ids: string[];
  isDeleted?: boolean;
}

interface BackupImage {
  _id: string;
  file_id: string;
  filename: string;
  content_type: string;
  size: number;
  group_id: string;
  uploaded_by: string;
  alt_text?: string;
  url: string;
  isDeleted?: boolean;
}

interface BackupNote {
  _id: string;
  group_id: string;
  document_part: string;
  content: string;
  isDeleted?: boolean;
}

interface BackupLog {
  _id: string;
  user_id: string;
  user_role: number;
  affected_entity_type: string;
  affected_entity_id: string;
  action: string;
  details: string;
}

interface BackupData {
  timestamp: string;
  version: string;
  tables: {
    users: BackupUser[];
    groups: BackupGroup[];
    students: BackupStudent[];
    advisers: BackupAdviser[];
    logs: BackupLog[];
    documents: BackupDocument[];
    taskAssignments: BackupTaskAssignment[];
    documentStatus: BackupDocumentStatus[];
    notes: BackupNote[];
    images: BackupImage[];
  };
  files: Record<
    string,
    {
      content: string;
      filename: string;
      content_type: string;
    }
  >;
}

export async function POST(request: Request) {
  try {
    const { backup, instructorId } = await request.json();
    if (!backup || !instructorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Initialize Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
        { error: "Unauthorized - Only instructors can restore backups" },
        { status: 401 },
      );
    }

    // Initialize Clerk client
    const clerk = await clerkClient();

    if (!backup || !backup.tables || !backup.timestamp || !backup.version) {
      return NextResponse.json(
        { error: "Invalid backup format" },
        { status: 400 },
      );
    }

    const backupData = backup as BackupData;

    // Delete from Convex first
    // Delete students
    await convex.mutation(api.restore.deleteAllStudents);

    // Delete advisers
    await convex.mutation(api.restore.deleteAllAdvisers);

    // Delete groups
    await convex.mutation(api.restore.deleteAllGroups);

    // Delete documents
    await convex.mutation(api.restore.deleteAllDocuments);

    // Delete all Liveblocks rooms
    try {
      const liveblocks = new Liveblocks({
        secret: process.env.LIVEBLOCKS_SECRET_KEY!,
      });

      // Get all rooms and delete them
      const rooms = await liveblocks.getRooms();
      for (const room of rooms.data) {
        await liveblocks.deleteRoom(room.id);
      }
    } catch {}

    // Delete task assignments
    await convex.mutation(api.restore.deleteAllTaskAssignments);

    // Delete document status
    await convex.mutation(api.restore.deleteAllDocumentStatus);

    // Delete notes
    await convex.mutation(api.restore.deleteAllNotes);

    // Delete logs
    await convex.mutation(api.restore.deleteAllLogs);

    // Delete images (database + storage files)
    await convex.mutation(api.restore.deleteAllImages);

    // Delete users (except current user)
    await convex.mutation(api.restore.deleteAllUsers, {
      currentUserId: instructor._id,
    });

    // Get all users from Clerk
    const { data: existingClerkUsers } = await clerk.users.getUserList();

    // Delete all users except the instructor
    for (const clerkUser of existingClerkUsers) {
      if (clerkUser.id !== instructor.clerk_id) {
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
            instructorId: instructor._id,
            clerkId: clerkUser.id,
          });
        }
      }
    }

    const usersToCreate = backupData.tables.users.filter(
      (user: BackupUser) => user.role !== 2 && !user.isDeleted,
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
        from: resendConfig.from.default,
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
    for (const user of backupData.tables.users) {
      if (user.role === 2) continue; // Skip instructor

      // For deleted users, use a placeholder clerk_id since we won't create a Clerk account
      const newClerkId = user.isDeleted
        ? `deleted_${user._id}`
        : idMap.get(user.clerk_id);
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
        isDeleted: user.isDeleted ?? false,
        terms_agreed: user.terms_agreed ?? false,
        privacy_agreed: user.privacy_agreed ?? false,
        terms_agreed_at: user.terms_agreed_at ?? undefined,
        privacy_agreed_at: user.privacy_agreed_at ?? undefined,
      });
      oldUserIdToNewUserId.set(user._id, result.userId);
    }

    // First restore all groups
    const oldGroupIdToNewGroupId = new Map();
    for (const group of backupData.tables.groups) {
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
        isDeleted: group.isDeleted ?? false,
      });
      oldGroupIdToNewGroupId.set(group._id, result.groupId);
    }

    // Then restore student entries
    for (const student of backupData.tables.students) {
      const newUserId = oldUserIdToNewUserId.get(student.user_id);
      const newGroupId = student.group_id
        ? oldGroupIdToNewGroupId.get(student.group_id)
        : null;
      await convex.mutation(api.restore.restoreStudentEntry, {
        user_id: newUserId,
        group_id: newGroupId ?? null,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        placeOfBirth: student.placeOfBirth,
        nationality: student.nationality,
        civilStatus: student.civilStatus,
        religion: student.religion,
        homeAddress: student.homeAddress,
        contact: student.contact,
        tertiaryDegree: student.tertiaryDegree,
        tertiarySchool: student.tertiarySchool,
        secondarySchool: student.secondarySchool,
        secondaryAddress: student.secondaryAddress,
        primarySchool: student.primarySchool,
        primaryAddress: student.primaryAddress,
        isDeleted: student.isDeleted ?? false,
      });
    }

    // Finally restore adviser codes
    for (const adviser of backupData.tables.advisers) {
      const newAdviserId = oldUserIdToNewUserId.get(adviser.adviser_id);
      const newGroupIds = (adviser.group_ids || [])
        .map((gid: string) => oldGroupIdToNewGroupId.get(gid))
        .filter(Boolean);
      const newRequestsGroupIds = (adviser.requests_group_ids || [])
        .map((gid: string) => oldGroupIdToNewGroupId.get(gid))
        .filter(Boolean);
      await convex.mutation(api.restore.restoreAdviserCode, {
        adviser_id: newAdviserId,
        code: adviser.code,
        group_ids: newGroupIds,
        requests_group_ids: newRequestsGroupIds,
        isDeleted: adviser.isDeleted ?? false,
      });
    }

    // Restore documents
    if (
      backupData.tables.documents &&
      Array.isArray(backupData.tables.documents)
    ) {
      for (const docRaw of backupData.tables.documents) {
        const doc = docRaw as {
          group_id: string;
          chapter: string;
          title: string;
          content: string;
          isDeleted?: boolean;
        };
        const newGroupId = oldGroupIdToNewGroupId.get(doc.group_id);
        if (!newGroupId) continue;
        await convex.mutation(api.restore.restoreDocument, {
          group_id: newGroupId,
          chapter: doc.chapter,
          title: doc.title,
          content: doc.content,
          isDeleted: doc.isDeleted ?? false,
        });
      }
    }

    // Restore notes first (before document status)
    const oldNoteIdToNewNoteId = new Map();
    for (const note of backupData.tables.notes) {
      const newGroupId = oldGroupIdToNewGroupId.get(note.group_id);
      if (newGroupId) {
        const result = await convex.mutation(api.restore.restoreNote, {
          group_id: newGroupId,
          document_part: note.document_part,
          content: note.content,
          isDeleted: note.isDeleted ?? false,
        });
        oldNoteIdToNewNoteId.set(note._id, result.noteId);
      }
    }

    // Restore document status (after notes so note IDs are available)
    for (const status of backupData.tables.documentStatus) {
      const newGroupId = oldGroupIdToNewGroupId.get(status.group_id);
      const newNoteIds = status.note_ids
        ? status.note_ids
            .map((noteId: string) => oldNoteIdToNewNoteId.get(noteId))
            .filter(Boolean)
        : undefined;

      // Check if this is a pre-approved document part
      const isPreApproved = ["title_page", "appendix_a", "appendix_d"].includes(
        status.document_part,
      );

      // Use the backup review_status, but ensure pre-approved documents are approved
      const reviewStatus = isPreApproved ? 2 : status.review_status;

      await convex.mutation(api.restore.restoreDocumentStatus, {
        group_id: newGroupId,
        document_part: status.document_part,
        review_status: reviewStatus,
        note_ids: newNoteIds,
        last_modified: status.last_modified,
        isDeleted: status.isDeleted ?? false,
      });
    }

    // Restore task assignments
    for (const assignment of backupData.tables.taskAssignments) {
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
        isDeleted: assignment.isDeleted ?? false,
      });
    }

    // Restore images with file storage
    const oldFileIdToNewFileId = new Map();
    for (const image of backupData.tables.images) {
      const newGroupId = oldGroupIdToNewGroupId.get(image.group_id);
      const newUploadedById = oldUserIdToNewUserId.get(image.uploaded_by);

      if (newGroupId && newUploadedById) {
        // Check if we have the file content in the backup
        const fileData = backupData.files?.[image.file_id];
        if (fileData) {
          try {
            // Upload the file to the new storage environment
            const uploadUrl = await convex.mutation(
              api.images.generateUploadUrl,
            );

            // Convert base64 back to binary
            const fileContent = Buffer.from(fileData.content, "base64");

            // Upload the file
            const uploadResponse = await fetch(uploadUrl, {
              method: "POST",
              headers: {
                "Content-Type": fileData.content_type,
              },
              body: fileContent,
            });

            if (uploadResponse.ok) {
              const { storageId } = await uploadResponse.json();
              oldFileIdToNewFileId.set(image.file_id, storageId);

              // Restore the image with the new file ID
              await convex.mutation(api.restore.restoreImage, {
                file_id: storageId,
                filename: image.filename,
                content_type: image.content_type,
                size: image.size,
                group_id: newGroupId,
                uploaded_by: newUploadedById,
                alt_text: image.alt_text,
                url: image.url,
                isDeleted: image.isDeleted ?? false,
              });
            }
          } catch {}
        }
      }
    }

    // Note: Logs will be restored after instructor recreation in restore-instructor route
    // This ensures all ID mappings are available, including the new instructor ID

    // Note: Instructor will be handled by the frontend after showing success popup
    // This ensures the user sees the success message before being logged out

    return NextResponse.json({
      message: "Backup restored successfully",
      users: clerkResults,
      idMappings: {
        oldUserIdToNewUserId: Object.fromEntries(oldUserIdToNewUserId),
        oldGroupIdToNewGroupId: Object.fromEntries(oldGroupIdToNewGroupId),
      },
      backupData: {
        tables: {
          logs: backupData.tables.logs || [],
          users: backupData.tables.users,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to restore database",
      },
      { status: 500 },
    );
  }
}
