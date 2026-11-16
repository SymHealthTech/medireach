"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { clientIpFrom, hitRateLimit } from "@/lib/api/rate-limit";
import { hitLoginLinkLimit, normalizeEmail, sendLoginLink } from "@/lib/auth/login-link";

export interface LoginLinkState {
  sent?: string; // the address the link was (maybe) sent to
  error?: string;
  values?: { email: string };
}

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address."),
});

/**
 * Request a login link. Every valid request gets the same answer whether or
 * not the email belongs to a doctor (no account enumeration); the email is
 * sent after the response, so timing doesn't tell either. Limits: 3 links per
 * email per 15 minutes, 10 requests per IP per 15 minutes.
 */
export async function requestLoginLinkAction(_prev: LoginLinkState, formData: FormData): Promise<LoginLinkState> {
  const raw = String(formData.get("email") ?? "").slice(0, 300);
  const parsed = schema.safeParse({ email: raw });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address.", values: { email: raw } };
  const email = normalizeEmail(parsed.data.email);

  const ip = clientIpFrom(await headers());
  const [byEmail, byIp] = await Promise.all([hitLoginLinkLimit(email), hitRateLimit(`login-link:ip:${ip}`, 10, 15 * 60_000)]);
  if (!byEmail.allowed || !byIp.allowed) {
    const minutes = Math.max(1, Math.ceil(Math.max(byEmail.allowed ? 0 : byEmail.retryAfterSeconds, byIp.allowed ? 0 : byIp.retryAfterSeconds) / 60));
    return { error: `Too many login links requested. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`, values: { email } };
  }

  after(async () => {
    try {
      await sendLoginLink(email);
    } catch (err) {
      console.error("[login] sending link failed", err);
    }
  });
  return { sent: email };
}
