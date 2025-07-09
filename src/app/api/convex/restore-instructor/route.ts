import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Id } from "../../../../../convex/_generated/dataModel";
import { generatePassword } from "@/utils/passwordGeneration";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { instructorId } = await request.json();
    if (!instructorId) {
      return new NextResponse("Missing instructorId", { status: 400 });
    }

    // Initialize Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Get the instructor's current data
    const instructorConvexUser = await convex.query(api.fetch.getUserById, {
      id: instructorId as Id<"users">,
    });
    if (!instructorConvexUser) {
      return new NextResponse("Instructor not found", { status: 404 });
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
    await convex.mutation(api.restore.restoreUser, {
      clerk_id: newClerkUser.id, // Use new Clerk ID
      first_name: instructorConvexUser.first_name,
      last_name: instructorConvexUser.last_name,
      email: instructorConvexUser.email,
      role: instructorConvexUser.role,
      middle_name: instructorConvexUser.middle_name,
      subrole: instructorConvexUser.subrole,
      isDeleted: false, // Always ensure instructor is not deleted
      email_verified: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to restore instructor",
      { status: 500 },
    );
  }
}
