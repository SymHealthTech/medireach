import "server-only";
import { Resend } from "resend";
import { optionalEnv } from "@/lib/env";

/**
 * Transactional email (Change 3 — email is the single OTP/recovery channel; no
 * SMS or WhatsApp). Uses Resend. If RESEND_API_KEY is unset, it logs to the
 * server console in development so OTP flows stay testable end-to-end without a
 * live provider. Never throws in a way that breaks the calling flow.
 */
let client: Resend | null = null;
function getClient(): Resend | null {
  const apiKey = optionalEnv("RESEND_API_KEY");
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

function fromAddress(): string {
  return optionalEnv("RESEND_FROM", "MediReach <onboarding@resend.dev>");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean }> {
  const resend = getClient();

  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] → ${opts.to}: ${opts.subject}\n${opts.text ?? opts.html}`);
      return { ok: true };
    }
    console.error("[email] RESEND_API_KEY not configured; cannot send email.");
    return { ok: false };
  }

  try {
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
    });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send error:", err);
    return { ok: false };
  }
}

/** Deliver a 6-digit OTP to an email address (signup verify, new device, reset). */
export async function sendOtpEmail(to: string, code: string): Promise<{ ok: boolean }> {
  return sendEmail({
    to,
    subject: `Your MediReach code: ${code}`,
    text: `Your MediReach verification code is ${code}. It expires in 5 minutes. If you didn't request this, you can ignore this email.`,
    html:
      `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto">` +
      `<h2 style="color:#0E7C7B">MediReach</h2>` +
      `<p>Your verification code is:</p>` +
      `<p style="font-size:30px;font-weight:700;letter-spacing:4px">${code}</p>` +
      `<p style="color:#5A6670">It expires in 5 minutes. If you didn't request this, ignore this email.</p>` +
      `</div>`,
  });
}
