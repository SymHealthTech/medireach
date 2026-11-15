import "server-only";
import { Resend } from "resend";
import { optionalEnv } from "@/lib/env";

/**
 * Transactional email via Resend (lead notifications, doctor login links). No
 * SMS anywhere in this project. If RESEND_API_KEY is unset, it logs to the
 * server console in development so flows stay testable without a live
 * provider. Never throws in a way that breaks the calling flow.
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
