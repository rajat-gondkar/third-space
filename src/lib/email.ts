import { Resend } from "resend";

const FROM = '"Third Space" <onboarding@resend.dev>';

export async function sendOtpEmail(to: string, otp: string): Promise<{ id: string; dev?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      "[resend] RESEND_API_KEY not set — OTP will only be shown in the API response (dev mode).",
    );
    return { id: "dev-mode", dev: true };
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Your Third Space verification code",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 16px;">
          <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Third Space</h1>
          <p style="color: #666; margin: 0 0 24px;">Verify your college email</p>
          <p style="font-size: 15px; margin: 0 0 8px;">Your verification code is:</p>
          <div style="
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 6px;
            text-align: center;
            padding: 16px;
            margin: 8px 0 24px;
            background: #f5f3ff;
            border-radius: 12px;
            color: #4f46e5;
          ">${otp}</div>
          <p style="font-size: 13px; color: #999; margin: 0;">
            This code expires in 10 minutes. If you didn't request this, you can safely ignore it.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[resend] Failed to send OTP email:", error);
      return { id: "send-failed", dev: true };
    }

    return { id: data!.id };
  } catch (err) {
    console.error("[resend] Exception sending OTP email:", err);
    return { id: "send-failed", dev: true };
  }
}