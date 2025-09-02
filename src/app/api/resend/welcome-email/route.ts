import { NextResponse } from "next/server";
import { getResendInstance, resendConfig, getEmailAssetUrl } from "@/lib/resend-config";

const resend = getResendInstance();

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
        { error: "Required fields are missing" },
        { status: 400 },
      );
    }

    await resend.emails.send({
      from: resendConfig.templates.welcome.from,
      to: email,
      subject: resendConfig.templates.welcome.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align:center; margin-bottom:16px;">
            <img src="${getEmailAssetUrl("/doctask.webp")}" alt="DocTask" width="96" height="96" style="border-radius:50%; border:3px solid #000;" />
          </div>
          <h2 style="color: #333;">Welcome to DocTask!</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>Your account has been created. Here are your login credentials:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send welcome email",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
