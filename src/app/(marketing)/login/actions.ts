"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { clientIpFrom, hitRateLimit } from "@/lib/api/rate-limit";
import { checkLoginCode, hitLoginCodeIpLimit, isLoginCode, sendLoginCode, sessionUrlAfterCode } from "@/lib/auth/login-code";
import { hitLoginLinkLimit, normalizeEmail } from "@/lib/auth/login-link";

export interface LoginCodeState {
  sent?: string; // the address the code was (maybe) sent to
  error?: string;
  values?: { email: string };
}

export interface VerifyCodeState {
  error?: string;
  /** NextAuth callback URL that starts the session; the form navigates to it. */
  redirectTo?: string;
}

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address."),
});

/**
 * Email a 6-digit login code. Every valid request gets the same answer whether
 * or not the email belongs to a doctor or site owner (no account enumeration);
 * the email is sent after the response, so timing doesn't tell either.
 * Limits: 3 codes per email per 15 minutes, 10 requests per IP per 15 minutes.
 */
export async function requestLoginCodeAction(_prev: LoginCodeState, formData: FormData): Promise<LoginCodeState> {
  const raw = String(formData.get("email") ?? "").slice(0, 300);
  const parsed = schema.safeParse({ email: raw });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address.", values: { email: raw } };
  const email = normalizeEmail(parsed.data.email);

  const ip = clientIpFrom(await headers());
  const [byEmail, byIp] = await Promise.all([hitLoginLinkLimit(email), hitRateLimit(`login-link:ip:${ip}`, 10, 15 * 60_000)]);
  if (!byEmail.allowed || !byIp.allowed) {
    const minutes = Math.max(1, Math.ceil(Math.max(byEmail.allowed ? 0 : byEmail.retryAfterSeconds, byIp.allowed ? 0 : byIp.retryAfterSeconds) / 60));
    return { error: `Too many codes requested. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`, values: { email } };
  }

  after(async () => {
    try {
      await sendLoginCode(email);
    } catch (err) {
      console.error("[login] sending code failed", err);
    }
  });
  return { sent: email };
}

const WRONG = "That code is wrong or has expired. Check the latest email, or send a new code.";

/**
 * Check the code. On success, return the NextAuth callback URL that starts the
 * 30-day session and lands on /account. Wrong codes count against the code
 * (5 tries) and the IP (20 checks per 15 minutes).
 */
export async function verifyLoginCodeAction(_prev: VerifyCodeState, formData: FormData): Promise<VerifyCodeState> {
  const parsed = schema.safeParse({ email: String(formData.get("email") ?? "").slice(0, 300) });
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!parsed.success) return { error: "Something went wrong. Please send a new code." };
  if (!isLoginCode(code)) return { error: "Enter the 6-digit code from the email." };

  const ip = clientIpFrom(await headers());
  const limit = await hitLoginCodeIpLimit(ip);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return { error: `Too many tries. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.` };
  }

  const email = normalizeEmail(parsed.data.email);
  if (!(await checkLoginCode(email, code))) return { error: WRONG };
  const redirectTo = await sessionUrlAfterCode(email);
  return redirectTo ? { redirectTo } : { error: WRONG };
}
