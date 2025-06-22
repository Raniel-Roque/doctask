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
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 },
      );
    }

    await resend.emails.send({
      from: "DocTask <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to DocTask - Your Account Details",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to DocTask!</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>Your account is now registered. Here are your login details:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
            ${password ? `<p style="margin: 10px 0 0 0;"><strong>Temporary Password:</strong> ${password}</p>` : ""}
          </div>
          
          <p><strong>Important Next Steps:</strong></p>
          <ol>
            <li>Log in to your account using the temporary password above</li>
            <li>Change your password immediately for security</li>
            <li>Verify your email address</li>
          </ol>
          
          <p>If you need any assistance, please contact our support team.</p>
          
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send update email",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
