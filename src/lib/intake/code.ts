import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { authSecret, normalizeEmail } from "@/lib/auth/login-link";
import { connectToDatabase } from "@/lib/db";

/**
 * One-time codes for returning to a saved website form. Same rules as the
 * /login codes (lib/auth/login-code.ts): stored only as an HMAC bound to the
 * email, 10 minutes, one live code per email, burnt after 5 wrong tries.
 *
 * Kept in their own collection with their own HMAC scope on purpose: a form
 * code must never work as a login code for /account, and vice versa.
 */

export const INTAKE_CODE_TTL_SECONDS = 10 * 60;
export const INTAKE_CODE_MAX_ATTEMPTS = 5;
export const INTAKE_CODE_COLLECTION = "intake_codes";
/** Codes sent per email, and checks per IP. */
export const INTAKE_CODE_SEND_LIMIT = { max: 3, windowMs: 15 * 60_000 } as const;
export const INTAKE_CODE_IP_LIMIT = { max: 20, windowMs: 15 * 60_000 } as const;

export const isIntakeCode = (s: string) => /^\d{6}$/.test(s);

const hash = (email: string, code: string) => createHmac("sha256", authSecret()).update(`intake:${normalizeEmail(email)}:${code}`).digest("hex");

let indexesReady = false;
async function codes() {
  const m = await connectToDatabase();
  const col = m.connection.collection<{ email: string; codeHash: string; expires: Date; attempts: number }>(INTAKE_CODE_COLLECTION);
  if (!indexesReady) {
    await col.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
    await col.createIndex({ email: 1 }, { unique: true }).catch(() => undefined);
    indexesReady = true;
  }
  return col;
}

/** Store a new code for this email (replacing any earlier one) and return it. */
export async function createIntakeCode(email: string): Promise<string> {
  const e = normalizeEmail(email);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await (await codes()).updateOne(
    { email: e },
    { $set: { email: e, codeHash: hash(e, code), expires: new Date(Date.now() + INTAKE_CODE_TTL_SECONDS * 1000), attempts: 0 } },
    { upsert: true },
  );
  return code;
}

/** True consumes the code. Every failure looks the same. */
export async function checkIntakeCode(email: string, code: string): Promise<boolean> {
  if (!isIntakeCode(code)) return false;
  const e = normalizeEmail(email);
  const col = await codes();
  const doc = await col.findOne({ email: e });
  if (!doc) return false;
  if (doc.expires.getTime() <= Date.now() || doc.attempts >= INTAKE_CODE_MAX_ATTEMPTS) {
    await col.deleteOne({ _id: doc._id });
    return false;
  }
  const a = Buffer.from(doc.codeHash, "hex");
  const b = Buffer.from(hash(e, code), "hex");
  if (a.length === b.length && timingSafeEqual(a, b)) {
    const taken = await col.deleteOne({ _id: doc._id, codeHash: doc.codeHash });
    return taken.deletedCount === 1;
  }
  const after = await col.findOneAndUpdate({ _id: doc._id }, { $inc: { attempts: 1 } }, { returnDocument: "after" });
  if (after && after.attempts >= INTAKE_CODE_MAX_ATTEMPTS) await col.deleteOne({ _id: doc._id });
  return false;
}

export function hitIntakeCodeSendLimit(email: string) {
  return hitRateLimit(`intake-code:email:${normalizeEmail(email)}`, INTAKE_CODE_SEND_LIMIT.max, INTAKE_CODE_SEND_LIMIT.windowMs);
}

export function hitIntakeCodeIpLimit(ip: string) {
  return hitRateLimit(`intake-code:ip:${ip}`, INTAKE_CODE_IP_LIMIT.max, INTAKE_CODE_IP_LIMIT.windowMs);
}
