import { resendClient } from "../config/resend.config";
import { Env } from "../config/env.config";
import { logger } from "../utils/logger";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const sendEmail = async (input: SendEmailInput): Promise<void> => {
  if (!resendClient) {
    logger.info("Dev email dispatch (Resend not configured)", {
      to: input.to,
      subject: input.subject,
    });
    return;
  }

  const { error } = await resendClient.emails.send({
    from: Env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    logger.error("Failed to send email via Resend", {
      to: input.to,
      subject: input.subject,
      error: error.message,
    });
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

export const emailService = {
  async sendAccountProvisionedEmail(params: {
    to: string;
    name: string;
    username: string;
    role: string;
    temporaryPassword?: string;
    loginUrl?: string;
  }): Promise<void> {
    const loginUrl = params.loginUrl || `${Env.APP_FRONTEND_URL}/signin`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2>Welcome to Examinify</h2>
        <p>Hello ${params.name},</p>
        <p>An administrator has provisioned your <strong>${params.role.replace("_", " ")}</strong> account on Examinify.</p>
        <p><strong>Username:</strong> <code>${params.username}</code></p>
        ${
          params.temporaryPassword
            ? `<p><strong>Temporary Password:</strong> <code>${params.temporaryPassword}</code><br/>You will be prompted to change this password on first sign-in.</p>`
            : ""
        }
        <p><a href="${loginUrl}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Sign in to Examinify</a></p>
      </div>
    `;
    await sendEmail({
      to: params.to,
      subject: "Your Examinify Account Has Been Created",
      html,
      text: `Welcome to Examinify. Username: ${params.username}. Sign in at ${loginUrl}`,
    });
  },

  async sendPasswordResetEmail(params: {
    to: string;
    name: string;
    resetUrl: string;
  }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2>Reset Your Examinify Password</h2>
        <p>Hello ${params.name},</p>
        <p>Click the link below to set a new password. This link expires shortly.</p>
        <p><a href="${params.resetUrl}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
        <p>If you did not request a password reset, you can safely ignore this message.</p>
      </div>
    `;
    await sendEmail({
      to: params.to,
      subject: "Examinify Password Reset Request",
      html,
      text: `Reset your Examinify password using this link: ${params.resetUrl}`,
    });
  },

  async sendExamPublishedNotification(params: {
    to: string;
    studentName: string;
    examTitle: string;
    scheduledAt?: string;
  }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2>New CBT Exam Scheduled</h2>
        <p>Hello ${params.studentName},</p>
        <p><strong>${params.examTitle}</strong> has been published to your class.${
          params.scheduledAt ? ` Scheduled for: <strong>${params.scheduledAt}</strong>.` : ""
        }</p>
        <p>Log in to your Examinify student dashboard to view instructions.</p>
      </div>
    `;
    await sendEmail({
      to: params.to,
      subject: `Exam Scheduled: ${params.examTitle}`,
      html,
    });
  },
};
