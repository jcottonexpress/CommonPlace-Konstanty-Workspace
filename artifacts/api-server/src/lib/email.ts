import nodemailer from "nodemailer";

async function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: port ?? 587,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return transport;
}

export async function sendVerificationEmail(
  to: string,
  verificationUrl: string,
): Promise<void> {
  const transport = await createTransport();

  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM ?? '"CommonPlace" <no-reply@commonplace.app>',
    to,
    subject: "Verify your CommonPlace account",
    text: `Click the link below to verify your email address and activate your account:\n\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <p>Click the button below to verify your email address and activate your CommonPlace account.</p>
      <p><a href="${verificationUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Verify Email</a></p>
      <p>Or copy this link: <a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });

  if (!process.env.SMTP_HOST) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.warn(`[DEV] Verification email preview (Ethereal): ${previewUrl}`);
    }
  }
}
