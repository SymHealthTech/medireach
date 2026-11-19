import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { sendEmail } from "@/lib/integrations/email";
import { loginCodeEmail } from "@/lib/auth/login-email";
import { authSecret, callbackUrlFor, createLoginToken, loginOwnerFor, normalizeEmail } from "@/lib/auth/login-link";

/**
 * Email OTP login for /login: the doctor (or site owner) asks for a 6-digit
 * code, types it on the same page, and is signed in without leaving it.
 *
 * Codes are kept apart from NextAuth's verification tokens on purpose: the
 * NextAuth callback has no attempt limit, so a 6-digit value there could be
 * guessed. Here each code is
 *   - stored only as an HMAC (keyed with the auth secret, bound to the email),
 *   - valid for 10 minutes, one per email (a new code replaces the old one),
 *   - burnt after 5 wrong tries, and
 *   - exchanged, once correct, for a fresh 256-bit NextAuth token whose
 *     callback URL starts the normal 30-day session (same signIn checks and
 *     audit as the emailed link).
 * Unknown emails get the same answers as known ones (no account enumeration).
 */

export const LOGIN_CODE_TTL_SECONDS = 10 * 60;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const LOGIN_CODE_COLLECTION = "login_codes";
/** Wrong-code guesses allowed per IP across all emails. */
export const LOGIN_CODE_IP_LIMIT = { max: 20, windowMs: 15 * 60_000 } as const;

export const isLoginCode = (s: string) => /^\d{6}$/.test(s);

function hashCode(email: string, code: string): string {
  return createHmac("sha256", authSecret()).update(`${normalizeEmail(email)}:${code}`).digest("hex");
}

let indexesReady = false;
async function codes() {
  const m = await connectToDatabase();
  const col = m.connection.collection<{ email: string; codeHash: string; expires: Date; attempts: number }>(LOGIN_CODE_COLLECTION);
  if (!indexesReady) {
    await col.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
    await col.createIndex({ email: 1 }, { unique: true }).catch(() => undefined);
    indexesReady = true;
  }
  return col;
}

/** Store a new code for this email (replacing any earlier one) and return it. */
export async function createLoginCode(email: string): Promise<string> {
  const e = normalizeEmail(email);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const col = await codes();
  await col.updateOne(
    { email: e },
    { $set: { email: e, codeHash: hashCode(e, code), expires: new Date(Date.now() + LOGIN_CODE_TTL_SECONDS * 1000), attempts: 0 } },
    { upsert: true },
  );
  return code;
}

/**
 * Email a login code to a registered doctor or site owner. Unknown emails are
 * a silent no-op (callers always show the same message). True when sent.
 */
export async function sendLoginCode(email: string): Promise<boolean> {
  const owner = await loginOwnerFor(email);
  if (!owner) return false;
  const to = normalizeEmail(email);
  const code = await createLoginCode(to);
  const sent = await sendEmail({ to, ...loginCodeEmail({ name: owner.name, code }) });
  return sent.ok;
}

/**
 * Check a code: true consumes it. Every failure looks the same (wrong,
 * expired, used up, or no code for this email), so the answer never tells
 * whether an email is registered. A wrong code counts an attempt; the fifth
 * burns the code.
 */
export async function checkLoginCode(email: string, code: string): Promise<boolean> {
  if (!isLoginCode(code)) return false;
  const e = normalizeEmail(email);
  const col = await codes();
  const doc = await col.findOne({ email: e });
  if (!doc) return false;
  if (doc.expires.getTime() <= Date.now() || doc.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
    await col.deleteOne({ _id: doc._id });
    return false;
  }
  const a = Buffer.from(doc.codeHash, "hex");
  const b = Buffer.from(hashCode(e, code), "hex");
  if (a.length === b.length && timingSafeEqual(a, b)) {
    // Consume atomically, so two parallel submits can't both succeed.
    const taken = await col.deleteOne({ _id: doc._id, codeHash: doc.codeHash });
    return taken.deletedCount === 1;
  }
  const after = await col.findOneAndUpdate({ _id: doc._id }, { $inc: { attempts: 1 } }, { returnDocument: "after" });
  if (after && after.attempts >= LOGIN_CODE_MAX_ATTEMPTS) await col.deleteOne({ _id: doc._id });
  return false;
}

/** Count one code check from this IP. */
export function hitLoginCodeIpLimit(ip: string) {
  return hitRateLimit(`login-code:ip:${ip}`, LOGIN_CODE_IP_LIMIT.max, LOGIN_CODE_IP_LIMIT.windowMs);
}

/**
 * After a correct code: a one-time NextAuth token for this email and the
 * callback URL that signs in and lands on /account. Null if the email can no
 * longer log in (removed between sending and typing the code).
 */
export async function sessionUrlAfterCode(email: string): Promise<string | null> {
  const e = normalizeEmail(email);
  if (!(await loginOwnerFor(e))) return null;
  const token = await createLoginToken(e);
  return callbackUrlFor(token, e);
}
