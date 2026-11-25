import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { sendEmail } from "@/lib/integrations/email";
import { absUrl } from "@/lib/site";
import { loginEmail } from "@/lib/auth/login-email";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * Magic-link login for doctors and clinic/hospital owners (email only; no SMS
 * anywhere). An email may log in if it is a doctor's `ownerEmail` or the
 * `ownerEmail` of one or more clinic/hospital sites. NextAuth's Email
 * provider verifies links and issues the session (see doctor-auth.ts); this
 * module issues the links so /login and the dashboard's "Send login email"
 * share one path with our own rate limits and branded email.
 *
 * Tokens are stored exactly as NextAuth expects: sha256(token + secret) in
 * `verification_tokens`, so the raw token only ever exists in the email.
 *
 * The emailed link opens /login/verify, which shows a "Log in" button rather
 * than logging in on GET: mail scanners that pre-open links would otherwise
 * use up the one-time token before the doctor taps it.
 */

export const LOGIN_LINK_TTL_SECONDS = 24 * 60 * 60;
export const LOGIN_LINK_LIMIT = { max: 3, windowMs: 15 * 60_000 } as const;
export const VERIFICATION_COLLECTION = "verification_tokens";

export function authSecret(): string {
  return process.env.NEXTAUTH_SECRET || env.sessionSecret();
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Same hash NextAuth's Email provider uses (next-auth/core/lib/utils hashToken). */
export function hashLoginToken(token: string): string {
  return createHash("sha256").update(`${token}${authSecret()}`).digest("hex");
}

/** The page the email links to (never logs in on GET). */
export function verifyPageUrl(token: string, email: string): string {
  return `${absUrl("/login/verify")}?${new URLSearchParams({ token, email })}`;
}

/** NextAuth's callback that consumes the token and starts the session. */
export function callbackUrlFor(token: string, email: string): string {
  return `${absUrl("/api/auth/callback/email")}?${new URLSearchParams({ callbackUrl: absUrl("/account"), token, email })}`;
}

let ttlIndexReady = false;
async function tokens() {
  const m = await connectToDatabase();
  const col = m.connection.collection(VERIFICATION_COLLECTION);
  if (!ttlIndexReady) {
    // Expired tokens are removed by MongoDB; NextAuth also rejects them.
    await col.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
    await col.createIndex({ identifier: 1, token: 1 }, { unique: true }).catch(() => undefined);
    ttlIndexReady = true;
  }
  return col;
}

/** The doctor who may log in with this email, or null. */
export async function loginDoctorFor(email: string) {
  await connectToDatabase();
  return DoctorProfile.findOne({ ownerEmail: normalizeEmail(email) })
    .select({ title: 1, firstName: 1, lastName: 1, displayName: 1, ownerEmail: 1, status: 1 })
    .lean();
}

/**
 * Who may log in with this email: a doctor, the owner of one or more
 * clinic/hospital sites, or both. Null = not registered.
 */
export async function loginOwnerFor(email: string): Promise<{ name: string; doctorId?: string; siteIds: string[] } | null> {
  const e = normalizeEmail(email);
  const [doctor, sites] = await Promise.all([
    loginDoctorFor(e),
    Establishment.find({ ownerEmail: e }).select({ name: 1 }).sort({ name: 1 }).lean(),
  ]);
  if (!doctor && sites.length === 0) return null;
  return {
    name: doctor ? doctorGreetingName(doctor) : sites[0]!.name,
    ...(doctor ? { doctorId: String(doctor._id) } : {}),
    siteIds: sites.map((s) => String(s._id)),
  };
}

export function doctorGreetingName(d: { title?: string; firstName: string; lastName: string; displayName?: string }): string {
  return d.displayName || `${d.title || "Dr."} ${d.firstName} ${d.lastName}`.trim();
}

/** Count one login-link request for this email (any email, registered or not). */
export function hitLoginLinkLimit(email: string) {
  return hitRateLimit(`login-link:${normalizeEmail(email)}`, LOGIN_LINK_LIMIT.max, LOGIN_LINK_LIMIT.windowMs);
}

/** Store a token for an email and return the raw token. */
export async function createLoginToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const col = await tokens();
  await col.insertOne({
    identifier: normalizeEmail(email),
    token: hashLoginToken(token),
    expires: new Date(Date.now() + LOGIN_LINK_TTL_SECONDS * 1000),
  });
  return token;
}

/** Is there an unexpired, unused token for this pair? (For the verify page; doesn't consume.) */
export async function loginTokenValid(token: string, email: string): Promise<boolean> {
  const col = await tokens();
  const found = await col.findOne({ identifier: normalizeEmail(email), token: hashLoginToken(token), expires: { $gt: new Date() } });
  return Boolean(found);
}

/**
 * Send a login link to a registered doctor or site owner. Unknown emails are a
 * silent no-op (callers always show the same neutral message). Returns the
 * link that was emailed, or null when nothing was sent.
 */
export async function sendLoginLink(email: string, opts: { welcome?: boolean; uid?: string } = {}): Promise<{ url: string } | null> {
  const owner = await loginOwnerFor(email);
  if (!owner) return null;
  const to = normalizeEmail(email);
  const token = await createLoginToken(to);
  const url = verifyPageUrl(token, to);
  const msg = loginEmail({ name: owner.name, url, welcome: opts.welcome, ...(opts.uid ? { uid: opts.uid } : {}) });
  const sent = await sendEmail({ to, ...msg });
  return sent.ok ? { url } : null;
}
