import { Resend } from "resend";
import { env } from "../config/env.js";

export type SendEmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

const emailConfigured =
  env.EMAIL_NOTIFICATIONS_ENABLED &&
  Boolean(env.RESEND_API_KEY) &&
  Boolean(env.EMAIL_FROM);

const resendClient = emailConfigured && env.RESEND_API_KEY
  ? new Resend(env.RESEND_API_KEY)
  : null;

export async function sendEmail(payload: SendEmailPayload) {
  if (!emailConfigured || !resendClient || !env.EMAIL_FROM) {
    if (env.EMAIL_NOTIFICATIONS_ENABLED && process.env.NODE_ENV !== "test") {
      console.warn(
        "Email notifications are enabled but the provider is not fully configured; skipping send.",
      );
    }
    return;
  }

  try {
    await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? payload.text.replace(/\n/g, "<br />"),
    });
  } catch (error) {
    console.error("Failed to send outbound email notification", error);
  }
}
