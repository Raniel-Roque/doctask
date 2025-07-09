import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { firstName, lastName, email, password } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        {
          error: "Required fields are missing",
          missing: {
            firstName: !firstName,
            lastName: !lastName,
            email: !email,
            password: !password,
          },
        },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const emailResult = await resend.emails.send({
      from: "DocTask <onboarding@resend.dev>",
      to: email,
      subject: "DocTask - Your Password Has Been Reset",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Notification</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>Your password has been reset by an instructor. Here are your new login credentials:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0 0 0;"><strong>New Password:</strong> ${password}</p>
          </div>
          
          <p><strong>Important Next Steps:</strong></p>
          <ol>
            <li>Log in to your account using the new password above</li>
            <li>Change your password immediately for security purposes</li>
          </ol>
          
          <p>If you did not request this password reset, please contact our support team immediately.</p>
          
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

    // Check if email was actually sent
    if (!emailResult || emailResult.error) {
      return NextResponse.json(
        {
          error: "Failed to send email",
          details: emailResult?.error || "Unknown error",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send reset password email",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
